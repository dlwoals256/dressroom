from typing import Any

from django.contrib.auth import authenticate
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from .models import (
    CustomUser,
    ShopMembership,
    ShopProfile,
    ShopRole,
    UserProfile,
    PlanTier,
    PLAN_TIER_QUOTAS,
    validate_phone,
    BUSINESS_PHONE_VALIDATOR,
    UsagePeriod,
    ShopUsage,
)

class UserRequestSerializer(serializers.Serializer):
    shop_id = serializers.CharField(required=True)
    customer_id = serializers.CharField(required=True)
    person_image = serializers.ImageField(required=True)
    product_image = serializers.ImageField(required=True)

    def validate_shop_id(self, value):
        if not ShopProfile.objects.filter(shop_id=value, is_active=True).exists():
            raise serializers.ValidationError(
                f'User with the account [ {value} ] does not exist.'
            )
        return value

class UserRegisterationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    full_name = serializers.CharField(required=True, allow_blank=False)
    phone = serializers.CharField(required=False, allow_blank=True)
    accept_terms = serializers.BooleanField(required=True)

    @transaction.atomic
    def create(self, validated_data: dict[str, Any]) -> CustomUser:
        email = validated_data.pop('email')
        password = validated_data.pop('password')
        accept_terms = validated_data.pop('accept_terms')
        phone = validated_data.pop('phone', '')
        full_name = validated_data.pop('full_name', '')

        terms_timestamp = timezone.now() if accept_terms else None

        if not terms_timestamp:
            raise serializers.ValidationError({'accept_terms': '약관 동의가 필요합니다.'})

        user = CustomUser.objects.create_user(
            email=email,
            password=password,
            full_name=full_name,
            terms_accepted_at=terms_timestamp,
        )

        UserProfile.objects.create(
            user=user,
            phone=phone or None,
            terms_accepted_at=terms_timestamp,
        )

        return user

    def to_representation(self, instance: CustomUser) -> dict[str, Any]:
        return {
            'id': instance.id,
            'email': instance.email,
            'full_name': instance.full_name,
        }

    def validate_phone(self, value: str) -> str:
        value = (value or '').strip()
        if not value:
            return ''
        validate_phone(value)
        return value.replace('-', '')

    def validate_full_name(self, value: str) -> str:
        clean = value.strip()
        if not clean:
            raise serializers.ValidationError('대표자 이름을 입력해주세요.')
        return clean

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField(
        required=True,
        write_only=True
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}, # DRF UI에서 비밀번호 필드로 보이게 함
    )

    def validate(self, data):
        user = authenticate(email=data['email'], password=data['password'])
        if user:
            return user
        raise serializers.ValidationError('Email or password doesn\'t matches.')

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = [
            'phone',
            'contact_name',
            'invoice_email',
            'address',
            'terms_accepted_at',
        ]

class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = [
            'id',
            'email',
            'full_name',
            'terms_accepted_at',
            'onboarding_completed',
            'is_staff',
            'is_active',
            'date_joined',
            'last_login',
            'profile',
        ]


class ShopUsageSerializer(serializers.ModelSerializer):
    updated_by = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = ShopUsage
        fields = [
            'id',
            'period_type',
            'period_start',
            'used_requests',
            'quota_snapshot',
            'updated_at',
            'updated_by',
        ]


class ShopQuotaAdjustmentSerializer(serializers.Serializer):
    amount = serializers.IntegerField()
    note = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def validate_amount(self, value: int) -> int:
        if value == 0:
            raise serializers.ValidationError('조정량은 0일 수 없습니다.')
        return value

class ShopProfileSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(read_only=True)
    tier_display = serializers.SerializerMethodField()
    monthly_quota = serializers.IntegerField(read_only=True)
    count = serializers.IntegerField(read_only=True)
    current_month_usage = serializers.SerializerMethodField()

    class Meta:
        model = ShopProfile
        fields = [
            'id',
            'owner',
            'shop_id',
            'shop_name',
            'company_name',
            'business_registration_number',
            'contact_phone',
            'tier',
            'tier_display',
            'monthly_quota',
            'count',
            'plan_renews_at',
            'callback_url',
            'product_feed_url',
            'is_active',
            'created_at',
            'updated_at',
            'current_month_usage',
        ]
        read_only_fields = [
            'monthly_quota',
            'count',
            'plan_renews_at',
            'is_active',
            'created_at',
            'updated_at',
        ]
        extra_kwargs = {
            'company_name': {'required': True},
            'business_registration_number': {'required': True},
            'contact_phone': {'required': True},
        }

    def get_tier_display(self, obj: ShopProfile) -> str:
        return obj.get_tier_display()

    def get_current_month_usage(self, obj: ShopProfile) -> dict:
        period_start = timezone.now().date().replace(day=1)
        usage = obj.usage_records.filter(
            period_type=UsagePeriod.MONTHLY,
            period_start=period_start,
        ).first()
        if not usage:
            return {
                'used_requests': 0,
                'quota_snapshot': obj.monthly_quota,
                'period_start': period_start,
            }
        return {
            'used_requests': usage.used_requests,
            'quota_snapshot': usage.quota_snapshot,
            'period_start': usage.period_start,
            'updated_at': usage.updated_at,
        }

    def create(self, validated_data: dict[str, Any]) -> ShopProfile:
        owner = validated_data.pop('owner', self.context['request'].user)
        tier = validated_data.get('tier', PlanTier.BASIC)
        tier_value = tier if isinstance(tier, str) else tier.value
        try:
            tier_enum = PlanTier(tier_value)
        except ValueError:
            tier_enum = PlanTier.BASIC
        validated_data['tier'] = tier_enum
        validated_data.setdefault('monthly_quota', PLAN_TIER_QUOTAS.get(tier_enum, PLAN_TIER_QUOTAS[PlanTier.BASIC]))
        validated_data.setdefault('count', validated_data['monthly_quota'])
        shop = ShopProfile.objects.create(owner=owner, **validated_data)
        # ensure owner membership exists
        ShopMembership.objects.update_or_create(
            shop=shop,
            user=owner,
            defaults={'role': ShopRole.OWNER, 'is_active': True},
        )
        shop.refresh_quota(actor=owner)
        return shop

    def update(self, instance: ShopProfile, validated_data: dict[str, Any]) -> ShopProfile:
        tier = validated_data.get('tier')
        if tier is not None:
            tier_value = tier if isinstance(tier, str) else tier.value
            try:
                validated_data['tier'] = PlanTier(tier_value)
            except ValueError:
                validated_data.pop('tier')
        old_tier = instance.tier
        instance = super().update(instance, validated_data)
        if 'tier' in validated_data and instance.tier != old_tier:
            actor = self.context['request'].user if 'request' in self.context else None
            instance.refresh_quota(actor=actor)
        return instance

    def validate_business_registration_number(self, value: str) -> str:
        digits = value.replace('-', '').strip()
        if not digits.isdigit() or len(digits) != 10:
            raise serializers.ValidationError('올바른 10자리 사업자등록번호를 입력해주세요.')
        return digits

    def validate_contact_phone(self, value: str) -> str:
        clean = (value or '').strip()
        BUSINESS_PHONE_VALIDATOR(clean)
        return clean.replace('-', '')
