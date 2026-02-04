from analyzers.python.bandit_analyzer import run_bandit
from analyzers.python.flake8_analyzer import run_flake8
from analyzers.python.radon_analyzer import run_radon
from core.issue_model import CodeIssue

def analyze_python_file(file_path: str) -> list[CodeIssue]:
    issues: list[CodeIssue] = []

    issues.extend(run_bandit(file_path))
    issues.extend(run_flake8(file_path))
    issues.extend(run_radon(file_path))

    return issues
