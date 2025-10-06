import sys
import traceback
import time

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.request import Request

from django.http import FileResponse

from rest_framework.decorators import api_view, action
from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import PermissionDenied

from .models import ErrorLevel, ShopProfile, ShopRole, UsagePeriod
from .serializers import (
    UserRequestSerializer,
    UserSerializer,
    UserRegisterationSerializer,
    ShopProfileSerializer,
    ShopUsageSerializer,
    ShopQuotaAdjustmentSerializer,
)
from .loggers import log_service_err, log_service
from .models import CustomUser
from generations.loggers import log_generation_request
from generations.models import GenerationStatus, GenerationErrorLog
from generations.services import GeminiAPIService, GeminiAPIResponseError

class GenerateRequestView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request: Request):
        serializer = UserRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        shop_id = serializer.validated_data['shop_id']
        customer_id = serializer.validated_data['customer_id']
        person_image = serializer.validated_data['person_image']
        product_image = serializer.validated_data['product_image']

        try:
            shop_profile = ShopProfile.objects.filter(
                shop_id=shop_id,
                memberships__user=request.user,
                memberships__is_active=True,
                is_active=True,
            ).select_related('owner').first()

            if not shop_profile:
                raise ShopProfile.DoesNotExist()

            log = log_generation_request(
                user=request.user,
                shop=shop_profile,
                customer_id=customer_id,
                status=GenerationStatus.PENDING,
            )

        except ShopProfile.DoesNotExist:
            return Response({
                'error': f'ShopProfile for shop [ {shop_id} ] not found. This shouldn\'t be happen, please contact support.'
            }, status=status.HTTP_404_NOT_FOUND)

        if not shop_profile.has_quota:
            log.mark_failure(error_message='Usage limit exceeded')
            return Response(
                {'error': 'Usage limit exceeded.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        shop_profile.decrement_quota(actor=request.user)
        log_service(
            shop=shop_profile,
            remaining=shop_profile.count,
            note='quota decremented after request'
        )

        try:
            log.mark_started()
            started_at = time.monotonic()
            result, tokens = GeminiAPIService.generate(
                product_image=product_image,
                person_image=person_image
            )
            latency_ms = int((time.monotonic() - started_at) * 1000)

            log.mark_success(latency_ms=latency_ms, tokens=tokens)

            result.seek(0)

            response = FileResponse(
                result,
                content_type='image/png',
                status=status.HTTP_200_OK
            )
            response['Content-Disposition'] = 'attachment; filename="generated_image.png"'
            return response

        except GeminiAPIResponseError as e:
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = traceback.extract_tb(exc_tb)[-1].name

            GenerationErrorLog.objects.create(
                err_from=f'{e.__class__.__name__}:{fname}',
                gemini_message=e.text,
                level=ErrorLevel.ERROR,
                request=log,
            )

            log.mark_failure(error_message=e.text)
            shop_profile.increment_quota(actor=request.user)

            return Response(
                {'error': 'AI generation service returned an error.'},
                status=status.HTTP_502_BAD_GATEWAY
            )

        except Exception as e:  # pylint: disable=broad-except
            exc_type, exc_obj, exc_tb = sys.exc_info()
            fname = traceback.extract_tb(exc_tb)[-1].name

            log_service_err(
                level=ErrorLevel.WARN,
                err_from=f'{e.__class__.__name__}:{fname}',
                shop=shop_profile,
                message=str(e),
            )

            log.mark_failure(error_message=str(e))
            shop_profile.increment_quota(actor=request.user)

            return Response(
                {'error': 'Image generation failed. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
class UserRegisterView(generics.CreateAPIView):
    queryset = CustomUser.objects.all()
    serializer_class = UserRegisterationSerializer
    permission_classes = [AllowAny]

class WhoAmIAPIView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request:Request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)

class ShopProfileViewSet(viewsets.ModelViewSet):
    serializer_class = ShopProfileSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'shop_id'

    def get_queryset(self):
        return self.request.user.shops.select_related('owner').filter(
            is_active=True,
            memberships__user=self.request.user,
            memberships__is_active=True,
        ).distinct()

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def _get_membership(self, shop: ShopProfile, user: CustomUser):
        return shop.memberships.filter(user=user, is_active=True).first()

    def _ensure_manage_permission(self, shop: ShopProfile, user: CustomUser):
        membership = self._get_membership(shop, user)
        if not membership or membership.role not in (ShopRole.OWNER, ShopRole.MANAGER):
            raise PermissionDenied('상점을 관리할 권한이 없습니다.')

    @action(detail=True, methods=['get'])
    def usage(self, request: Request, shop_id=None, *args, **kwargs):
        shop = self.get_object()
        if not self._get_membership(shop, request.user):
            raise PermissionDenied('상점에 접근할 권한이 없습니다.')
        limit = request.query_params.get('limit')
        try:
            limit = int(limit) if limit is not None else 12
        except ValueError:
            limit = 12
        limit = max(1, min(limit, 60))
        usage_qs = shop.usage_records.filter(period_type=UsagePeriod.MONTHLY).order_by('-period_start')
        serializer = ShopUsageSerializer(usage_qs[:limit], many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def adjust_quota(self, request: Request, pk=None):
        shop = self.get_object()
        self._ensure_manage_permission(shop, request.user)
        serializer = ShopQuotaAdjustmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        amount = serializer.validated_data['amount']
        note = serializer.validated_data.get('note') or ''

        if amount > 0:
            shop.increment_quota(amount=amount, actor=request.user)
            log_service(
                shop=shop,
                remaining=shop.count,
                note=note or f'manual quota increment {amount}',
            )
        else:
            desired = abs(amount)
            if shop.count == 0:
                return Response({
                    'count': shop.count,
                    'monthly_quota': shop.monthly_quota,
                })
            decrement = min(shop.count, desired)
            shop.decrement_quota(amount=decrement, actor=request.user)
            log_service(
                shop=shop,
                remaining=shop.count,
                note=note or f'manual quota decrement {decrement}',
            )

        return Response({
            'count': shop.count,
            'monthly_quota': shop.monthly_quota,
        })





@api_view(['GET'])
def home(request):
    return Response({'message': 'Dressroom backend is available.'})
