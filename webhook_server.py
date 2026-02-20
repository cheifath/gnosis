from flask import Flask, request
from integrations.github.auth import GitHubAppAuth
from integrations.github.pr_engine_runner import PullRequestEngineRunner
from integrations.github.pr_commenter import GitHubPRCommenter
from integrations.github.comment_formatter import format_pr_summary

app = Flask(__name__)

# ----------------------------
# CONFIG
# ----------------------------
APP_ID = "2814959"
INSTALLATION_ID = "108587429"
PEM_PATH = "scripts/gnosis-pr-reviewer.2026-02-07.private-key.pem"


@app.route("/webhook", methods=["POST"])
def webhook():
    payload = request.json

    if payload.get("action") not in ["opened", "synchronize"]:
        return "Ignored", 200

    pr = payload["pull_request"]
    owner = payload["repository"]["owner"]["login"]
    repo = payload["repository"]["name"]
    pr_number = pr["number"]

    print(f"Processing PR #{pr_number} from {owner}/{repo}")

    # Authenticate
    auth = GitHubAppAuth(
        app_id=APP_ID,
        installation_id=INSTALLATION_ID,
        private_key_path=PEM_PATH,
    )

    headers = auth.get_auth_headers()

    # Run engine
    runner = PullRequestEngineRunner(headers)
    result = runner.analyze_pr(owner, repo, pr_number)

    # Format comment
    body = format_pr_summary(result)

    # Post or update comment
    commenter = GitHubPRCommenter(headers)

    marker = "<!-- GNOSIS_PR_REVIEW -->"
    existing_comments = commenter.list_comments(owner, repo, pr_number)

    gnosis_comment = None
    for comment in existing_comments:
        if marker in comment["body"]:
            gnosis_comment = comment
            break

    if gnosis_comment:
        commenter.update_comment(
            owner,
            repo,
            gnosis_comment["id"],
            body,
        )
        print("Updated existing comment")
    else:
        commenter.create_comment(
            owner,
            repo,
            pr_number,
            body,
        )
        print("Created new comment")

    return "Processed", 200


if __name__ == "__main__":
    app.run(port=5000)