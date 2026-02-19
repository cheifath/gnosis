import json
import subprocess
from core.issue_model import CodeIssue


ALLOWED_SEVERITIES = {"MEDIUM", "HIGH"}   # Policy rule


def run_bandit(file_path: str) -> list[CodeIssue]:
    result = subprocess.run(
        ["bandit", "-f", "json", file_path],
        capture_output=True,
        text=True
    )

    # Bandit returns:
    # 0 → no issues
    # 1 → issues found
    # 2 → internal error
    if result.returncode not in (0, 1):
        return []

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        return []

    issues = []

    for issue in data.get("results", []):
        severity = issue.get("issue_severity", "LOW").upper()

        # ✅ Only keep meaningful security issues
        if severity not in ALLOWED_SEVERITIES:
            continue

        issues.append(
            CodeIssue(
                file=file_path,
                tool="bandit",
                category="security",
                severity=severity.lower(),
                line=issue.get("line_number"),
                message=issue.get("issue_text")
            )
        )

    return issues
