from .models import GenerationRequest
from django.contrib.auth.models import User
from typing import Optional

def log_generation_request(
        user: Optional[User],
        shop_id: str,
        customer_id: str,
        used_tokens: Optional[int],
        status: str
):
    '''
    API 요청 로깅

    복잡한 이미지 안되는 경우 발생
    텍스트 리턴도 로깅하기
    '''

    request_log = GenerationRequest.objects.create(
        user=user,
        shop_id=shop_id,
        customer_id=customer_id,
        used_tokens=used_tokens,
        status=status
    )

    return request_log