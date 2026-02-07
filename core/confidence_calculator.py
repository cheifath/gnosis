from core.confidence import ConfidenceScore

def calculate_confidence(
    *,
    analysis_type: str,
    tools_used: list[str] | None = None,
) -> ConfidenceScore:

    tools_used = tools_used or []

    # 🔵 Tool-backed analysis
    if analysis_type == "tool-backed":
        return ConfidenceScore(
            level="high",
            score=0.85,
            rationale=(
                "Findings are based on static analysis tools "
                f"({', '.join(tools_used)}) with LLM-assisted explanation."
            ),
        )

    # 🟡 LLM-only analysis
    return ConfidenceScore(
        level="medium",
        score=0.55,
        rationale=(
            "Findings are based solely on LLM reasoning "
            "without static analysis verification."
        ),
    )
