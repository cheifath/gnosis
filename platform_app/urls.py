from django.urls import path
from .views import github_webhook

urlpatterns = [
    path("webhook/", github_webhook, name="github_webhook"),
]