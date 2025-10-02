from django.urls import path
from .views import (
    UserRequestView,
)
from .views import devView
from .views import CustomLoginView

urlpatterns = [
    path('generate/', UserRequestView.as_view(), name='generate'),
    path('dev/', devView.as_view(), name='dev'),
    path('auth/token/', CustomLoginView.as_view(), name='obtain-auth-token'),
]