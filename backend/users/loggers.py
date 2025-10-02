from .models import ServiceErrorLog, ServiceLog
from typing import Optional

def log_service_err(
        level: str,
        err_from: Optional[str]
):
    '''
    서비스 단 에러 로깅
    '''

    log = ServiceErrorLog.objects.create(
        level=level,
        err_from=err_from
    )

    return log


def log_service(
        shop_id: str,
        shop_name: str,
        count: int
):
    '''
    서비스 로깅
    '''

    log = ServiceLog.objects.create(
        shop_id=shop_id,
        shop_name=shop_name,
        count=count
    )

    return log