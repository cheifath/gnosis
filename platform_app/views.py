from django.shortcuts import render
import json
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from integrations.github.auth import GitHubAppAuth
from integrations.github.pr_engine_runner import PullRequestEngineRunner
from integrations.github.pr_commenter import GitHubPRCommenter
from integrations.github.comment_formatter import format_pr_summary

from .models import WebhookEvent, AuditLog


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

    pr = payload["pull_request"]
    owner = payload["repository"]["owner"]["login"]
    repo = payload["repository"]["name"]
    pr_number = pr["number"]

    # Debugging: Print the PR information
    print(f"Processing PR #{pr_number} from {owner}/{repo}")

    try:
        # Initialize the GitHub App authentication object
        print("Initializing GitHub App Auth...")
        print(f"App ID: {settings.APP_ID}, Installation ID: {settings.INSTALLATION_ID}, PEM Path: {settings.PEM_PATH}")
        auth = GitHubAppAuth(
            app_id=settings.APP_ID,
            installation_id=settings.INSTALLATION_ID,
            private_key_path=settings.PEM_PATH,
        )

        headers = auth.get_auth_headers()

        runner = PullRequestEngineRunner(headers)
        result = runner.analyze_pr(owner, repo, pr_number)

        body = format_pr_summary(result)

        commenter = GitHubPRCommenter(headers)

        marker = "<!-- GNOSIS_PR_REVIEW -->"
        existing_comments = commenter.list_comments(owner, repo, pr_number)

        gnosis_comment = None
        for comment in existing_comments:
            if marker in comment["body"]:
                gnosis_comment = comment
                break

        if gnosis_comment:
            commenter.update_comment(owner, repo, gnosis_comment["id"], body)
        else:
            commenter.create_comment(owner, repo, pr_number, body)

    except Exception as e:
        # Log any exception to AuditLog
        print(f"Error processing PR: {e}")  # Print the error message
        AuditLog.objects.create(
            action_type="PR processing failed",
            actor=None,
            details={"error": str(e)}
        )
        return JsonResponse({"error": "Processing failed"}, status=500)

    return JsonResponse({"status": "processed"}, status=200)