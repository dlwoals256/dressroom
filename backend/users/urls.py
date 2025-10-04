from django.urls import path

from .views import (
    devView,
    UserRegisterView,
    WhoAmIAPIView,
    GenerateRequestView
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    path('generate/', GenerateRequestView.as_view(), name='generate'),
    path('dev/', devView.as_view(), name='dev'),
    path('register/', UserRegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    path('whoami/', WhoAmIAPIView.as_view(), name='whoami')
]