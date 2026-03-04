import requests

class GitHubCheckRunner:
    def __init__(self, headers):
        # Ensure correct headers
        self.headers = {
            **headers,
            "Accept": "application/vnd.github+json"
        }

    def create_check_run(self, owner, repo, commit_sha, conclusion, summary):
        url = f"https://api.github.com/repos/{owner}/{repo}/check-runs"

        payload = {
            "name": "GNOSIS AI Review",
            "head_sha": commit_sha,
            "status": "completed",
            "conclusion": conclusion,
            "output": {
                "title": "GNOSIS Analysis Result",
                "summary": summary,
            },
        }

        response = requests.post(url, headers=self.headers, json=payload)

        print("CHECK RUN STATUS:", response.status_code)
        print("CHECK RUN RESPONSE:", response.text)

        return response.status_code, response.text