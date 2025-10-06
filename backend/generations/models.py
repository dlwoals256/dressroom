from __future__ import annotations

import hashlib
from typing import Optional

from django.db import models
from django.utils import timezone

from users.models import CustomUser, ShopProfile, ErrorLevel


class GenerationStatus(models.TextChoices):
    PENDING = 'pending', 'Pending'
    STARTED = 'started', 'Started'
    SUCCESS = 'success', 'Success'
    FAILED = 'failed', 'Failed'


class GenerationRequest(models.Model):
    shop = models.ForeignKey(
        ShopProfile,
        on_delete=models.CASCADE,
        related_name='generation_requests'
    )
    requested_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generation_requests'
    )
    customer_reference = models.CharField(max_length=100, blank=True)
    customer_hash = models.CharField(max_length=64, blank=True)
    product_reference = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    used_tokens = models.PositiveIntegerField(default=0)
    latency_ms = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=GenerationStatus.choices,
        default=GenerationStatus.PENDING
    )
    error_code = models.CharField(max_length=64, blank=True)
    error_message = models.TextField(blank=True)
    person_image_path = models.CharField(max_length=255, blank=True)
    product_image_path = models.CharField(max_length=255, blank=True)
    result_image_path = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        customer = self.customer_reference or 'anonymous'
        return f'[{self.created_at}] {self.shop.shop_id} - {customer} requested generate image.'

    def set_customer_reference(self, raw_reference: Optional[str]):
        self.customer_reference = raw_reference or ''
        if raw_reference:
            salted = f'{self.shop.shop_id}:{raw_reference}'
            self.customer_hash = hashlib.sha256(salted.encode('utf-8')).hexdigest()
        else:
            self.customer_hash = ''

    def mark_started(self):
        self.status = GenerationStatus.STARTED
        self.save(update_fields=['status'])

    def mark_success(self, latency_ms: int, tokens: int, result_path: str = ''):
        self.status = GenerationStatus.SUCCESS
        self.latency_ms = latency_ms
        self.used_tokens = tokens
        if result_path:
            self.result_image_path = result_path
        self.updated_at = timezone.now()
        update_fields = ['status', 'latency_ms', 'used_tokens', 'updated_at']
        if result_path:
            update_fields.append('result_image_path')
        self.save(update_fields=update_fields)

    def mark_failure(self, error_code: str = '', error_message: str = ''):
        self.status = GenerationStatus.FAILED
        self.error_code = error_code
        self.error_message = error_message
        self.updated_at = timezone.now()
        self.save(update_fields=['status', 'error_code', 'error_message', 'updated_at'])


class GenerationErrorLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=10, choices=ErrorLevel.choices, default=ErrorLevel.ERROR)
    err_from = models.CharField(max_length=64, null=True, blank=True)
    gemini_message = models.CharField(max_length=500, null=True, blank=True)
    request = models.ForeignKey(
        GenerationRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='error_logs'
    )

    def __str__(self):
        return f'[{self.timestamp}] ( {self.level} ) : {self.err_from} - Message: {self.gemini_message}'
