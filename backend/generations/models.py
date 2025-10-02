from django.db import models
from django.contrib.auth.models import User
from enum import Enum
from users.models import CustomUser

class Status(Enum):
    PENDING = 'Pending'
    STARTED = 'Started'
    SUCCESS = 'Success'
    FAILED = 'Failed'

    @classmethod
    def choices(cls):
        return [(key.value, key.name) for key in cls]

class GenerationRequest(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True)
    shop_id = models.CharField(max_length=50)
    customer_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    used_tokens = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices(), default=Status.PENDING.value)

    def __str__(self):
        return f'[{self.created_at}] {self.shop_id} - {self.customer_id} requested generate image.'

class GenerationErrorLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=5, default=Status.FAILED.value)
    err_from = models.CharField(max_length=30, null=True, blank=True)
    gemini_message = models.CharField(max_length=200, null=True, blank=True)

    def __str__(self):
        return f'[{self.timestamp}] ( {self.level} ) : {self.err_from} - Message: {self.gemini_message}'
    
