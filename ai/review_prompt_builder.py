from core.issue_model import CodeIssue


def build_review_prompt(review: dict) -> str:
    """
    Builds a structured review prompt from aggregated static analysis issues.
    This prompt is used ONLY for review and summarisation (no debugging).
    """

    lines = []

    lines.append(
        "You are a senior software engineer performing a code review.\n"
        "Below are issues detected by static analysis tools.\n"
        "Explain the issues, prioritize them, and give high-level improvement suggestions.\n"
    )

    for file, categories in review.items():
        lines.append(f"File: {file}")

        for category, issues in categories.items():
            lines.append(f"  {category.upper()} ISSUES:")

            for issue in issues:
                location = f"Line {issue.line}" if issue.line else "Line N/A"
                lines.append(f"    - {location}: {issue.message}")

        lines.append("")

    lines.append(
        "Do not rewrite the code. Do not provide patched code.\n"
        "Focus only on explanation, severity, and improvement guidance."
    )

    return "\n".join(lines)


def build_llm_only_review_prompt(data) -> str:
    """
    Builds a generic LLM-only code review prompt
    for non-Python or unsupported languages.
    """

    code = data["code"]
    language = data.get("language", "unknown")

    return f"""
You are an expert software engineer.

The following code is written in {language}.
No static analysis tools were used.

Analyze the code purely by reasoning and provide:

1. Security issues (if any)
2. Logic or correctness problems
3. Maintainability and readability feedback
4. Best-practice improvements

Be explicit when you are uncertain.

Code:
```{language}
{code}
"""