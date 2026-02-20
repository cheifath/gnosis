import requests


class GitHubPRCommenter:
    def __init__(self, auth_headers: dict):
        self.headers = auth_headers
        self.api_base = "https://api.github.com"

    # -------------------------------------------------
    # List all comments on a PR
    # -------------------------------------------------
    def list_comments(self, owner: str, repo: str, pr_number: int):
        url = f"{self.api_base}/repos/{owner}/{repo}/issues/{pr_number}/comments"

        response = requests.get(
            url,
            headers=self.headers,
        )
        response.raise_for_status()
        return response.json()

    # -------------------------------------------------
    # Create new comment
    # -------------------------------------------------
    def create_comment(
        self,
        owner: str,
        repo: str,
        pr_number: int,
        body: str,
    ):
        url = f"{self.api_base}/repos/{owner}/{repo}/issues/{pr_number}/comments"

        response = requests.post(
            url,
            headers=self.headers,
            json={"body": body},
        )
        response.raise_for_status()
        return response.json()

    # -------------------------------------------------
    # Update existing comment
    # -------------------------------------------------
    def update_comment(
        self,
        owner: str,
        repo: str,
        comment_id: int,
        body: str,
    ):
        url = f"{self.api_base}/repos/{owner}/{repo}/issues/comments/{comment_id}"

        response = requests.patch(
            url,
            headers=self.headers,
            json={"body": body},
        )
        response.raise_for_status()
        return response.json()
    
    def create_inline_comment(
    self,
    owner: str,
    repo: str,
    pr_number: int,
    body: str,
    commit_id: str,
    path: str,
    line: int,
    ):
        url = f"{self.api_base}/repos/{owner}/{repo}/pulls/{pr_number}/comments"

        payload = {
            "body": body,
            "commit_id": commit_id,
            "path": path,
            "line": line,
            "side": "RIGHT",
        }

        response = requests.post(
            url,
            headers=self.headers,
            json=payload,
        )

        response.raise_for_status()
        return response.json()

