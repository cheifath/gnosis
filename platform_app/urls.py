from django.urls import path
from .views import download_fix, download_all_fixes, export_pr_json, export_pr_json, get_pr_details, get_repository_details, github_webhook, list_pull_requests, list_repositories

urlpatterns = [
    path("webhook/", github_webhook, name="github_webhook"),
    path("prs/", list_pull_requests, name="list_pull_requests"),
    path("prs/<int:pr_id>/", get_pr_details, name="get_pr_details"),
    path("fix/<int:file_id>/", download_fix, name="download_fix"),
    path("prs/<int:pr_id>/export/", export_pr_json),
    path("prs/<int:pr_id>/download-fixes/", download_all_fixes),
    path("repositories/", list_repositories),
    path("repositories/<int:repo_id>/", get_repository_details),
]