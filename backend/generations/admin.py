from django.contrib import admin
from .models import GenerationRequest, GenerationErrorLog

admin.site.register(GenerationRequest)
admin.site.register(GenerationErrorLog)