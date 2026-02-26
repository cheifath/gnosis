from django.contrib import admin

from django.contrib import admin
from .models import WebhookEvent, AuditLog

admin.site.register(WebhookEvent)
admin.site.register(AuditLog)
