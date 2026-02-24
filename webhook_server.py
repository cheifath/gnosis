from flask import Flask, request
from integrations.github.auth import GitHubAppAuth
from integrations.github.pr_engine_runner import PullRequestEngineRunner
from integrations.github.pr_commenter import GitHubPRCommenter
from integrations.github.comment_formatter import format_pr_summary
from integrations.github.job_queue import job_queue

app = Flask(__name__)

# ----------------------------
# CONFIG
# ----------------------------
import os
from dotenv import load_dotenv

load_dotenv()

APP_ID = os.getenv("APP_ID")
INSTALLATION_ID = os.getenv("INSTALLATION_ID")
PEM_PATH = os.getenv("PEM_PATH")



# ----------------------------
# Background Worker Function
# ----------------------------
def process_pr(owner, repo, pr_number):
    print(f"[Worker] Processing PR #{pr_number} from {owner}/{repo}")

    try:
        auth = GitHubAppAuth(
            app_id=APP_ID,
            installation_id=INSTALLATION_ID,
            private_key_path=PEM_PATH,
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
            commenter.update_comment(
                owner,
                repo,
                gnosis_comment["id"],
                body,
            )
            print("[Worker] Updated existing comment")
        else:
            commenter.create_comment(
                owner,
                repo,
                pr_number,
                body,
            )
            print("[Worker] Created new comment")

    except Exception as e:
        print("[Worker] Error processing PR:", e)


# ----------------------------
# Webhook Route
# ----------------------------
@app.route("/webhook", methods=["POST"])
def webhook():
    payload = request.json

    if payload.get("action") not in ["opened", "synchronize"]:
        return "Ignored", 200

    pr = payload["pull_request"]
    owner = payload["repository"]["owner"]["login"]
    repo = payload["repository"]["name"]
    pr_number = pr["number"]

    print(f"[Webhook] Enqueuing PR #{pr_number}")

    # 🔥 Enqueue background job
    job_queue.enqueue(process_pr, owner, repo, pr_number)

    # Immediately return
    return "Queued", 200


if __name__ == "__main__":
    app.run(port=5000)