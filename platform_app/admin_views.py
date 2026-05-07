import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.contrib.auth import get_user_model

from .models import (
    UserProfile, Repository, PullRequest, PullRequestFile,
    Issue, Review, Fix, Confidence, GnosisSettings, AuditLog,
)
from .views import admin_required

User = get_user_model()


# ─── Admin Dashboard ───────────────────────────────────────────

@admin_required
@require_GET
def admin_dashboard(request):
    """Admin dashboard: overview stats + trends."""
    total_prs = PullRequest.objects.count()
    completed_prs = PullRequest.objects.filter(processed_status="completed").count()
    failed_prs = PullRequest.objects.filter(processed_status="failed").count()
    processing_prs = PullRequest.objects.filter(processed_status="processing").count()

    total_users = User.objects.count()
    admin_users = User.objects.filter(role="admin").count()
    developer_users = User.objects.filter(role="developer").count()

    total_repos = Repository.objects.count()
    active_repos = Repository.objects.filter(is_active=True).count()

    total_issues = Issue.objects.count()
    total_fixes = Fix.objects.count()

    # GitHub connections
    github_connected = UserProfile.objects.filter(
        github_token__isnull=False
    ).exclude(github_token="").count()

    # PR processing trends (last 30 days)
    pr_trends = list(
        PullRequest.objects.annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("-date")[:30]
    )
    pr_trends = [
        {"date": str(entry["date"]), "count": entry["count"]}
        for entry in reversed(pr_trends)
    ]

    # Tool usage distribution
    tool_dist = list(
        Issue.objects.values("tool")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    # Recent errors (failed PRs)
    recent_errors = list(
        PullRequest.objects.filter(processed_status="failed")
        .select_related("repository")
        .order_by("-updated_at")[:5]
        .values_list("id", "github_pr_number", "title", "repository__owner_name", "repository__repo_name", "updated_at")
    )
    errors = [
        {
            "id": e[0],
            "pr_number": e[1],
            "title": e[2],
            "repository": f"{e[3]}/{e[4]}",
            "updated_at": e[5].isoformat() if e[5] else None,
        }
        for e in recent_errors
    ]

    return JsonResponse({
        "total_prs": total_prs,
        "completed_prs": completed_prs,
        "failed_prs": failed_prs,
        "processing_prs": processing_prs,
        "total_users": total_users,
        "admin_users": admin_users,
        "developer_users": developer_users,
        "total_repos": total_repos,
        "active_repos": active_repos,
        "total_issues": total_issues,
        "total_fixes": total_fixes,
        "github_connected_users": github_connected,
        "pr_trends": pr_trends,
        "tool_distribution": tool_dist,
        "recent_errors": errors,
    })


# ─── Users Management ──────────────────────────────────────────

@admin_required
@require_GET
def admin_list_users(request):
    """List all users with profile info and PR stats."""
    users = User.objects.all().order_by("-date_joined")
    data = []
    for u in users:
        profile = getattr(u, "profile", None)
        total_prs = PullRequest.objects.filter(
            repository__connected_by=u
        ).count()
        data.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "github_connected": bool(profile and profile.github_token),
            "github_login": profile.github_login if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
            "total_prs": total_prs,
            "date_joined": u.date_joined.isoformat(),
            "last_login": u.last_login.isoformat() if u.last_login else None,
        })

    return JsonResponse({"results": data})


@admin_required
@require_GET
def admin_get_user(request, user_id):
    """Get detailed user info."""
    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

    profile = getattr(u, "profile", None)

    repos = Repository.objects.filter(connected_by=u)
    repo_data = [
        {
            "id": r.id,
            "name": f"{r.owner_name}/{r.repo_name}",
            "is_active": r.is_active,
        }
        for r in repos
    ]

    prs = PullRequest.objects.filter(repository__connected_by=u).order_by("-created_at")[:20]
    pr_data = [
        {
            "id": pr.id,
            "pr_number": pr.github_pr_number,
            "title": pr.title,
            "status": pr.processed_status,
            "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
            "created_at": pr.created_at.isoformat(),
        }
        for pr in prs
    ]

    return JsonResponse({
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "role": u.role,
        "is_active": u.is_active,
        "github_connected": bool(profile and profile.github_token),
        "github_login": profile.github_login if profile else None,
        "avatar_url": profile.avatar_url if profile else None,
        "date_joined": u.date_joined.isoformat(),
        "last_login": u.last_login.isoformat() if u.last_login else None,
        "repositories": repo_data,
        "recent_prs": pr_data,
    })


