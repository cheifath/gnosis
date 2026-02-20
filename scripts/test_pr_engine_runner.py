from unittest import result
from integrations.github import auth
from integrations.github.auth import GitHubAppAuth
from integrations.github.comment_formatter import format_pr_summary
from integrations.github.pr_commenter import GitHubPRCommenter
from integrations.github.pr_engine_runner import PullRequestEngineRunner

from integrations.github.pr_commenter import GitHubPRCommenter
from integrations.github.comment_formatter import format_pr_summary

# ----------------------------
# CONFIG
# ----------------------------
APP_ID = "2814959"
INSTALLATION_ID = "108587429"
PEM_PATH = "scripts/gnosis-pr-reviewer.2026-02-07.private-key.pem"

OWNER = "cheifath"
REPO = "TestFiles"
PR_NUMBER = 1


def main():
    auth = GitHubAppAuth(
        app_id=APP_ID,
        installation_id=INSTALLATION_ID,
        private_key_path=PEM_PATH,
    )

    headers = auth.get_auth_headers()

    runner = PullRequestEngineRunner(headers)

    result = runner.analyze_pr(
        owner=OWNER,
        repo=REPO,
        pr_number=PR_NUMBER,
    )

   
    commenter = GitHubPRCommenter(auth.get_auth_headers())

    body = format_pr_summary(result)

    marker = "<!-- GNOSIS_PR_REVIEW -->"

    existing_comments = commenter.list_comments(OWNER, REPO, PR_NUMBER)

    gnosis_comment = None
    for comment in existing_comments:
        if marker in comment["body"]:
            gnosis_comment = comment
            break

    if gnosis_comment:
        commenter.update_comment(
            OWNER,
            REPO,
            gnosis_comment["id"],
            body,
        )
    else:
        commenter.create_comment(
            OWNER,
            REPO,
            PR_NUMBER,
            body,
        )


    print("✅ Comment posted to PR")


    print("\n============================")
    print("PR ANALYSIS RESULT")
    print("============================\n")

    print(f"PR #: {result['pr_number']}")
    print(f"Files analyzed: {len(result['files'])}\n")

    for file_result in result["files"]:
        print("-----")
        print("File:", file_result["filename"])
        print("Confidence:", file_result["confidence"])
        print("Has Fix:", bool(file_result["fixed_code"]))
        print("Review Preview:",
              (file_result["review"] or "")[:150])
        print("-----\n")

    pr_details = runner.fetcher.get_pr_details(OWNER, REPO, PR_NUMBER)
    commit_id = pr_details["head"]["sha"]

    for file_result in result["files"]:
        for issue in file_result.get("issues", []):
            if issue.line:
                commenter.create_inline_comment(
                    OWNER,
                    REPO,
                    PR_NUMBER,
                    body=f"🔎 {issue.message}",
                    commit_id=commit_id,
                    path=file_result["filename"],
                    line=issue.line,
                )




if __name__ == "__main__":
    main()
