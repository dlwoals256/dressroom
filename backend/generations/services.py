# Gemini API와 통신하는 모든 로직 (2-스텝: 분류 → 편집)

from google import genai
from google.genai import types
from io import BytesIO
from PIL import Image, ImageOps
from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from dotenv import load_dotenv
import os, base64

load_dotenv()
GEMINI_KEY = os.environ.get('GEMINI_KEY')

class GeminiAPIResponseError(Exception):
    # Gemini API 응답 중 에러 발생 시
    def __init__(self, message, response:types.GenerateContentResponse):
        super().__init__(message)
        txt = ""
        try:
            for c in response.candidates or []:
                for p in getattr(c.content, "parts", []):
                    if hasattr(p, "text") and p.text:
                        txt += p.text
        except Exception:
            pass
        self.text = txt or message

class _GeminiAPIService:
    def __init__(self):
        self.client = genai.Client(api_key=GEMINI_KEY)

    # ---------- helpers ----------
    def _normalize_exif(self, img: Image.Image) -> Image.Image:
        # EXIF 회전 플래그 제거(좌우반전/회전 이슈 최소화)
        try:
            return ImageOps.exif_transpose(img)
        except Exception:
            return img
        
    def _extract_first_image_bytes(self, response: types.GenerateContentResponse) -> tuple[bytes, str]:
        # 응답에서 첫 번째 이미지 파트를 찾아 base64/bytes 모두 처리
        for cand in response.candidates or []:
            for part in getattr(cand.content, "parts", []):
                if hasattr(part, "inline_data") and part.inline_data:
                    mime = getattr(part.inline_data, "mime_type", "") or ""
                    if mime.startswith("image/"):
                        data = part.inline_data.data
                        if isinstance(data, str):
                            data = base64.b64decode(data)
                        return data, mime
        raise GeminiAPIResponseError("No image data found in the response.", response)

    def _extract_text(self, response: types.GenerateContentResponse) -> str:
        out = []
        for cand in response.candidates or []:
            for part in getattr(cand.content, "parts", []):
                if hasattr(part, "text") and part.text:
                    out.append(part.text.strip())
        return " ".join(out).strip()
    
    # ---------- step 1: classify product category ----------
    def _classify_product(self, product_img: Image.Image) -> tuple[str, int]:
        prompt = (
            "Classify the product in the image into exactly one of these labels:\n"
            "- top (jacket, blazer, coat, shirt, sweater, hoodie, cardigan, vest)\n"
            "- bottom (pants, jeans, shorts, skirt)\n"
            "- set (two-piece suit, tracksuit)\n"
            "- accessory (hat, scarf, tie, belt, bag, glasses)\n"
            "Return only one word: top, bottom, set, or accessory."
        )
        cfg = types.GenerateContentConfig(
            response_modalities=['TEXT'],
            system_instruction="Return exactly one word: top, bottom, set, or accessory. No punctuation."
        )
        resp = self.client.models.generate_content(
            model="gemini-2.5-flash",            # 텍스트 분류용
            contents=[product_img, prompt],
            config=cfg
        )
        text = self._extract_text(resp).lower()
        toks = getattr(resp.usage_metadata, "total_token_count", 0)
        if "bottom" in text: return "bottom", toks
        if "set" in text: return "set", toks
        if "accessory" in text: return "accessory", toks
        # 기본값(top)로 폴백
        return "top", toks
    
    # ---------- step 2: build prompt by category ----------
    def _build_prompt_by_category(self, category: str) -> str:
        common_tail = (
            "Keep face, body, pose, camera angle, lighting, and background unchanged. "
            "Use the product image's exact color, material, texture, and silhouette. "
            "Accept partial occlusion from arms or a seated pose. "
            "Do not flip, mirror, crop, or recolor garments that are not shown in the product image."
        )
        if category == "bottom":
            head = (
                "Edit the person image so the person is wearing the BOTTOM from the product image. "
                "Replace ONLY the pants/skirt area that corresponds to the product image. "
                "Keep jacket/top, shoes, and accessories unchanged. "
            )
        elif category == "set":
            head = (
                "Edit the person image so the person is wearing the outfit set from the product image. "
                "Replace ONLY the parts included in the set; keep other garments unchanged. "
            )
        elif category == "accessory":
            head = (
                "Edit the person image by adding or replacing ONLY the accessory from the product image "
                "(e.g., tie/hat/glasses) with natural scale and placement. "
                "Keep all garments unchanged. "
            )
        else:  # 'top' or fallback
            head = (
                "Edit the person image so the person is wearing the TOP from the product image. "
                "Replace ONLY the upper-body garment that corresponds to the product image. "
                "Keep pants, shoes, and accessories unchanged. "
            )
        return head + common_tail

    # ---------- public API (unchanged signature) ----------
    def generate(
            self,
            product_image: UploadedFile,
            person_image: UploadedFile,
            model='gemini-2.5-flash-image'
        ):

        # 0) load & normalize
        person = self._normalize_exif(Image.open(person_image))
        product = self._normalize_exif(Image.open(product_image))

        # 1) classify product
        category, tokens_cls = self._classify_product(product)

        # 2) build edit prompt
        prompt = self._build_prompt_by_category(category)

        # 3) edit (순서 중요: person → product → prompt)
        cfg = types.GenerateContentConfig(
            response_modalities=['IMAGE'],
            system_instruction=(
                "You are an image editor. Always EDIT the FIRST image using the SECOND image "
                "as clothing reference. Never add or duplicate any person. "
                "Keep identity, pose, camera angle, lighting, and background unchanged. "
                "Always edit ONLY the region that corresponds to the product category."
            )
        )

        resp = self.client.models.generate_content(
            model=model,
            contents=[person, product, prompt],
            config=cfg
        )

        img_bytes, mime = self._extract_first_image_bytes(resp)
        tokens_edit = getattr(resp.usage_metadata, "total_token_count", 0)
        total_tokens = int(tokens_cls) + int(tokens_edit)

        if img_bytes:
            image = BytesIO(img_bytes)
        else:
            raise GeminiAPIResponseError(
                'Gemini API returned an empty response.',
                response=resp
            )

        return image, total_tokens
        
GeminiAPIService = _GeminiAPIService()