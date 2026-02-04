from collections import defaultdict
from core.issue_model import CodeIssue

def aggregate_issues(issues: list[CodeIssue]) -> dict:
    """
    Groups issues by file and category.
    """
    review = defaultdict(lambda: defaultdict(list))

    for issue in issues:
        review[issue.file][issue.category].append(issue)

    return dict(review)
    