@csrf_exempt
@admin_required
def admin_update_user(request, user_id):
    """Update user role, active status, or revoke GitHub."""
    if request.method != "PATCH":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        u = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found"}, status=404)

    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    # Prevent admin from demoting themselves
    if u.id == request.user.id and data.get("role") == "developer":
        return JsonResponse({"error": "Cannot demote yourself"}, status=400)

    if "role" in data and data["role"] in ("admin", "developer"):
        u.role = data["role"]

    if "is_active" in data:
        # Prevent admin from deactivating themselves
        if u.id == request.user.id and not data["is_active"]:
            return JsonResponse({"error": "Cannot deactivate yourself"}, status=400)
        u.is_active = data["is_active"]

    if data.get("revoke_github"):
        profile = getattr(u, "profile", None)
        if profile:
            profile.github_token = None
            profile.github_id = None
            profile.github_login = None
            profile.connected_at = None
            profile.save()
        u.github_user_id = None

    u.save()

    AuditLog.objects.create(
        action_type="user_updated",
        actor=request.user,
        details={
            "target_user_id": u.id,
            "target_username": u.username,
            "changes": data,
        },
    )

    return JsonResponse({"status": "success"})


# ─── PR Monitoring ──────────────────────────────────────────────

@admin_required
@require_GET
def admin_list_prs(request):
    """List all PRs with filtering support."""
    prs = PullRequest.objects.select_related("repository").all().order_by("-created_at")

    # Filters
    status = request.GET.get("status")
    if status:
        prs = prs.filter(processed_status=status)

    repo_id = request.GET.get("repository")
    if repo_id:
        prs = prs.filter(repository_id=repo_id)

    search = request.GET.get("search")
    if search:
        prs = prs.filter(
            Q(title__icontains=search) | Q(author__icontains=search)
        )

    data = []
    for pr in prs:
        file_count = pr.files.count()
        issue_count = Issue.objects.filter(pr_file__pull_request=pr).count()

        # Get average confidence
        confidences = Confidence.objects.filter(
            review__pr_file__pull_request=pr
        ).values_list("score", flat=True)
        avg_confidence = (
            sum(confidences) / len(confidences) if confidences else None
        )

        data.append({
            "id": pr.id,
            "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
            "repository_id": pr.repository.id,
            "pr_number": pr.github_pr_number,
            "title": pr.title,
            "author": pr.author,
            "status": pr.processed_status,
            "files_count": file_count,
            "issues_count": issue_count,
            "confidence": round(avg_confidence, 2) if avg_confidence else None,
            "created_at": pr.created_at.isoformat(),
            "updated_at": pr.updated_at.isoformat(),
        })

    return JsonResponse({"results": data})


@csrf_exempt
@admin_required
@require_POST
def admin_retrigger_pr(request, pr_id):
    """Re-trigger analysis on a PR."""
    try:
        pr = PullRequest.objects.select_related("repository").get(id=pr_id)
    except PullRequest.DoesNotExist:
        return JsonResponse({"error": "PR not found"}, status=404)

    from platform_app.tasks import process_pr_task

    # Build a minimal payload to re-trigger
    payload = {
        "action": "synchronize",
        "pull_request": {
            "number": pr.github_pr_number,
            "id": pr.github_pr_id,
            "title": pr.title,
            "user": {"login": pr.author},
            "head": {"sha": pr.commit_sha},
            "state": pr.state,
        },
        "repository": {
            "owner": {"login": pr.repository.owner_name},
            "name": pr.repository.repo_name,
            "id": pr.repository.github_repo_id,
        },
        "installation": {"id": pr.repository.github_installation_id},
    }

    pr.processed_status = "pending"
    pr.save(update_fields=["processed_status"])

    process_pr_task.delay(payload)

    AuditLog.objects.create(
        action_type="pr_retrigger",
        actor=request.user,
        details={
            "pr_id": pr.id,
            "pr_number": pr.github_pr_number,
            "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
        },
    )

    return JsonResponse({"status": "queued"})


# ─── Audit Logs ─────────────────────────────────────────────────

