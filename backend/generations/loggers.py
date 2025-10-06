from typing import Optional

from users.models import CustomUser, ShopProfile

from .models import GenerationRequest, GenerationStatus


def log_generation_request(
    *,
    user: Optional[CustomUser],
    shop: ShopProfile,
    customer_id: Optional[str] = None,
    product_reference: str = '',
    used_tokens: Optional[int] = None,
    status: GenerationStatus = GenerationStatus.PENDING,
) -> GenerationRequest:
    """Create a log entry for an image generation attempt."""

    request_log = GenerationRequest.objects.create(
        shop=shop,
        requested_by=user,
        status=status,
        product_reference=product_reference,
        used_tokens=used_tokens or 0,
    )
    request_log.set_customer_reference(customer_id)
    request_log.save(update_fields=['customer_reference', 'customer_hash'])
    return request_log
