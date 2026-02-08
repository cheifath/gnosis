import base64
import requests
from typing import List, Dict

from core.language_detector import detect_language

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".java", ".c", ".cpp",
    ".cs", ".go", ".rs", ".php",
}

MAX_FILE_SIZE = 200_000  # ~200 KB safety limit


class GitHubPRFetcher:
    def __init__(self, auth_headers: dict):
        self.headers = {
            **auth_headers,
            "Accept": "application/vnd.github+json",
        }
        self.api_base = "https://api.github.com"


    def fetch_changed_files(
        self,
        owner: str,
        repo: str,
        pr_number: int,
    ) -> List[Dict]:
        pr_sha = self._get_pr_head_sha(owner, repo, pr_number)
        if not pr_sha:
            return []

        files = []
        page = 1

        while True:
            files_url = (
                f"{self.api_base}/repos/{owner}/{repo}/pulls/"
                f"{pr_number}/files"
            )

            response = requests.get(
                files_url,
                headers=self.headers,
                params={"per_page": 100, "page": page},
            )
            response.raise_for_status()

            pr_files = response.json()
            if not pr_files:
                break

            for f in pr_files:
                if f["status"] == "removed":
                    continue

                filename = f["filename"]

                if not any(filename.endswith(ext) for ext in SUPPORTED_EXTENSIONS):
                    continue

                if f.get("size", 0) > MAX_FILE_SIZE:
                    continue

                content = self._fetch_file_content(
                    owner,
                    repo,
                    filename,
                    ref=pr_sha,
                )

                if not content:
                    continue

                files.append({
                    "filename": filename,
                    "content": content,
                    "language": detect_language(filename),
                })

            page += 1

        return files

    def _get_pr_head_sha(self, owner: str, repo: str, pr_number: int) -> str | None:
        url = f"{self.api_base}/repos/{owner}/{repo}/pulls/{pr_number}"

        response = requests.get(url, headers=self.headers)

        if response.status_code == 404:
            return None
        
        if response.status_code == 403:
            raise PermissionError("GitHub App lacks access")

        response.raise_for_status()
        return response.json()["head"]["sha"]


    def _fetch_file_content(
        self,
        owner: str,
        repo: str,
        path: str,
        ref: str,
    ) -> str | None:
        url = (
            f"{self.api_base}/repos/{owner}/{repo}/contents/{path}"
        )

        response = requests.get(
            url,
            headers=self.headers,
            params={"ref": ref},
        )

        if response.status_code != 200:
            return None

        data = response.json()

        if data.get("encoding") != "base64":
            return None

        try:
            return base64.b64decode(data["content"]).decode(
                "utf-8",
                errors="ignore",
            )
        except Exception:
            return None
