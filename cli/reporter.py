# from core import confidence
from core.review_result import ReviewResult
from core.review_result import PartialDebugResult
from core.review_result import FullDebugResult
from core.result_envelope import ResultEnvelope
from core.confidence import ConfidenceScore
from cli.formatter import (
    format_review,
    format_partial_debug,
    format_full_debug,
)


def print_review(result: ReviewResult) -> None:
    print("=" * 80)
    print(f"📄 File: {result.file}")
    print(f"🌐 Language: {result.language}")
    print(f"🧠 Analysis: {result.analysis_type}")
    print("-" * 80)
    print(result.content.strip())
    print("=" * 80)



def print_partial_debug(result: PartialDebugResult) -> None:
    print("=" * 80)
    print(f"📄 File: {result.file}")
    print(f"🔧 Tool: {result.tool}")
    print(f"🌐 Language: {result.language}")
    print(f"🧠 Analysis: {result.analysis_type}")
    print(f"📝 Issue: {result.issue_summary}")
    print("-" * 80)
    print(result.content.strip())
    print("=" * 80)



def print_full_debug(enveloped: ResultEnvelope[FullDebugResult]) -> None:
    result = enveloped.result
    confidence = enveloped.confidence

    print("=" * 80)
    print(f"📄 File: {result.file}")
    print(f"🌐 Language: {result.language}")
    print(f"🧠 Analysis: {result.analysis_type}")
    print("-" * 80)
    print(result.content.strip())
    print("=" * 80)
    print(f"🔐 Confidence: {confidence.level.upper()} ({confidence.score})")
    print(f"ℹ️  {confidence.rationale}")




