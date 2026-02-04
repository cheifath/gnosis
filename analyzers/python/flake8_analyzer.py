import subprocess
from core.issue_model import CodeIssue

def run_flake8(file_path: str) -> list[CodeIssue]:
    result = subprocess.run(
        ["flake8", file_path],
        capture_output=True,
        text=True
    )

    issues = []

    for line in result.stdout.splitlines():
        parts = line.split(":", maxsplit=3)
        if len(parts) < 4:
            continue

        _, line_no, _, message = parts

        issues.append(
            CodeIssue(
                file=file_path,
                tool="flake8",
                category="style",
                severity="low",
                line=int(line_no),
                message=message.strip()
            )
        )

    return issues
