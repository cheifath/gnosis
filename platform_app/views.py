from django.shortcuts import render
import json
import hmac
import hashlib
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from functools import wraps

from integrations.github.auth import GitHubAppAuth
from integrations.github.pr_engine_runner import PullRequestEngineRunner
from integrations.github.pr_commenter import GitHubPRCommenter
from integrations.github.comment_formatter import format_pr_summary

# Models for persistence
from .models import WebhookEvent, AuditLog, PullRequest, PullRequestFile, Issue, Review, Confidence, Fix, Repository, GnosisSettings, Installation

from django.views.decorators.http import require_GET, require_POST, require_http_methods

from django.http import HttpResponse

import zipfile
import io

from integrations.github.check_runner import GitHubCheckRunner
from platform_app.tasks import process_pr_task


# ─── Auth helpers ───────────────────────────────────────────────

def jwt_required(view_func):
    """Decorator: require valid JWT token."""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        from rest_framework_simplejwt.authentication import JWTAuthentication
        auth = JWTAuthentication()
        try:
            result = auth.authenticate(request)
        except Exception:
            return JsonResponse({"error": "Authentication required"}, status=401)
        if result is None:
            return JsonResponse({"error": "Authentication required"}, status=401)
        request.user, _ = result
        return view_func(request, *args, **kwargs)
    return wrapper


def admin_required(view_func):
    """Decorator: require JWT + admin role."""
    @wraps(view_func)
    @jwt_required
    def wrapper(request, *args, **kwargs):
        if request.user.role != "admin":
            return JsonResponse({"error": "Admin access required"}, status=403)
        return view_func(request, *args, **kwargs)
    return wrapper

