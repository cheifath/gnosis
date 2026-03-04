from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from integrations.github.auth import GitHubAppAuth
from integrations.github.pr_engine_runner import PullRequestEngineRunner
from integrations.github.pr_commenter import GitHubPRCommenter
from integrations.github.comment_formatter import format_pr_summary

# Models for persistence
from .models import WebhookEvent, AuditLog, PullRequest, PullRequestFile, Issue, Review, Confidence, Fix, Repository

from django.views.decorators.http import require_GET
from .models import PullRequest

from django.http import HttpResponse

import zipfile
import io

from integrations.github.check_runner import GitHubCheckRunner

from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

# Models for persistence
from .models import WebhookEvent, AuditLog
from platform_app.tasks import process_pr_task  # Import the Celery task

@csrf_exempt
def github_webhook(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)

    try:
        payload = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    action = payload.get("action")

    # Debugging: Print the incoming action
    print(f"Received action: {action}")

    # Save webhook event
    WebhookEvent.objects.create(
        event_type=action,
        payload=payload
    )

    AuditLog.objects.create(
        action_type=f"PR {action} triggered",
        actor=None,
        details=payload
    )

    if action not in ["opened", "synchronize"]:
        return JsonResponse({"status": "ignored"}, status=200)

    # Trigger the Celery task for processing PR asynchronously
    process_pr_task.delay(payload)

    return JsonResponse({"status": "queued for processing"}, status=200)

@require_GET
def get_repository_details(request, repo_id):
    try:
        repo = Repository.objects.get(id=repo_id)
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
        "installation_id": repo.installation_id,
        "prs": pr_data,
    })

@require_GET
def list_repositories(request):
    repos = Repository.objects.all().order_by("-created_at")

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

@require_GET
def download_all_fixes(request, pr_id):
    try:
        pr = PullRequest.objects.get(id=pr_id)
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

@require_GET
def export_pr_json(request, pr_id):
    try:
        pr = PullRequest.objects.get(id=pr_id)
    except PullRequest.DoesNotExist:
        return JsonResponse({"error": "PR not found"}, status=404)

    return JsonResponse({
        "id": pr.id,
        "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
        "pr_number": pr.github_pr_number,
        "status": pr.processed_status,
        "created_at": pr.created_at,
    })

@require_GET
def download_fix(request, file_id):
    try:
        file = PullRequestFile.objects.get(id=file_id)
        review = file.review
        fix = review.fix
    except Exception:
        return JsonResponse({"error": "Fix not found"}, status=404)

    response = HttpResponse(fix.fixed_code, content_type="text/plain")
    response["Content-Disposition"] = f'attachment; filename="{file.filename}"'
    return response

@require_GET
def get_pr_details(request, pr_id):
    try:
        pr = PullRequest.objects.select_related("repository").get(id=pr_id)
    except PullRequest.DoesNotExist:
        return JsonResponse({"error": "PR not found"}, status=404)

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

        files_data.append({
            "filename": file.filename,
            "analysis_type": file.analysis_type,
            "issues": issues,
            "review": review.summary_text if review else None,
            "full_debug": review.full_debug_text if review else None,
            "confidence": confidence.score if confidence else None,
            "fix_available": bool(fix),
        })

    return JsonResponse({
        "repository": f"{pr.repository.owner_name}/{pr.repository.repo_name}",
        "pr_number": pr.github_pr_number,
        "title": pr.title,
        "author": pr.author,
        "status": pr.processed_status,
        "files": files_data,
    })

@require_GET
def list_pull_requests(request):
    prs = PullRequest.objects.select_related("repository").all().order_by("-created_at")

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

