from integrations.github.auth import GitHubAppAuth
from integrations.github.pr_engine_runner import PullRequestEngineRunner

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


if __name__ == "__main__":
    main()
