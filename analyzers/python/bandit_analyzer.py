import json
import subprocess
from core.issue_model import CodeIssue

def run_bandit(file_path: str) -> list[CodeIssue]:
    result = subprocess.run(
        ["bandit", "-f", "json", file_path],
        capture_output=True,
        text=True
    )

    if result.returncode not in (0, 1):
        return []

    data = json.loads(result.stdout)
    issues = []

    for issue in data.get("results", []):
        issues.append(
            CodeIssue(
                file=file_path,
                tool="bandit",
                category="security",
                severity=issue.get("issue_severity", "LOW").lower(),
                line=issue.get("line_number"),
                message=issue.get("issue_text")
            )
        )

    return issues
