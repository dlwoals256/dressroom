from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.request import Request
from .models import ErrorLevel
from .serializers import UserRequestSerializer
from generations.services import GeminiAPIService, GeminiAPIResponseError
from generations.loggers import log_generation_request
from generations.models import Status, GenerationErrorLog
from django.http import FileResponse
import sys, traceback
from rest_framework.decorators import api_view
from .loggers import log_service_err, log_service
from rest_framework import generics
from .models import CustomUser, ShopProfile
from .serializers import (
    UserSerializer,
    UserRegisterationSerializer,
    ShopProfileSerializer,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework import viewsets

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
            shop_profile = ShopProfile.objects.get(shop_id=shop_id, user=request.user)
            log = log_generation_request(
                user=shop_profile.user,
                shop_id=shop_id,
                customer_id=customer_id,
                used_tokens=0,
                status=Status.STARTED.value
            )

        except ShopProfile.DoesNotExist:
            # 이 경우는 Shop은 있는데 ShopProfile이 없는 경우, 보통은 있을 수 없으나 예외 처리.
            return Response({
                'error': f'ShopProfile for shop [ {shop_id} ] not found. This shouldn\'t be happen, please contact support.'
            }, status=status.HTTP_404_NOT_FOUND)
        
        if shop_profile.check_count():
            shop_profile.decreasing_count()

            service_log = log_service(
                shop_id=shop_id,
                shop_name=shop_profile.shop_name,
                count=shop_profile.count
            )

            try:
                result, tokens = GeminiAPIService.generate(
                    product_image=product_image,
                    person_image=person_image
                )

                log.used_tokens = tokens
                log.status = Status.SUCCESS.value
                log.save()

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
                    gemini_message=e.text
                )

                log.status = Status.FAILED.value
                log.save()

            except Exception as e:
                exc_type, exc_obj, exc_tb = sys.exc_info()
                fname = traceback.extract_tb(exc_tb)[-1].name

                service_err_log = log_service_err(
                    level=ErrorLevel.WARN.value,
                    err_from=f'{e.__class__.__name__}:{fname}'
                )

                log.status = Status.FAILED.value
                log.save()
        
        else:
            log.status = Status.FAILED.value
            log.save()

            return Response(
                {'error': 'Usage limit exceeded.'},
                status=status.HTTP_400_BAD_REQUEST
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

    def get_queryset(self):
        return self.request.user.shops.all()
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)





@api_view(['GET'])
def home(request):
    return Response({'message': 'Image generation service is live!'})


class devView(APIView):
    def post(self, request:Request):
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

        import zipfile
        import io
        zip_buffer = io.BytesIO()

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_archive:
            zip_archive.writestr('person_image.png', person_image.read())
            zip_archive.writestr('product_image.png', product_image.read())

        zip_buffer.seek(0)

        response = FileResponse(zip_buffer, content_type='application/zip')
        response['Content-Disposition'] = 'attachment; filename="images.zip"'
        return response