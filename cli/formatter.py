def format_review(result) -> str:
    return (
        f"\n=== Code Review ===\n"
        f"File: {result.file}\n\n"
        f"{result.content}\n"
    )


def format_partial_debug(result) -> str:
    return (
        f"\n=== Partial Debug ===\n"
        f"File: {result.file}\n"
        f"Tool: {result.tool}\n"
        f"Issue: {result.issue_summary}\n\n"
        f"{result.content}\n"
    )


def format_full_debug(result) -> str:
    return (
        f"\n=== Full Debug ===\n"
        f"File: {result.file}\n\n"
        f"{result.content}\n"
    )
