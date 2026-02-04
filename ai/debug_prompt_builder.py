from core.issue_model import CodeIssue


def build_partial_debug_prompt(code: str, issue: CodeIssue) -> str:
    """
    Builds a prompt to explain and fix a single static analysis issue.
    This is educational and does NOT modify global state.
    """

    lines = []

    lines.append(
        "You are an expert software engineer.\n"
        "Analyze the following code and focus ONLY on the specific issue listed below.\n"
        "Explain why the issue occurs and suggest a fix.\n"
        "Do NOT refactor unrelated parts of the code.\n"
    )

    lines.append("Code:")
    lines.append("```python")
    lines.append(code)
    lines.append("```")

    location = f"Line {issue.line}" if issue.line else "Line N/A"

    lines.append("\nIssue:")
    lines.append(f"- Tool: {issue.tool}")
    lines.append(f"- Category: {issue.category}")
    lines.append(f"- Location: {location}")
    lines.append(f"- Message: {issue.message}")

    lines.append(
        "\nProvide:\n"
        "1. Why this issue occurs\n"
        "2. How it can be fixed\n"
        "3. An optional corrected snippet (only if needed)\n"
    )

    return "\n".join(lines)


def build_full_debug_prompt(code: str, aggregated_issues: dict) -> str:
    """
    Builds a prompt to generate a consolidated fix for all issues.
    This is a single authoritative debugging operation.
    """
    # CONTRACT GUARDS
    if not isinstance(code, str):
        raise TypeError("build_full_debug_prompt expects code as str")

    if not isinstance(aggregated_issues, dict):
        raise TypeError(
            "build_full_debug_prompt expects aggregated issues as dict "
            "(Python-only full debug)"
        )

    if not aggregated_issues:
        raise ValueError("build_full_debug_prompt received empty aggregated issues")

    lines = []

    lines.append(
        "You are a senior software engineer.\n"
        "The following code contains multiple issues detected by static analysis tools.\n"
        "Provide a consolidated fix strategy.\n"
        "You may refactor the code if necessary.\n"
    )

    lines.append("Code:")
    lines.append("```python")
    lines.append(code)
    lines.append("```")

    lines.append("\nIssues:")

    for tool, issues in aggregated_issues.items():
        lines.append(f"\n- Tool: {tool}")
        for issue in issues:
            lines.append(f"  - {issue}")

    lines.append(
        "\nProvide:\n"
        "1. Overall fix strategy\n"
        "2. Refactoring recommendations\n"
        "3. A corrected version of the code (if applicable)\n"
    )

    return "\n".join(lines)

# ai/debug_prompt_builder.py

def build_llm_only_full_debug_prompt(code: str, language: str) -> str:
    """
    Builds a full-debug prompt without static analysis (LLM-only).
    Used for non-Python languages.
    """

    return f"""
You are a senior software engineer.

The following code is written in {language}.
No static analysis tools were used.

Your task:
- Identify security vulnerabilities
- Identify logic or correctness issues
- Suggest a consolidated fix strategy
- You MAY refactor the code if needed

Be explicit when you are uncertain.

Code:
```{language}
{code}
"""

