import sys
from pathlib import Path

from core import confidence, review_result
from core.language_detector import detect_language
from analyzers.python.python_static_analyzer import analyze_python_file
from core.review_aggregator import aggregate_issues

from core.fix_extractor import extract_fixed_code
from core.exporter import export_fixed_file

from core.confidence_calculator import calculate_confidence
from core.result_envelope import ResultEnvelope

from ai.review_generator import generate_review
from ai.debug_generator import (
    generate_partial_debug,
    generate_full_debug,
)
from ai.debug_prompt_builder import (
    build_python_partial_debug_prompt,
    build_python_full_debug_prompt,
    build_llm_full_debug_prompt,
)

from core.review_result import (
    ReviewResult,
    PartialDebugResult,
    FullDebugResult,
)

from cli.reporter import (
    print_review,
    print_partial_debug,
    print_full_debug,
)

# File extensions that are supported for analysis
SUPPORTED_EXTENSIONS = {
    ".py",
    ".js",
    ".ts",
    ".java",
    ".c",
    ".cpp",
    ".cs",
    ".go",
    ".rs",
    ".php",
}

# Directories that must NEVER be scanned
IGNORED_DIRS = {
    "venv",
    "env",
    "__pycache__",
    ".git",
    "node_modules",
}


def main(path: str):
    root = Path(path)

    # Skip unsupported file types
    if root.is_file() and root.suffix.lower() not in SUPPORTED_EXTENSIONS:
        print(f"Skipping unsupported file type: {root.name}")
        return
    
    # =========================
    # Case 1: Single file input
    # =========================
    if root.is_file():
        lang = detect_language(str(root))
        code = root.read_text(encoding="utf-8", errors="ignore")

        # =========================
        # PYTHON: Full pipeline
        # =========================
        if lang == "python":
            issues = analyze_python_file(str(root))

            if not issues:
                print("No issues found.")
                return

            aggregated = aggregate_issues(issues)

            # ---- Review ----
            review_result = generate_review(
                aggregated,
                file=str(root),
                language="python",
                analysis_type="tool-backed",
            )
            print_review(review_result)

            # ---- Partial Debug (per issue) ----
            for issue in issues:
                partial_prompt = build_python_partial_debug_prompt(
                    code=code,
                    issue=issue,
                )

                partial_result = generate_partial_debug(
                    file=str(root),
                    tool=issue.tool,
                    issue_summary=issue.message,
                    prompt=partial_prompt,
                    language="python",
                )

                print_partial_debug(partial_result)

            # ---- Full Debug ----
            full_prompt = build_python_full_debug_prompt(
                code,
                aggregated,
            )

            full_result = generate_full_debug(
                file=str(root),
                prompt=full_prompt,
                language="python",
                analysis_type="tool-backed",
            )

            # Calculate confidence score for this analysis
            confidence = calculate_confidence(
            analysis_type=full_result.analysis_type,
            tools_used=["bandit", "flake8", "radon"],
            )

            enveloped = ResultEnvelope(
            result=full_result,
            confidence=confidence,
            )

            print_full_debug(enveloped)

            # full debug export (if safe code block found)
            fixed_code = extract_fixed_code(
                full_result.content,
                language="python",
            )

            if fixed_code:
                exported = export_fixed_file(
                    original_path=str(root),
                    fixed_code=fixed_code,
                    analysis_type=full_result.analysis_type,
                )

                print(f"\n✅ Fixed code exported to: {exported.fixed_file}")
            else:
                print("\n⚠️ No safe fixed code found. Export skipped.")




            return

        # =========================
        # NON-PYTHON: LLM-only
        # =========================
        print("⚠️  LLM-only analysis (no static analyzers available for this language)\n")

        # ---- Review (code-only) ----
        review_result = generate_review(
            {"code": code, "language": lang},
            file=str(root),
            language=lang,
            analysis_type="llm-only",
        )
        print_review(review_result)

        # ---- Full Debug (code-only) ----
        full_prompt = build_llm_full_debug_prompt(
            code,
            language=lang,
        )

        full_result = generate_full_debug(
            file=str(root),
            prompt=full_prompt,
            language=lang,
            analysis_type="llm-only",
        )

        # Calculate confidence score for this analysis
        confidence = calculate_confidence(
        analysis_type=review_result.analysis_type,
        )

        enveloped = ResultEnvelope(
        result=review_result,
        confidence=confidence,
        )

        print_full_debug(enveloped)

        # full debug export (if safe code block found)
        fixed_code = extract_fixed_code(
                full_result.content,
                language="python",
            )

        if fixed_code:
            exported = export_fixed_file(
            original_path=str(root),
            fixed_code=fixed_code,
            analysis_type=full_result.analysis_type,
        )

            print(f"\n✅ Fixed code exported to: {exported.fixed_file}")
        else:
            print("\n⚠️ No safe fixed code found. Export skipped.")
        
        return

    # =========================
    # Case 2: Directory input
    # (Review ONLY)
    # =========================
    for file in root.rglob("*"):
        if any(part in IGNORED_DIRS for part in file.parts):
            continue

        if not file.is_file():
            continue

        if file.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        lang = detect_language(str(file))
        code = file.read_text(encoding="utf-8", errors="ignore")

        # Python → analyzer-based review
        if lang == "python":
            issues = analyze_python_file(str(file))
            if not issues:
                continue

            aggregated = aggregate_issues(issues)
            review_text = generate_review(aggregated)

        # Other languages → LLM-only review
        else:
            review_text = generate_review(
                {"code": code, "language": lang}
            )

        review_result = ReviewResult(
            file=str(file),
            content=review_text,
        )
        print_review(review_result)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python cli.py <path>")
    else:
        main(sys.argv[1])
