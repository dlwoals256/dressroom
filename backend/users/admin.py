from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.utils.translation import gettext_lazy as _

from .models import (
    CustomUser,
    UserProfile,
    ShopProfile,
    ShopMembership,
    ShopUsage,
    ServiceLog,
    ServiceErrorLog,
)


@admin.register(CustomUser)
class CustomUserAdmin(DjangoUserAdmin):
    ordering = ('email',)
    list_display = (
        'email',
        'full_name',
        'is_active',
        'is_staff',
        'onboarding_completed',
        'date_joined',
    )
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'onboarding_completed')
    search_fields = ('email', 'full_name')

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        (_('Personal info'), {
            'fields': (
                'full_name',
                'terms_accepted_at',
                'onboarding_completed',
            )
        }),
        (_('Permissions'), {
            'fields': (
                'is_active',
                'is_staff',
                'is_superuser',
                'groups',
                'user_permissions',
            )
        }),
        (_('Important dates'), {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': (
                'email',
                'full_name',
                'password1',
                'password2',
                'is_active',
                'is_staff',
                'is_superuser',
                'onboarding_completed',
            ),
        }),
    )


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'phone',
        'contact_name',
        'invoice_email',
        'address',
        'terms_accepted_at',
    )
    search_fields = ('user__email', 'contact_name', 'invoice_email')


@admin.register(ShopProfile)
class ShopProfileAdmin(admin.ModelAdmin):
    list_display = (
        'shop_name',
        'company_name',
        'business_registration_number',
        'contact_phone',
        'owner',
        'tier',
        'count',
        'is_active',
        'created_at',
    )
    list_filter = ('tier', 'is_active')
    search_fields = (
        'shop_name',
        'company_name',
        'business_registration_number',
        'owner__email',
    )


@admin.register(ShopMembership)
class ShopMembershipAdmin(admin.ModelAdmin):
    list_display = ('shop', 'user', 'role', 'is_active', 'joined_at', 'invited_at')
    list_filter = ('role', 'is_active')
    search_fields = ('shop__shop_name', 'shop__company_name', 'user__email')


@admin.register(ShopUsage)
class ShopUsageAdmin(admin.ModelAdmin):
    list_display = (
        'shop',
        'period_type',
        'period_start',
        'used_requests',
        'quota_snapshot',
        'updated_by',
        'updated_at',
    )
    list_filter = ('period_type', 'period_start')
    search_fields = ('shop__shop_name', 'shop__company_name', 'shop__shop_id')


@admin.register(ServiceLog)
class ServiceLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'shop', 'requests_remaining', 'note')
    search_fields = ('shop__shop_name', 'shop__company_name', 'shop__shop_id')
    list_filter = ('timestamp',)


@admin.register(ServiceErrorLog)
class ServiceErrorLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'level', 'shop', 'err_from')
    list_filter = ('level', 'timestamp')
    search_fields = ('shop__shop_name', 'shop__company_name', 'err_from', 'message')
