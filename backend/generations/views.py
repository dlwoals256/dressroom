from django.shortcuts import render
import requests
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from .serializers import GenerationSerializer
from .models import GenerationRequest, GenerationErrorLog
from .services import GeminiAPIService, GeminiAPIResponseError
from io import BytesIO
from django.http import FileResponse

from rest_framework.decorators import api_view

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

        log = GenerationRequest.objects.create(
            shop_id=shop_id,
            customer_id=customer_id,
            status='Started'
        )

        try:
            count_response = requests.post(
                f'http://127.0.0.1:8000/users/count/',
                json={'shop_id': shop_id}
            )
            count_response.raise_for_status()
        except requests.RequestException as e:
            return Response(
                {'error': 'Failed to validate user count.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        if count_response.status_code == 400:
            return Response(
                count_response.json(),
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            result, tokens = GeminiAPIService.generate(
                product_image=product_image,
                person_image=person_image
            )

            log.used_tokens = tokens.total_tokens
            log.status = 'SUCCESS'
            log.save()
            
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
                gemini_message=e.text
            )

            return Response({
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
