import time

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .serializers import GenerationSerializer
from .models import GenerationRequest, GenerationErrorLog, GenerationStatus
from .services import GeminiAPIService, GeminiAPIResponseError

from django.http import FileResponse

from users.models import ShopProfile, ErrorLevel
from users.loggers import log_service, log_service_err

class GenerateImageView(APIView):
    def post(self, request):
        serializer = GenerationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        shop_id = serializer.validated_data['shop_id']
        customer_id = serializer.validated_data.get('customer_id')
        product_image = serializer.validated_data['product_image']
        person_image = serializer.validated_data['person_image']
        shop = ShopProfile.objects.filter(shop_id=shop_id, is_active=True).first()

        if not shop:
            return Response(
                {'error': '등록되지 않은 상점입니다.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not shop.has_quota:
            return Response(
                {'error': 'Usage limit exceeded.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        log = GenerationRequest.objects.create(
            shop=shop,
            status=GenerationStatus.STARTED,
        )
        log.set_customer_reference(customer_id)
        log.save(update_fields=['customer_reference', 'customer_hash'])

        shop.decrement_quota(actor=None)
        log_service(shop=shop, remaining=shop.count, note='quota decremented via public generate view')

        try:
            started_at = time.monotonic()
            result, tokens = GeminiAPIService.generate(
                product_image=product_image,
                person_image=person_image
            )

            latency_ms = int((time.monotonic() - started_at) * 1000)
            log.mark_success(latency_ms=latency_ms, tokens=tokens, result_path='')

            response = FileResponse(
                result,
                content_type='image/png',
                status=status.HTTP_200_OK
            )
            response['Content-Disposition'] = 'attachment; filename="generated_image.png"'
            return response

        except GeminiAPIResponseError as e:
            GenerationErrorLog.objects.create(
                err_from='_GeminiAPIService.generate',
                gemini_message=e.text,
                level=ErrorLevel.ERROR,
                request=log,
            )
            log.mark_failure(error_message=e.text)
            shop.increment_quota(actor=None)

            return Response({
                'error': str(e)
            }, status=status.HTTP_502_BAD_GATEWAY)
        except Exception as exc:
            log_service_err(
                level=ErrorLevel.ERROR,
                err_from=exc.__class__.__name__,
                shop=shop,
                message=str(exc),
            )
            log.mark_failure(error_message=str(exc))
            shop.increment_quota(actor=None)

            return Response(
                {'error': 'Internal server error during generation.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
