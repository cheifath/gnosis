from ai.llm_client import run_llm
from ai.review_prompt_builder import (
    build_review_prompt,
    build_llm_only_review_prompt,
)

def generate_review(review_data) -> str:
    """
    Generates a human-readable code review using an LLM.

    review_data can be:
    - Aggregated issues (dict)  → static-analysis-based review
    - Raw code (str)            → LLM-only review
    """

    # 🔹 Case 1: Tool-based (Python)
    if isinstance(review_data, dict) and "code" not in review_data:
        prompt = build_review_prompt(review_data)

    # 🔹 Case 2: LLM-only (non-Python)
    else:
        prompt = build_llm_only_review_prompt(review_data)

    return run_llm(prompt)

