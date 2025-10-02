from django.contrib import admin
from .models import UserProfile, CustomUser, ShopProfile, ServiceErrorLog, ServiceLog

admin.site.register(UserProfile)
admin.site.register(CustomUser)
admin.site.register(ShopProfile)
admin.site.register(ServiceLog)
admin.site.register(ServiceErrorLog)