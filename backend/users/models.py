from typing import Optional

from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.core.validators import RegexValidator
from django.utils import timezone
from django.db.models import F

from datetime import date


class PlanTier(models.TextChoices):
    BASIC = 'basic', 'Basic'
    PRO = 'pro', 'Pro'
    ENTERPRISE = 'enterprise', 'Enterprise'
    ADMIN = 'admin', 'Admin'


PLAN_TIER_QUOTAS = {
    PlanTier.BASIC: 500,
    PlanTier.PRO: 3000,
    PlanTier.ENTERPRISE: 10000,
    PlanTier.ADMIN: 0,
}


PHONE_VALIDATOR = RegexValidator(
    regex=r'^010-?\d{4}-?\d{4}$',
    message='Phone number format is violated.'
)

BUSINESS_PHONE_VALIDATOR = RegexValidator(
    regex=r'^0\d{1,2}-?\d{3,4}-?\d{4}$',
    message='Business contact number format is violated.'
)


def validate_phone(value: Optional[str]):
    if not value:
        return
    PHONE_VALIDATOR(value)


class ErrorLevel(models.TextChoices):
    INFO = 'info', 'Info'
    WARN = 'warn', 'Warn'
    ERROR = 'error', 'Error'
    FATAL = 'fatal', 'Fatal'


class ShopRole(models.TextChoices):
    OWNER = 'owner', 'Owner'
    MANAGER = 'manager', 'Manager'
    VIEWER = 'viewer', 'Viewer'


class CustomUserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email: str, password: Optional[str], **extra_fields):
        if not email:
            raise ValueError('The email must be provided.')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        extra_fields.setdefault('is_active', True)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_active', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self._create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=150, blank=True)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)
    onboarding_completed = models.BooleanField(default=False)
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS: list[str] = []

    def __str__(self):
        return self.email


class UserProfile(models.Model):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    phone = models.CharField(
        validators=[validate_phone],
        max_length=20, null=True, blank=True
    )
    contact_name = models.CharField(max_length=120, blank=True)
    invoice_email = models.EmailField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    terms_accepted_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'{self.user.email}'


def _default_plan_quota(tier: str) -> int:
    try:
        tier_enum = PlanTier(tier)
    except ValueError:
        tier_enum = PlanTier.BASIC
    return PLAN_TIER_QUOTAS.get(tier_enum, PLAN_TIER_QUOTAS[PlanTier.BASIC])


class ShopProfile(models.Model):
    owner = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='owned_shops'
    )
    members = models.ManyToManyField(
        CustomUser,
        through='ShopMembership',
        related_name='shops',
        blank=True
    )
    shop_id = models.CharField(max_length=100, unique=True)
    shop_name = models.CharField(max_length=150)
    company_name = models.CharField(max_length=255)
    business_registration_number = models.CharField(max_length=32, unique=True)
    contact_phone = models.CharField(max_length=20, validators=[BUSINESS_PHONE_VALIDATOR])
    tier = models.CharField(
        max_length=20,
        choices=PlanTier.choices,
        default=PlanTier.BASIC
    )
    monthly_quota = models.PositiveIntegerField(default=PLAN_TIER_QUOTAS[PlanTier.BASIC])
    count = models.PositiveIntegerField(default=PLAN_TIER_QUOTAS[PlanTier.BASIC])
    plan_renews_at = models.DateTimeField(null=True, blank=True)
    callback_url = models.URLField(blank=True)
    product_feed_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.shop_name} ({self.shop_id})'

    def save(self, *args, **kwargs):
        creating = self.pk is None
        tier_quota = _default_plan_quota(self.tier)
        if self.company_name:
            self.company_name = self.company_name.strip()
        if self.business_registration_number:
            self.business_registration_number = self.business_registration_number.replace('-', '').strip()
        if self.contact_phone:
            self.contact_phone = self.contact_phone.replace('-', '').strip()
        if not creating:
            previous = ShopProfile.objects.filter(pk=self.pk).values('tier').first()
            if previous and previous['tier'] != self.tier:
                tier_quota = _default_plan_quota(self.tier)
                self.monthly_quota = tier_quota
                self.count = min(self.count, tier_quota)
        if not self.monthly_quota:
            self.monthly_quota = tier_quota
        if self.count is None:
            self.count = tier_quota
        super().save(*args, **kwargs)
        if creating:
            ShopMembership.objects.get_or_create(
                shop=self,
                user=self.owner,
                defaults={'role': ShopRole.OWNER, 'is_active': True}
            )

    def refresh_quota(self, quota: Optional[int] = None, actor: Optional['CustomUser'] = None):
        target_quota = quota or _default_plan_quota(self.tier)
        self.monthly_quota = target_quota
        self.count = target_quota
        self.plan_renews_at = timezone.now() + timezone.timedelta(days=30)
        self.save(update_fields=['monthly_quota', 'count', 'plan_renews_at'])
        ShopUsage.reset_current_period(shop=self, actor=actor)

    def decrement_quota(self, amount: int = 1, actor: Optional['CustomUser'] = None):
        if amount < 0:
            raise ValueError('Amount must be positive')
        self.count = max(self.count - amount, 0)
        self.save(update_fields=['count'])
        ShopUsage.record_usage(shop=self, amount=amount, actor=actor)
        return self.count

    @property
    def has_quota(self) -> bool:
        return self.count > 0

    def increment_quota(self, amount: int = 1, actor: Optional['CustomUser'] = None):
        if amount < 0:
            raise ValueError('Amount must be positive')
        self.count = min(self.count + amount, self.monthly_quota)
        self.save(update_fields=['count'])
        ShopUsage.record_usage(shop=self, amount=-amount, actor=actor)
        return self.count


