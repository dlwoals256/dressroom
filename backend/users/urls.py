from django.urls import path
from .views import (
    UserRequestView,
)
from .views import devView

urlpatterns = [
    path('generate/', UserRequestView.as_view(), name='generate'),
    path('dev/', devView.as_view(), name='dev'),
]