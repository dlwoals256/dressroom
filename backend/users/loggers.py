from typing import Optional

from .models import ServiceErrorLog, ServiceLog, ShopProfile


def log_service_err(
    *,
    level: str,
    err_from: Optional[str],
    shop: Optional[ShopProfile] = None,
    message: str = '',
) -> ServiceErrorLog:
    """Persist an application level error for later auditing."""

    return ServiceErrorLog.objects.create(
        level=level,
        err_from=err_from,
        shop=shop,
        message=message,
    )


def log_service(
    *,
    shop: ShopProfile,
    remaining: int,
    note: str = '',
) -> ServiceLog:
    """Track quota usage snapshots for a shop."""

    return ServiceLog.objects.create(
        shop=shop,
        requests_remaining=remaining,
        note=note,
    )
