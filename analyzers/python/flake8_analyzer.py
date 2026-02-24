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
        try:
            # Split from the RIGHT to avoid breaking Windows paths
            path_part, line_no, col_no, rest = line.rsplit(":", 3)
        except ValueError:
            continue

        message = rest.strip()

        # Extract error code (first token)
        code = message.split()[0]

        # ✅ Keep only serious errors
        if not (code.startswith("F") or code.startswith("E9")):
            continue

        issues.append(
            CodeIssue(
                file=file_path,
                tool="flake8",
                category="syntax",
                severity="high",
                line=int(line_no),
                message=message
            )
        )

    return issues
