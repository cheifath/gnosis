import time
import jwt
import requests
from pathlib import Path


class GitHubAppAuth:
    def __init__(
        self,
        app_id: str,
        installation_id: str,
        private_key_path: str,
    ):
        self.app_id = app_id
        self.installation_id = installation_id
        self.private_key = Path(private_key_path).read_text()
        self.api_base = "https://api.github.com"

    def _generate_jwt(self) -> str:
        now = int(time.time())
        payload = {
            "iat": now - 60,
            "exp": now + 600,
            "iss": self.app_id,
        }
        return jwt.encode(payload, self.private_key, algorithm="RS256")

    def _get_installation_token(self) -> str:
        jwt_token = self._generate_jwt()

        headers = {
            "Authorization": f"Bearer {jwt_token}",
            "Accept": "application/vnd.github+json",
        }

        url = (
            f"{self.api_base}/app/installations/"
            f"{self.installation_id}/access_tokens"
        )

        response = requests.post(url, headers=headers)
        response.raise_for_status()

        return response.json()["token"]

    def get_auth_headers(self) -> dict:
        token = self._get_installation_token()
        return {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
        }