@csrf_exempt
def github_webhook(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    # Verify GitHub webhook signature
    webhook_secret = getattr(settings, "GITHUB_WEBHOOK_SECRET", "")
    if webhook_secret:
        signature = request.headers.get("X-Hub-Signature-256", "")
        if not signature:
            return JsonResponse({"error": "Missing signature"}, status=403)
        expected = "sha256=" + hmac.new(
            webhook_secret.encode(), request.body, hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return JsonResponse({"error": "Invalid signature"}, status=403)

    try:
        payload = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    event_type = request.headers.get("X-GitHub-Event", "")
    action = payload.get("action", "")

    print(f"Received webhook: event={event_type} action={action}")

    # Save webhook event
    WebhookEvent.objects.create(
        event_type=f"{event_type}.{action}" if action else event_type,
        payload=payload,
    )

    AuditLog.objects.create(
        action_type=f"Webhook {event_type}.{action}",
        actor=None,
        details=payload,
    )

    # ─── Handle installation events ─────────────────────────────
    if event_type == "installation":
        from .models import Installation
        return _handle_installation_event(action, payload)

    # ─── Handle installation_repositories events ────────────────
    if event_type == "installation_repositories":
        return _handle_installation_repos_event(action, payload)

    # ─── Handle pull_request events ─────────────────────────────
    if event_type == "pull_request" and action in ("opened", "synchronize"):
        process_pr_task.delay(payload)
        return JsonResponse({"status": "queued for processing"}, status=200)

    return JsonResponse({"status": "ignored"}, status=200)


def _handle_installation_event(action, payload):
    """Process installation.created / .deleted events."""
    from .models import Installation, Repository

    inst_data = payload.get("installation", {})
    inst_id = str(inst_data.get("id", ""))
    account = inst_data.get("account", {})

    if action == "created":
        installation, _ = Installation.objects.update_or_create(
            github_installation_id=inst_id,
            defaults={
                "account_login": account.get("login", ""),
                "account_type": account.get("type", "User"),
                "account_id": str(account.get("id", "")),
                "account_avatar_url": account.get("avatar_url", ""),
                "is_active": True,
            },
        )

        # Register repositories included in the installation
        repos = payload.get("repositories", [])
        for r in repos:
            full_name = r.get("full_name", "")
            parts = full_name.split("/", 1)
            if len(parts) == 2:
                Repository.objects.update_or_create(
                    owner_name=parts[0],
                    repo_name=parts[1],
                    defaults={
                        "github_repo_id": str(r.get("id", "")),
                        "github_installation_id": inst_id,
                        "installation": installation,
                        "is_active": True,
                    },
                )

        # Link installation to user who installed it (via sender)
        sender = payload.get("sender", {})
        sender_id = str(sender.get("id", ""))
        if sender_id:
            from .models import UserProfile
            profile = UserProfile.objects.filter(github_id=sender_id).first()
            if profile:
                installation.installed_by = profile.user
                installation.save(update_fields=["installed_by"])
                # Also link repos to the user
                Repository.objects.filter(
                    installation=installation,
                    connected_by__isnull=True,
                ).update(connected_by=profile.user)

        return JsonResponse({"status": "installation registered"}, status=200)

    if action == "deleted":
        Installation.objects.filter(github_installation_id=inst_id).update(is_active=False)
        Repository.objects.filter(github_installation_id=inst_id).update(is_active=False)
        return JsonResponse({"status": "installation deactivated"}, status=200)

    return JsonResponse({"status": "ignored"}, status=200)


def _handle_installation_repos_event(action, payload):
    """Process installation_repositories.added / .removed events."""
    from .models import Installation, Repository

    inst_data = payload.get("installation", {})
    inst_id = str(inst_data.get("id", ""))

    try:
        installation = Installation.objects.get(github_installation_id=inst_id)
    except Installation.DoesNotExist:
        return JsonResponse({"error": "Unknown installation"}, status=404)

    if action == "added":
        for r in payload.get("repositories_added", []):
            full_name = r.get("full_name", "")
            parts = full_name.split("/", 1)
            if len(parts) == 2:
                Repository.objects.update_or_create(
                    owner_name=parts[0],
                    repo_name=parts[1],
                    defaults={
                        "github_repo_id": str(r.get("id", "")),
                        "github_installation_id": inst_id,
                        "installation": installation,
                        "connected_by": installation.installed_by,
                        "is_active": True,
                    },
                )

    if action == "removed":
        for r in payload.get("repositories_removed", []):
            full_name = r.get("full_name", "")
            parts = full_name.split("/", 1)
            if len(parts) == 2:
                Repository.objects.filter(
                    owner_name=parts[0],
                    repo_name=parts[1],
                ).update(is_active=False)

    return JsonResponse({"status": "repositories updated"}, status=200)

@jwt_required
@require_GET
def get_repository_details(request, repo_id):
    try:
        if request.user.role == "admin":
            repo = Repository.objects.get(id=repo_id)
        else:
            repo = Repository.objects.get(id=repo_id, connected_by=request.user)
    except Repository.DoesNotExist:
        return JsonResponse({"error": "Repository not found"}, status=404)

    prs = repo.pull_requests.order_by("-created_at")

    pr_data = []
    for pr in prs:
        pr_data.append({
            "id": pr.id,
            "pr_number": pr.github_pr_number,
            "title": pr.title,
            "status": pr.processed_status,
            "created_at": pr.created_at,
        })

    return JsonResponse({
        "id": repo.id,
        "name": f"{repo.owner_name}/{repo.repo_name}",
        "github_installation_id": repo.github_installation_id,
        "prs": pr_data,
    })

@jwt_required
@require_GET
def list_repositories(request):
    if request.user.role == "admin":
        repos = Repository.objects.filter(is_active=True).order_by("-created_at")
    else:
        # Show repos the user connected directly OR repos from their installations
        from django.db.models import Q
        repos = Repository.objects.filter(
            Q(connected_by=request.user) | Q(installation__installed_by=request.user),
            is_active=True,
        ).distinct().order_by("-created_at")

    data = []
    for repo in repos:
        total_prs = repo.pull_requests.count()
        completed = repo.pull_requests.filter(processed_status="completed").count()
        failed = repo.pull_requests.filter(processed_status="failed").count()

        data.append({
            "id": repo.id,
            "name": f"{repo.owner_name}/{repo.repo_name}",
            "total_prs": total_prs,
            "completed_prs": completed,
            "failed_prs": failed,
            "created_at": repo.created_at,
        })

    return JsonResponse({"results": data})

@jwt_required
@require_GET
def download_all_fixes(request, pr_id):
    try:
        if request.user.role == "admin":
            pr = PullRequest.objects.get(id=pr_id)
        else:
            pr = PullRequest.objects.get(id=pr_id, repository__connected_by=request.user)
    except PullRequest.DoesNotExist:
        return JsonResponse({"error": "PR not found"}, status=404)

    if pr.processed_status != "completed":
        return JsonResponse({"error": "PR not completed"}, status=400)

    # Create in-memory zip
    buffer = io.BytesIO()
    zip_file = zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED)

    files_added = 0

    for file in pr.files.all():
        try:
            fix = file.review.fix
            zip_file.writestr(file.filename, fix.fixed_code)
            files_added += 1
        except Exception:
            continue

    zip_file.close()

    if files_added == 0:
        return JsonResponse({"error": "No fixes available"}, status=404)

    buffer.seek(0)

    response = HttpResponse(buffer, content_type="application/zip")
    response["Content-Disposition"] = f'attachment; filename="pr_{pr.github_pr_number}_fixes.zip"'
    return response

@jwt_required
@require_GET
def export_pr_json(request, pr_id):
    try:
        if request.user.role == "admin":
            pr = PullRequest.objects.get(id=pr_id)
        else:
            pr = PullRequest.objects.get(id=pr_id, repository__connected_by=request.user)
    except PullRequest.DoesNotExist:
        return JsonResponse({"error": "PR not found"}, status=404)

    return JsonResponse({
        "id": pr.id,
        "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
        "pr_number": pr.github_pr_number,
        "status": pr.processed_status,
        "created_at": pr.created_at,
    })

@jwt_required
@require_GET
def download_fix(request, file_id):
    try:
        file = PullRequestFile.objects.select_related(
            "pull_request__repository"
        ).get(id=file_id)
        if request.user.role != "admin" and file.pull_request.repository.connected_by != request.user:
            return JsonResponse({"error": "Fix not found"}, status=404)
        review = file.review
        fix = review.fix
    except Exception:
        return JsonResponse({"error": "Fix not found"}, status=404)

    response = HttpResponse(fix.fixed_code, content_type="text/plain")
    response["Content-Disposition"] = f'attachment; filename="{file.filename}"'
    return response

@jwt_required
@require_GET
def get_pr_details(request, pr_id):
    try:
        if request.user.role == "admin":
            pr = PullRequest.objects.select_related("repository").get(id=pr_id)
        else:
            pr = PullRequest.objects.select_related("repository").get(
                id=pr_id, repository__connected_by=request.user
            )
    except PullRequest.DoesNotExist:
        return JsonResponse({"error": "PR not found"}, status=404)

    import difflib

    files_data = []

    for file in pr.files.all():
        issues = []
        for issue in file.issues.all():
            issues.append({
                "tool": issue.tool,
                "category": issue.category,
                "severity": issue.severity,
                "line": issue.line_number,
                "message": issue.message,
            })

        review = file.review if hasattr(file, "review") else None
        confidence = review.confidence if review and hasattr(review, "confidence") else None
        fix = review.fix if review and hasattr(review, "fix") else None

        diff = None
        if fix and file.original_content:
            diff_lines = difflib.unified_diff(
                file.original_content.splitlines(),
                fix.fixed_code.splitlines(),
                fromfile=f"a/{file.filename}",
                tofile=f"b/{file.filename}",
                lineterm="",
            )
            diff = "\n".join(diff_lines)

        files_data.append({
            "id": file.id,
            "filename": file.filename,
            "analysis_type": file.analysis_type,
            "issues": issues,
            "review": review.summary_text if review else None,
            "full_debug": review.full_debug_text if review else None,
            "confidence": confidence.score if confidence else None,
            "fix_available": bool(fix),
            "diff": diff,
        })

    return JsonResponse({
        "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
        "pr_number": pr.github_pr_number,
        "title": pr.title,
        "author": pr.author,
        "status": pr.processed_status,
        "files": files_data,
    })

@jwt_required
@require_GET
def list_pull_requests(request):
    if request.user.role == "admin":
        prs = PullRequest.objects.select_related("repository").all().order_by("-created_at")
    else:
        prs = PullRequest.objects.select_related("repository").filter(
            repository__connected_by=request.user
        ).order_by("-created_at")

    data = []
    for pr in prs:
        data.append({
            "id": pr.id,
            "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
            "pr_number": pr.github_pr_number,
            "title": pr.title,
            "author": pr.author,
            "state": pr.state,
            "status": pr.processed_status,
            "created_at": pr.created_at,
        })

    return JsonResponse({"results": data})


@jwt_required
@require_GET
def dashboard_stats(request):
    from .models import Repository, Fix, UserProfile

    if request.user.role == "admin":
        user_repos = Repository.objects.filter(is_active=True)
    else:
        from django.db.models import Q
        user_repos = Repository.objects.filter(
            Q(connected_by=request.user) | Q(installation__installed_by=request.user),
            is_active=True,
        ).distinct()

    user_prs = PullRequest.objects.filter(repository__in=user_repos)
    user_issues = Issue.objects.filter(pr_file__pull_request__repository__in=user_repos)
    user_fixes = Fix.objects.filter(review__pr_file__pull_request__repository__in=user_repos)

    total_prs = user_prs.count()
    total_issues = user_issues.count()
    total_repos = user_repos.count()
    total_fixes = user_fixes.count()

    recent_prs = user_prs.select_related("repository").order_by("-created_at")[:5]
    recent = []
    for pr in recent_prs:
        file_count = pr.files.count()
        issue_count = Issue.objects.filter(pr_file__pull_request=pr).count()
        recent.append({
            "id": pr.id,
            "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
            "pr_number": pr.github_pr_number,
            "title": pr.title,
            "author": pr.author,
            "status": pr.processed_status,
            "files_count": file_count,
            "issues_count": issue_count,
            "created_at": pr.created_at,
        })

    # Check GitHub connection status
    profile = getattr(request.user, 'profile', None)
    github_connected = bool(profile and profile.github_token) if profile else False

    # Check if user has any active installations
    if request.user.role == "admin":
        has_installations = Installation.objects.filter(is_active=True).exists()
    else:
        # Check by installed_by or by matching GitHub account_login
        from django.db.models import Q
        profile_login = profile.github_login if profile else None
        inst_q = Q(installed_by=request.user)
        if profile_login:
            inst_q |= Q(account_login=profile_login)
        has_installations = Installation.objects.filter(inst_q, is_active=True).exists()

    return JsonResponse({
        "prs": total_prs,
        "issues": total_issues,
        "repositories": total_repos,
        "fixes": total_fixes,
        "recent_prs": recent,
        "github_connected": github_connected,
        "has_installations": has_installations,
    })


@jwt_required
@require_GET
def list_issues(request):
    qs = Issue.objects.select_related(
        "pr_file__pull_request__repository"
    )
    if request.user.role != "admin":
        qs = qs.filter(pr_file__pull_request__repository__connected_by=request.user)
    issues = qs.order_by("-id")

    data = []
    for issue in issues:
        pr = issue.pr_file.pull_request
        data.append({
            "tool": issue.tool,
            "category": issue.category,
            "severity": issue.severity,
            "line": issue.line_number,
            "message": issue.message,
            "filename": issue.pr_file.filename,
            "pr_id": pr.id,
            "pr_number": pr.github_pr_number,
            "pr_title": pr.title,
            "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
        })

    return JsonResponse({"results": data})


@admin_required
@require_GET
def get_settings(request):
    settings_obj, _ = GnosisSettings.objects.get_or_create(id=1)
    return JsonResponse({
        "github_app_id": settings_obj.github_app_id,
        "github_installation_id": settings_obj.github_installation_id,
        "github_pem_path": settings_obj.github_pem_path,
        "default_repositories": settings_obj.default_repositories,
        "enable_llm_analysis": settings_obj.enable_llm_analysis,
        "enable_tool_backed_analysis": settings_obj.enable_tool_backed_analysis,
    })


@csrf_exempt
@admin_required
@require_POST
def update_settings(request):
    try:
        data = json.loads(request.body)
        settings_obj, _ = GnosisSettings.objects.get_or_create(id=1)

        settings_obj.github_app_id = data.get("github_app_id", settings_obj.github_app_id)
        settings_obj.github_installation_id = data.get("github_installation_id", settings_obj.github_installation_id)
        settings_obj.github_pem_path = data.get("github_pem_path", settings_obj.github_pem_path)
        settings_obj.default_repositories = data.get("default_repositories", settings_obj.default_repositories)
        settings_obj.enable_llm_analysis = data.get("enable_llm_analysis", settings_obj.enable_llm_analysis)
        settings_obj.enable_tool_backed_analysis = data.get("enable_tool_backed_analysis", settings_obj.enable_tool_backed_analysis)

        settings_obj.save()
        return JsonResponse({"status": "success"})
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


# ─── Insights ────────────────────────────────────────────────────

@jwt_required
@require_GET
def insights(request):
    """Analytics data: issues over time, top risky files, severity/language distribution."""
    from django.db.models import Count
    from collections import Counter

    if request.user.role == "admin":
        issue_qs = Issue.objects.all()
        file_qs = PullRequestFile.objects.all()
        pr_qs = PullRequest.objects.all()
    else:
        issue_qs = Issue.objects.filter(pr_file__pull_request__repository__connected_by=request.user)
        file_qs = PullRequestFile.objects.filter(pull_request__repository__connected_by=request.user)
        pr_qs = PullRequest.objects.filter(repository__connected_by=request.user)

    # Severity distribution
    severity_dist = list(
        issue_qs.values("severity")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    # Tool distribution
    tool_dist = list(
        issue_qs.values("tool")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    # Language distribution — exclude empty/blank language values
    lang_dist = list(
        file_qs.exclude(language__in=["", None])
        .values("language")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    # Top risky files (most issues)
    top_files = list(
        issue_qs.values("pr_file__filename")
        .annotate(count=Count("id"))
        .order_by("-count")[:10]
    )
    top_files = [
        {"filename": f["pr_file__filename"], "issues": f["count"]}
        for f in top_files
    ]

    # Issues over time (grouped by date)
    from django.db.models.functions import TruncDate
    issues_over_time = list(
        issue_qs.annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )
    issues_timeline = [
        {"date": str(entry["date"]), "count": entry["count"]}
        for entry in issues_over_time
    ]

    # PR analysis over time
    prs_over_time = list(
        pr_qs.annotate(date=TruncDate("created_at"))
        .values("date")
        .annotate(count=Count("id"))
        .order_by("date")
    )
    prs_timeline = [
        {"date": str(entry["date"]), "count": entry["count"]}
        for entry in prs_over_time
    ]

    return JsonResponse({
        "severity_distribution": severity_dist,
        "tool_distribution": tool_dist,
        "language_distribution": lang_dist,
        "top_risky_files": top_files,
        "issues_over_time": issues_timeline,
        "prs_over_time": prs_timeline,
    })


# ─── Activity ────────────────────────────────────────────────────

@jwt_required
@require_GET
def activity(request):
    """Activity timeline: recent audit log + webhook events."""
    events = []

    if request.user.role == "admin":
        pr_qs = PullRequest.objects.select_related("repository").all()
        issue_qs = Issue.objects.select_related("pr_file__pull_request__repository").all()
        fix_qs = Fix.objects.select_related("review__pr_file__pull_request__repository").all()
    else:
        pr_qs = PullRequest.objects.select_related("repository").filter(
            repository__connected_by=request.user
        )
        issue_qs = Issue.objects.select_related("pr_file__pull_request__repository").filter(
            pr_file__pull_request__repository__connected_by=request.user
        )
        fix_qs = Fix.objects.select_related("review__pr_file__pull_request__repository").filter(
            review__pr_file__pull_request__repository__connected_by=request.user
        )

    # Recent PRs analyzed
    for pr in pr_qs.order_by("-created_at")[:20]:
        events.append({
            "type": "pr_analyzed",
            "message": f"PR #{pr.github_pr_number} {pr.title} analyzed",
            "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
            "status": pr.processed_status,
            "timestamp": pr.created_at.isoformat(),
        })

    # Recent issues detected
    for issue in issue_qs.order_by("-created_at")[:20]:
        pr = issue.pr_file.pull_request
        events.append({
            "type": "issue_detected",
            "message": f"{issue.severity} issue: {issue.message[:80]}",
            "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
            "severity": issue.severity,
            "timestamp": issue.created_at.isoformat(),
        })

    # Recent fixes suggested
    for fix in fix_qs.order_by("-created_at")[:20]:
        pr = fix.review.pr_file.pull_request
        events.append({
            "type": "fix_suggested",
            "message": f"Fix suggested for {fix.review.pr_file.filename}",
            "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
            "timestamp": fix.created_at.isoformat(),
        })

    # Recent audit logs (admin only)
    if request.user.role == "admin":
        recent_logs = AuditLog.objects.order_by("-timestamp")[:20]
        for log in recent_logs:
            events.append({
                "type": "audit",
                "message": log.action_type,
                "timestamp": log.timestamp.isoformat(),
            })

    # Sort all events by timestamp descending
    events.sort(key=lambda x: x["timestamp"], reverse=True)

    return JsonResponse({"events": events[:50]})


# ─── GitHub App Installation ────────────────────────────────────

@jwt_required
@require_GET
def github_app_install_url(request):
    """Return the URL to install the GNOSIS GitHub App."""
    app_slug = getattr(settings, "GITHUB_APP_SLUG", "")
    if not app_slug:
        return JsonResponse({"error": "GitHub App not configured"}, status=500)
    url = f"https://github.com/apps/{app_slug}/installations/new"
    return JsonResponse({"url": url})


@jwt_required
@require_GET
def list_installations(request):
    """List GitHub App installations for the current user."""
    if request.user.role == "admin":
        installations = Installation.objects.filter(is_active=True).order_by("-created_at")
    else:
        from django.db.models import Q
        from .models import UserProfile
        profile = getattr(request.user, 'profile', None)
        profile_login = profile.github_login if profile else None
        inst_q = Q(installed_by=request.user)
        if profile_login:
            inst_q |= Q(account_login=profile_login)
        installations = Installation.objects.filter(inst_q, is_active=True).order_by("-created_at")

    data = []
    for inst in installations:
        repo_count = inst.repositories.filter(is_active=True).count()
        data.append({
            "id": inst.id,
            "github_installation_id": inst.github_installation_id,
            "account_login": inst.account_login,
            "account_type": inst.account_type,
            "account_avatar_url": inst.account_avatar_url,
            "repository_count": repo_count,
            "repository_selection": inst.repository_selection,
            "created_at": inst.created_at.isoformat(),
        })

    return JsonResponse({"results": data})


@jwt_required
@require_GET
def installation_detail(request, installation_id):
    """Get details of a specific installation and its repositories."""
    try:
        if request.user.role == "admin":
            inst = Installation.objects.get(id=installation_id, is_active=True)
        else:
            inst = Installation.objects.get(
                id=installation_id, installed_by=request.user, is_active=True
            )
    except Installation.DoesNotExist:
        return JsonResponse({"error": "Installation not found"}, status=404)

    repos = inst.repositories.filter(is_active=True).order_by("-created_at")
    repo_data = []
    for r in repos:
        total_prs = r.pull_requests.count()
        completed = r.pull_requests.filter(processed_status="completed").count()
        repo_data.append({
            "id": r.id,
            "name": f"{r.owner_name}/{r.repo_name}",
            "total_prs": total_prs,
            "completed_prs": completed,
            "created_at": r.created_at.isoformat(),
        })

    return JsonResponse({
        "id": inst.id,
        "github_installation_id": inst.github_installation_id,
        "account_login": inst.account_login,
        "account_type": inst.account_type,
        "account_avatar_url": inst.account_avatar_url,
        "repository_selection": inst.repository_selection,
        "repositories": repo_data,
        "created_at": inst.created_at.isoformat(),
    })


@csrf_exempt
@jwt_required
@require_POST
def sync_installations(request):
    """Sync GitHub App installations from GitHub API using the App's JWT.
    Matches installations to users by their GitHub login."""
    import requests as http_requests
    import time as _time
    import jwt as _jwt
    from pathlib import Path
    from .models import UserProfile

    profile = getattr(request.user, 'profile', None)
    if not profile or not profile.github_login:
        return JsonResponse({"error": "GitHub account not connected"}, status=400)

    # Use the GitHub App's JWT to list its installations
    app_id = getattr(settings, "APP_ID", "")
    pem_path = getattr(settings, "PEM_PATH", "")

    if not app_id or not pem_path:
        return JsonResponse({"error": "GitHub App not configured on server"}, status=500)

    try:
        private_key = Path(pem_path).read_text()
    except Exception:
        return JsonResponse({"error": "GitHub App private key not found"}, status=500)

    # Generate App JWT
    now = int(_time.time())
    jwt_payload = {"iat": now - 30, "exp": now + 540, "iss": app_id}
    jwt_token = _jwt.encode(jwt_payload, private_key, algorithm="RS256")

    app_headers = {
        "Authorization": f"Bearer {jwt_token}",
        "Accept": "application/vnd.github+json",
    }

    # Fetch all installations of this GitHub App
    try:
        resp = http_requests.get(
            "https://api.github.com/app/installations",
            headers=app_headers,
            timeout=15,
        )
        resp.raise_for_status()
    except http_requests.RequestException as e:
        return JsonResponse({"error": f"Failed to reach GitHub API: {str(e)}"}, status=502)

    gh_installations = resp.json()
    synced = []

    for gh_inst in gh_installations:
        inst_id = str(gh_inst["id"])
        account = gh_inst.get("account", {})
        account_login = account.get("login", "")
        repo_selection = gh_inst.get("repository_selection", "all")

        # Only sync installations that belong to the current user (by GitHub login)
        if request.user.role != "admin" and account_login != profile.github_login:
            continue

        installation, created = Installation.objects.update_or_create(
            github_installation_id=inst_id,
            defaults={
                "account_login": account_login,
                "account_type": account.get("type", "User"),
                "account_id": str(account.get("id", "")),
                "account_avatar_url": account.get("avatar_url", ""),
                "repository_selection": repo_selection,
                "is_active": True,
            },
        )

        # Link to the user whose GitHub login matches the account
        if not installation.installed_by:
            matching_profile = UserProfile.objects.filter(github_login=account_login).first()
            if matching_profile:
                installation.installed_by = matching_profile.user
            else:
                installation.installed_by = request.user
            installation.save(update_fields=["installed_by"])

        # Sync repositories using installation access token
        try:
            token_resp = http_requests.post(
                f"https://api.github.com/app/installations/{inst_id}/access_tokens",
                headers=app_headers,
                timeout=15,
            )
            token_resp.raise_for_status()
            inst_token = token_resp.json()["token"]

            inst_headers = {
                "Authorization": f"Bearer {inst_token}",
                "Accept": "application/vnd.github+json",
            }
            repos_resp = http_requests.get(
                "https://api.github.com/installation/repositories",
                headers=inst_headers,
                timeout=15,
            )
            repos_resp.raise_for_status()
            gh_repos = repos_resp.json().get("repositories", [])

            for r in gh_repos:
                full_name = r.get("full_name", "")
                parts = full_name.split("/", 1)
                if len(parts) == 2:
                    Repository.objects.update_or_create(
                        owner_name=parts[0],
                        repo_name=parts[1],
                        defaults={
                            "github_repo_id": str(r.get("id", "")),
                            "github_installation_id": inst_id,
                            "installation": installation,
                            "connected_by": installation.installed_by or request.user,
                            "is_active": True,
                        },
                    )
        except Exception:
            pass  # Repos sync is best-effort

        synced.append({
            "id": installation.id,
            "account_login": installation.account_login,
            "repository_selection": repo_selection,
            "created": created,
        })

    return JsonResponse({"status": "synced", "installations": synced})


@csrf_exempt
@jwt_required
@require_POST
def uninstall_installation(request, installation_id):
    """Deactivate an installation locally and provide the GitHub URL to uninstall."""
    try:
        if request.user.role == "admin":
            inst = Installation.objects.get(id=installation_id, is_active=True)
        else:
            inst = Installation.objects.get(
                id=installation_id, installed_by=request.user, is_active=True
            )
    except Installation.DoesNotExist:
        return JsonResponse({"error": "Installation not found"}, status=404)

    # Deactivate locally
    inst.is_active = False
    inst.save(update_fields=["is_active"])

    # Deactivate associated repositories
    inst.repositories.filter(is_active=True).update(is_active=False)

    # Provide the GitHub URL where user can fully uninstall
    app_slug = getattr(settings, "GITHUB_APP_SLUG", "")
    github_url = f"https://github.com/settings/installations/{inst.github_installation_id}" if inst.github_installation_id else ""

    return JsonResponse({
        "status": "uninstalled",
        "github_uninstall_url": github_url,
    })


@jwt_required
@require_GET
def installation_configure_url(request, installation_id):
    """Return the GitHub URL to configure repository access for an installation."""
    try:
        if request.user.role == "admin":
            inst = Installation.objects.get(id=installation_id, is_active=True)
        else:
            inst = Installation.objects.get(
                id=installation_id, installed_by=request.user, is_active=True
            )
    except Installation.DoesNotExist:
        return JsonResponse({"error": "Installation not found"}, status=404)

    url = f"https://github.com/settings/installations/{inst.github_installation_id}"
    return JsonResponse({"url": url})