class ShopMembership(models.Model):
    shop = models.ForeignKey(
        ShopProfile,
        on_delete=models.CASCADE,
        related_name='memberships'
    )
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='shop_memberships'
    )
    role = models.CharField(
        max_length=20,
        choices=ShopRole.choices,
        default=ShopRole.MANAGER
    )
    invited_at = models.DateTimeField(null=True, blank=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ('shop', 'user')

    def __str__(self):
        return f'{self.user.email} → {self.shop.shop_name} ({self.role})'


class ServiceErrorLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    level = models.CharField(max_length=10, choices=ErrorLevel.choices, default=ErrorLevel.WARN)
    shop = models.ForeignKey(
        ShopProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='error_logs'
    )
    err_from = models.CharField(max_length=64, null=True, blank=True)
    message = models.TextField(blank=True)

    def __str__(self):
        return f'[{self.timestamp}] ({self.level}) {self.err_from}'


class ServiceLog(models.Model):
    timestamp = models.DateTimeField(auto_now_add=True)
    shop = models.ForeignKey(
        ShopProfile,
        on_delete=models.CASCADE,
        related_name='service_logs'
    )
    requests_remaining = models.PositiveIntegerField(default=0)
    note = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f'[{self.timestamp}] {self.shop.shop_id} remaining: {self.requests_remaining}'


class UsagePeriod(models.TextChoices):
    DAILY = 'daily', 'Daily'
    MONTHLY = 'monthly', 'Monthly'


class ShopUsage(models.Model):
    shop = models.ForeignKey(
        ShopProfile,
        on_delete=models.CASCADE,
        related_name='usage_records'
    )
    period_type = models.CharField(
        max_length=10,
        choices=UsagePeriod.choices,
        default=UsagePeriod.MONTHLY
    )
    period_start = models.DateField()
    used_requests = models.IntegerField(default=0)
    quota_snapshot = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updated_usage_records'
    )

    class Meta:
        unique_together = ('shop', 'period_type', 'period_start')
        ordering = ['-period_start']

    def __str__(self):
        return f'{self.shop.shop_name} {self.period_type} {self.period_start}: {self.used_requests}'

    @staticmethod
    def _period_start(period_type: str) -> date:
        today = timezone.now().date()
        if period_type == UsagePeriod.MONTHLY:
            return today.replace(day=1)
        return today

    @classmethod
    def record_usage(
        cls,
        *,
        shop: ShopProfile,
        amount: int,
        actor: Optional[CustomUser] = None,
        period_type: str = UsagePeriod.MONTHLY,
    ) -> 'ShopUsage':
        if amount == 0:
            return cls.reset_current_period(shop=shop, actor=actor, period_type=period_type)

        period_start = cls._period_start(period_type)
        usage, created = cls.objects.get_or_create(
            shop=shop,
            period_type=period_type,
            period_start=period_start,
            defaults={'quota_snapshot': shop.monthly_quota, 'updated_by': actor},
        )
        update_fields = ['used_requests', 'quota_snapshot', 'updated_at']
        usage.used_requests = F('used_requests') + amount
        usage.quota_snapshot = shop.monthly_quota
        if actor and usage.updated_by_id != actor.id:
            usage.updated_by = actor
            update_fields.append('updated_by')
        usage.save(update_fields=update_fields)
        usage.refresh_from_db()
        return usage

    @classmethod
    def reset_current_period(
        cls,
        *,
        shop: ShopProfile,
        actor: Optional[CustomUser] = None,
        period_type: str = UsagePeriod.MONTHLY,
    ) -> 'ShopUsage':
        period_start = cls._period_start(period_type)
        usage, created = cls.objects.get_or_create(
            shop=shop,
            period_type=period_type,
            period_start=period_start,
            defaults={'quota_snapshot': shop.monthly_quota, 'updated_by': actor},
        )
        usage.used_requests = 0
        usage.quota_snapshot = shop.monthly_quota
        if actor:
            usage.updated_by = actor
        usage.save()
        return usage