@admin_required
@require_GET
def admin_list_logs(request):
    """List audit logs with filtering."""
    logs = AuditLog.objects.select_related("actor").all().order_by("-timestamp")

    # Filters
    action_type = request.GET.get("action_type")
    if action_type:
        logs = logs.filter(action_type__icontains=action_type)

    actor_id = request.GET.get("actor")
    if actor_id:
        logs = logs.filter(actor_id=actor_id)

    date_from = request.GET.get("date_from")
    if date_from:
        logs = logs.filter(timestamp__date__gte=date_from)

    date_to = request.GET.get("date_to")
    if date_to:
        logs = logs.filter(timestamp__date__lte=date_to)

    # Limit to 200 latest
    logs = logs[:200]

    data = []
    for log in logs:
        data.append({
            "id": log.id,
            "action_type": log.action_type,
            "actor": log.actor.username if log.actor else "System",
            "actor_id": log.actor_id,
            "timestamp": log.timestamp.isoformat(),
            "details": log.details,
        })

    return JsonResponse({"results": data})


# ─── GitHub App Settings ────────────────────────────────────────

@admin_required
@require_GET
def admin_get_github_app(request):
    """Get GitHub App configuration."""
    settings_obj, _ = GnosisSettings.objects.get_or_create(id=1)

    # Connected repos
    repos = Repository.objects.filter(is_active=True).order_by("-created_at")
    repo_data = [
        {
            "id": r.id,
            "name": f"{r.owner_name}/{r.repo_name}",
            "installation_id": r.github_installation_id,
            "created_at": r.created_at.isoformat(),
        }
        for r in repos
    ]

    return JsonResponse({
        "github_app_id": settings_obj.github_app_id,
        "github_installation_id": settings_obj.github_installation_id,
        "github_pem_path": settings_obj.github_pem_path,
        "enable_llm_analysis": settings_obj.enable_llm_analysis,
        "enable_tool_backed_analysis": settings_obj.enable_tool_backed_analysis,
        "connected_repos": repo_data,
    })


@csrf_exempt
@admin_required
@require_POST
def admin_update_github_app(request):
    """Update GitHub App credentials."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    settings_obj, _ = GnosisSettings.objects.get_or_create(id=1)

    for field in ("github_app_id", "github_installation_id", "github_pem_path"):
        if field in data:
            setattr(settings_obj, field, data[field])

    settings_obj.save()

    AuditLog.objects.create(
        action_type="github_app_updated",
        actor=request.user,
        details={"fields_updated": list(data.keys())},
    )

    return JsonResponse({"status": "success"})


@csrf_exempt
@admin_required
@require_POST
def admin_test_github_connection(request):
    """Test GitHub App connection."""
    settings_obj, _ = GnosisSettings.objects.get_or_create(id=1)

    if not settings_obj.github_app_id or not settings_obj.github_pem_path:
        return JsonResponse({"status": "error", "message": "GitHub App not configured"}, status=400)

    try:
        from integrations.github.auth import GitHubAppAuth
        from django.conf import settings as django_settings

        auth = GitHubAppAuth(
            app_id=settings_obj.github_app_id or django_settings.APP_ID,
            installation_id=settings_obj.github_installation_id or django_settings.INSTALLATION_ID,
            private_key_path=settings_obj.github_pem_path or django_settings.PEM_PATH,
        )
        headers = auth.get_auth_headers()
        return JsonResponse({"status": "connected", "message": "GitHub App connection successful"})
    except Exception as e:
        return JsonResponse({"status": "error", "message": str(e)}, status=400)


# ─── Platform Settings ─────────────────────────────────────────

@admin_required
@require_GET
def admin_get_platform_settings(request):
    """Get platform-wide configuration."""
    settings_obj, _ = GnosisSettings.objects.get_or_create(id=1)

    return JsonResponse({
        "enable_llm_analysis": settings_obj.enable_llm_analysis,
        "enable_tool_backed_analysis": settings_obj.enable_tool_backed_analysis,
        "default_repositories": settings_obj.default_repositories,
        "github_app_id": settings_obj.github_app_id,
        "github_installation_id": settings_obj.github_installation_id,
        "github_pem_path": settings_obj.github_pem_path,
    })


@csrf_exempt
@admin_required
@require_POST
def admin_update_platform_settings(request):
    """Update platform-wide configuration."""
    try:
        data = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    settings_obj, _ = GnosisSettings.objects.get_or_create(id=1)

    allowed_fields = [
        "enable_llm_analysis",
        "enable_tool_backed_analysis",
        "default_repositories",
    ]

    for field in allowed_fields:
        if field in data:
            setattr(settings_obj, field, data[field])

    settings_obj.save()

    AuditLog.objects.create(
        action_type="platform_settings_updated",
        actor=request.user,
        details={"fields_updated": [f for f in allowed_fields if f in data]},
    )

    return JsonResponse({"status": "success"})
