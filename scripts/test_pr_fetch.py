from integrations.github.auth import GitHubAppAuth
from integrations.github.pr_fetcher import GitHubPRFetcher

auth = GitHubAppAuth(
    app_id="2814959",
    installation_id="108587429",
    private_key_path="scripts/gnosis-pr-reviewer.2026-02-07.private-key.pem",
)

headers = auth.get_auth_headers()
fetcher = GitHubPRFetcher(headers)

files = fetcher.fetch_changed_files(
    owner="cheifath",
    repo="TestFiles",
    pr_number=1,
)

if not files:
    print("⚠️ No PR found, no access, or no supported files")
    exit(0)

for f in files:
    print(f["filename"], f["language"], len(f["content"]))
