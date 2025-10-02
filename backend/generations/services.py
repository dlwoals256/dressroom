# Gemini API와 통신하는 모든 로직

from google import genai
from google.genai import types
from io import BytesIO
from PIL import Image
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from dotenv import load_dotenv
import os

load_dotenv()
GEMINI_KEY = os.getenv('GEMINI_KEY')

class GeminiAPIResponseError(Exception):
    # Gemini API 응답 중 에러 발생 시
    def __init__(self, message, response:types.GenerateContentResponse):
        super().__init__(message)
        self.text = response.candidates[0].content.parts[0].text

class _GeminiAPIService:
    def __init__(self):
        self.client = genai.Client(
            api_key=GEMINI_KEY
        )

    def generate(self,
                 product_image: UploadedFile,
                 person_image: UploadedFile,
                 model='gemini-2.5-flash-image-preview'):
        product = Image.open(product_image)
        person = Image.open(person_image)
        prompt = "Generate a shot of the model wearing the new garment, ensuring it fits naturally on their body. Take the garment from [Image 1: Product Garment Image] and replace the clothing on the model in [Image 2: Model Image] with it. Maintain the exact background, model's pose, angle, and lighting conditions from [Image 2: Model Image]. The garment should faithfully replicate its design and details from [Image 1: Product Garment Image] with minimal alteration."
        contents = [product, person, prompt]

        """
        [IMPORTANT]
        전체 토큰 계산 재확인

        https://ai.google.dev/gemini-api/docs/tokens?hl=ko&lang=python
        """
        total_tokens = self.client.models.count_tokens(
            model=model,
            contents=contents
        )

        response = self.client.models.generate_content(
            model=model,
            contents=contents
        )

        image_parts = [
            part.inline_data.data
            for part in response.candidates[0].content.parts
            if part.inline_data
        ]

        if image_parts:
            image = BytesIO(image_parts[0])
        else:
            raise GeminiAPIResponseError(
                'Gemini API returned an empty response.',
                response=response
            )

        return image, total_tokens
        
GeminiAPIService = _GeminiAPIService()