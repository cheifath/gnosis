from celery import shared_task
from django.conf import settings
from integrations.github.auth import GitHubAppAuth
from integrations.github.pr_engine_runner import PullRequestEngineRunner
from integrations.github.pr_commenter import GitHubPRCommenter
from integrations.github.check_runner import GitHubCheckRunner
from integrations.github.comment_formatter import format_pr_summary
from platform_app.models import PullRequest, PullRequestFile, Issue, Review, Confidence, Fix, Repository


@shared_task
def process_pr_task(payload):

    action = payload.get("action")

    if action not in ["opened", "synchronize"]:
        return

    pr = payload["pull_request"]
    owner = payload["repository"]["owner"]["login"]
    repo = payload["repository"]["name"]
    pr_number = pr["number"]

    try:

        # GitHub App Authentication
        auth = GitHubAppAuth(
            app_id=settings.APP_ID,
            installation_id=settings.INSTALLATION_ID,
            private_key_path=settings.PEM_PATH,
        )

        headers = auth.get_auth_headers()

        # Initialize the PR Engine Runner
        runner = PullRequestEngineRunner(headers)
        result = runner.analyze_pr(owner, repo, pr_number)

        # --------------------------------------------
        # Handle PR Comment (Prevent Duplication)
        # --------------------------------------------
        body = format_pr_summary(result)

        commenter = GitHubPRCommenter(headers)

        existing_comments = commenter.list_comments(owner, repo, pr_number)

        gnosis_comment = None

        for comment in existing_comments:
            if "<!-- GNOSIS_PR_REVIEW -->" in comment["body"]:
                gnosis_comment = comment
                break

        if gnosis_comment:
            commenter.update_comment(
                owner,
                repo,
                gnosis_comment["id"],
                body
            )
        else:
            commenter.create_comment(
                owner,
                repo,
                pr_number,
                body
            )

        # --------------------------------------------
        # Create check run
        # --------------------------------------------

        check_runner = GitHubCheckRunner(headers)

        has_critical = False
        for f in result["files"]:
            if f.get("issues"):
                has_critical = True
                break

        conclusion = "failure" if has_critical else "success"
        summary = f"Analyzed {len(result['files'])} files."

        check_runner.create_check_run(
            owner=owner,
            repo=repo,
            commit_sha=pr["head"]["sha"],
            conclusion=conclusion,
            summary=summary,
        )

        # =========================
        # Persist Repository
        # =========================

        repository_obj, _ = Repository.objects.update_or_create(
            owner_name=owner,
            repo_name=repo,
            defaults={
                "github_repo_id": payload["repository"]["id"],
                "installation_id": payload["installation"]["id"],
                "connected_by": None,
            }
        )

        # =========================
        # Persist Pull Request
        # =========================

        pull_request_obj, _ = PullRequest.objects.update_or_create(
            repository=repository_obj,
            github_pr_number=pr_number,
            defaults={
                "github_pr_id": pr["id"],
                "title": pr["title"],
                "author": pr["user"]["login"],
                "state": pr["state"],
                "commit_sha": pr["head"]["sha"],
                "processed_status": "processing",
            }
        )

        pull_request_obj.files.all().delete()

        # =========================
        # Persist Files + Issues
        # =========================

        for file_result in result["files"]:

            pr_file = PullRequestFile.objects.create(
                pull_request=pull_request_obj,
                filename=file_result["filename"],
                language=file_result.get("language", ""),
                file_path=file_result["filename"],
                analysis_type="tool-backed" if "issues" in file_result else "llm-only",
            )

            # Save Issues
            if "issues" in file_result:
                for issue in file_result["issues"]:
                    Issue.objects.create(
                        pr_file=pr_file,
                        tool=issue.tool,
                        category=issue.category,
                        severity=issue.severity,
                        line_number=issue.line,
                        message=issue.message,
                    )

            # Save Review
            review_obj = Review.objects.create(
                pr_file=pr_file,
                summary_text=file_result.get("review", ""),
                full_debug_text=file_result.get("full_debug", ""),
                generated_by="tool-backed" if "issues" in file_result else "llm-only",
            )

            # Save Confidence
            Confidence.objects.create(
                review=review_obj,
                score=file_result.get("confidence", 0),
                level="high" if file_result.get("confidence", 0) >= 0.8 else "medium",
                rationale="Auto-calculated",
            )

            # Save Fix
            if file_result.get("fixed_code"):
                Fix.objects.create(
                    review=review_obj,
                    fixed_code=file_result["fixed_code"],
                    is_applied=False,
                )

        # =========================
        # COMPLETED STATUS
        # =========================

        pull_request_obj.processed_status = "completed"
        pull_request_obj.save()

    except Exception as e:

        print("PR processing failed:", str(e))

        try:
            pull_request_obj.processed_status = "failed"
            pull_request_obj.save()
        except:
            pass

        raise