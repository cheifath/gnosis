import subprocess
from core.issue_model import CodeIssue

def run_radon(file_path: str) -> list[CodeIssue]:
    result = subprocess.run(
        ["radon", "cc", "-s", file_path],
        capture_output=True,
        text=True
    )

    issues = []

    for line in result.stdout.splitlines():
        if " - " not in line:
            continue

        parts = line.split(" - ")
        location, complexity = parts[0], parts[1]

        issues.append(
            CodeIssue(
                file=file_path,
                tool="radon",
                category="complexity",
                severity="medium",
                line=None,
                message=f"High cyclomatic complexity: {complexity}"
            )
        )

    return issues
