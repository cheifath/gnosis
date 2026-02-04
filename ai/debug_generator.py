# ai/debug_generator.py

from ai.llm_client import run_llm
from core.review_result import PartialDebugResult, FullDebugResult


def generate_partial_debug(
    file: str,
    tool: str,
    issue_summary: str,
    prompt: str,
    *,
    language: str,
) -> PartialDebugResult:
    """
    Executes LLM for a single-issue (partial) debug prompt
    and returns a normalized PartialDebugResult.
    """
    content = run_llm(prompt)

    return PartialDebugResult(
        file=file,
        tool=tool,
        issue_summary=issue_summary,
        content=content,
        language=language,
        analysis_type="tool-backed",
    )


def generate_full_debug(
    file: str,
    prompt: str,
    *,
    language: str,
    analysis_type: str,
) -> FullDebugResult:
    """
    Executes LLM for a consolidated (full-file) debug prompt
    and returns a normalized FullDebugResult.
    """
    content = run_llm(prompt)

    return FullDebugResult(
        file=file,
        content=content,
        language=language,
        analysis_type=analysis_type,
    )
