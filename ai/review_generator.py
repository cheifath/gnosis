from ai.llm_client import run_llm
from ai.review_prompt_builder import (
    build_python_review_prompt,
    build_llm_review_prompt,
)
from core.review_result import ReviewResult

def generate_review(
    review_data: dict,
    *,
    file: str,
    language: str,
    analysis_type: str,
) -> ReviewResult:
    """
    Generates a human-readable code review using an LLM.

    Contracts:
    - Python: review_data = aggregated issues (dict), analysis_type="tool-backed"
    - Non-Python: review_data = {code, language}, analysis_type="llm-only"
    """

    # 🔒 CONTRACT GUARD
    if not isinstance(review_data, dict):
        raise TypeError(
            "generate_review expects dict input. "
            "Python: aggregated issues. Non-Python: {code, language}."
        )

    # 🔹 Python (tool-backed)
    if analysis_type == "tool-backed":
        prompt = build_python_review_prompt(review_data)

    # 🔹 Non-Python (LLM-only)
    else:
        prompt = build_llm_review_prompt(review_data)

    content = run_llm(prompt)

    return ReviewResult(
        file=file,
        content=content,
        language=language,
        analysis_type=analysis_type,
    )


