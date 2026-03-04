import os
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "gnosis_web.settings")

app = Celery("gnosis")

app.config_from_object("django.conf:settings", namespace="CELERY")

app.autodiscover_tasks()