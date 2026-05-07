from django.urls import path
from .views import (
    dashboard_stats, download_fix, download_all_fixes, export_pr_json,
    get_pr_details, get_repository_details, get_settings, github_webhook,
    list_issues, list_pull_requests, list_repositories, update_settings,
    insights, activity,
    github_app_install_url, list_installations, installation_detail,
    sync_installations, uninstall_installation, installation_configure_url,
)
from .auth_views import signup, login, refresh_token, github_oauth_url, github_oauth_callback, github_connect_callback, me, update_profile, revoke_github
from .admin_views import (
    admin_dashboard, admin_list_users, admin_get_user, admin_update_user,
    admin_list_prs, admin_retrigger_pr, admin_list_logs,
    admin_get_github_app, admin_update_github_app, admin_test_github_connection,
    admin_get_platform_settings, admin_update_platform_settings,
)

urlpatterns = [
    # Auth
    path("auth/signup/", signup, name="signup"),
    path("auth/login/", login, name="login"),
    path("auth/refresh/", refresh_token, name="refresh_token"),
    path("auth/me/", me, name="me"),
    path("auth/github/url/", github_oauth_url, name="github_oauth_url"),
    path("auth/github/callback/", github_oauth_callback, name="github_oauth_callback"),
    path("auth/github/connect/", github_connect_callback, name="github_connect_callback"),
    path("auth/profile/update/", update_profile, name="update_profile"),
    path("auth/github/revoke/", revoke_github, name="revoke_github"),

    # Webhook
    path("webhook/", github_webhook, name="github_webhook"),

    # Dashboard
    path("dashboard/", dashboard_stats, name="dashboard_stats"),

    # Pull requests
    path("prs/", list_pull_requests, name="list_pull_requests"),
    path("prs/<int:pr_id>/", get_pr_details, name="get_pr_details"),
    path("prs/<int:pr_id>/export/", export_pr_json),
    path("prs/<int:pr_id>/download-fixes/", download_all_fixes),

    # Files/Fixes
    path("fix/<int:file_id>/", download_fix, name="download_fix"),

    # Repositories
    path("repositories/", list_repositories),
    path("repositories/<int:repo_id>/", get_repository_details),

    # Installations
    path("installations/", list_installations, name="list_installations"),
    path("installations/<int:installation_id>/", installation_detail, name="installation_detail"),
    path("installations/install-url/", github_app_install_url, name="github_app_install_url"),
    path("installations/sync/", sync_installations, name="sync_installations"),
    path("installations/<int:installation_id>/uninstall/", uninstall_installation, name="uninstall_installation"),
    path("installations/<int:installation_id>/configure-url/", installation_configure_url, name="installation_configure_url"),

    # Issues
    path("issues/", list_issues, name="list_issues"),

    # Settings (admin)
    path("settings/", get_settings, name="get_settings"),
    path("settings/update/", update_settings, name="update_settings"),

    # Insights
    path("insights/", insights, name="insights"),

    # Activity
    path("activity/", activity, name="activity"),

    # ─── Admin Panel API ────────────────────────────────────────
    path("admin/dashboard/", admin_dashboard, name="admin_dashboard"),
    path("admin/users/", admin_list_users, name="admin_list_users"),
    path("admin/users/<int:user_id>/", admin_get_user, name="admin_get_user"),
    path("admin/users/<int:user_id>/update/", admin_update_user, name="admin_update_user"),
    path("admin/prs/", admin_list_prs, name="admin_list_prs"),
    path("admin/prs/<int:pr_id>/retrigger/", admin_retrigger_pr, name="admin_retrigger_pr"),
    path("admin/logs/", admin_list_logs, name="admin_list_logs"),
    path("admin/github-app/", admin_get_github_app, name="admin_get_github_app"),
    path("admin/github-app/update/", admin_update_github_app, name="admin_update_github_app"),
    path("admin/github-app/test/", admin_test_github_connection, name="admin_test_github_connection"),
    path("admin/settings/", admin_get_platform_settings, name="admin_get_platform_settings"),
    path("admin/settings/update/", admin_update_platform_settings, name="admin_update_platform_settings"),
]