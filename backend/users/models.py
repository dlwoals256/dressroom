from django.db import models
from django.contrib.auth.models import AbstractUser
from enum import Enum
from django.core.validators import RegexValidator

class Tier(Enum):
    BASIC = 'Basic', 500
    PRO = 'Pro', 3000
    ENTERPRISE = 'Enterprise', 10000
    ADMIN = 'Admin', 0

    @classmethod
    def choices(cls):
        return [(key.value[0], key.name) for key in cls]
    
    @property
    def default_count(self):
        return self.value[1]

class ErrorLevel(Enum):
    INFO = 'Info'
    WARN = 'Warn'
    ERROR = 'Error'
    FATAL = 'Fatal'

    @classmethod
    def choices(cls):
        return [(key.value, key.name) for key in cls]
    

class CustomUser(AbstractUser):
    # AbstractUser는 기본적으로 username, password, email 필드를 가집니다.
    # email 필드를 고유한 값으로 설정하고,
    # username을 이메일로 사용하기 위해 아래 설정을 추가합니다.
    email = models.EmailField(unique=True)

    username = models.CharField(max_length=150, null=True, blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    phone_regex = RegexValidator(
        regex=r'^010-?\d{4}-?\d{4}$',
        message='Phone number format is violated.'
    )
    phone = models.CharField(
        validators=[phone_regex],
        max_length=20, null=True, blank=True
    )

    def __str__(self):
        return f'{self.user.username} ({self.user.email})'



class ShopProfile(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='shops')
    shop_id = models.CharField(max_length=100, unique=True)
    shop_name = models.CharField(max_length=100)
    tier = models.CharField(max_length=10, choices=Tier.choices(), default=Tier.BASIC.value[0])
    count = models.PositiveIntegerField(default=Tier.BASIC.default_count)
    
    def check_count(self):
        return self.count > 0
    
    def decreasing_count(self):
        self.count -= 1
        self.save()
        return self.count
    
    def __str__(self):
        return f'{self.shop_name} ({self.user.email})'

class ServiceErrorLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=5, choices=ErrorLevel.choices(), default=ErrorLevel.WARN.value)
    err_from = models.CharField(max_length=30, null=True, blank=True)

    def __str__(self):
        return f'[{self.timestamp}] ( {self.level} ) : {self.err_from}'
    
class ServiceLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    shop_id = models.CharField(max_length=100)
    shop_name = models.CharField(max_length=100)
    count = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f'[{self.timestamp}] {self.shop_id} NOW LEFT: {self.count}'