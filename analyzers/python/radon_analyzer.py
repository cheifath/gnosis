import subprocess
from core.issue_model import CodeIssue


GRADE_MAP = {
    "A": 1,
    "B": 2,
    "C": 3,
    "D": 4,
    "E": 5,
    "F": 6,
}

MIN_COMPLEXITY_GRADE = "C"   # Policy threshold


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

        # Example complexity string:
        # "A (1)"
        grade = complexity.strip()[0]

        # ✅ Only keep meaningful complexity issues
        if GRADE_MAP.get(grade, 0) < GRADE_MAP[MIN_COMPLEXITY_GRADE]:
            continue

        issues.append(
            CodeIssue(
                file=file_path,
                tool="radon",
                category="complexity",
                severity="medium",
                line=None,
                message=f"Cyclomatic complexity too high: {complexity.strip()}"
            )
        )

    return issues

