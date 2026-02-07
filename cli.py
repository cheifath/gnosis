import sys
import json
from pathlib import Path

from core.language_detector import detect_language
from analyzers.python.python_static_analyzer import analyze_python_file
from core.review_aggregator import aggregate_issues

from core.fix_extractor import extract_fixed_code
from core.exporter import export_fixed_file

from core.confidence_calculator import calculate_confidence
from core.result_envelope import ResultEnvelope
from core.execution_mode import ExecutionMode
from core.json_serializer import to_json

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

from cli.reporter import (
    print_review,
    print_partial_debug,
    print_full_debug,
)

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".ts", ".java", ".c", ".cpp",
    ".cs", ".go", ".rs", ".php",
}

IGNORED_DIRS = {
    "venv", "env", "__pycache__", ".git", "node_modules",
}


def parse_mode(args) -> ExecutionMode:
    if "--mode" not in args:
        return ExecutionMode.FULL_DEBUG
    idx = args.index("--mode")
    return ExecutionMode(args[idx + 1])


def main(path: str):
    mode = parse_mode(sys.argv)
    root = Path(path)

    json_results: list[ResultEnvelope] = []

    if root.is_file() and root.suffix.lower() not in SUPPORTED_EXTENSIONS:
        print(f"Skipping unsupported file type: {root.name}")
        return

    # ======================================================
    # SINGLE FILE
    # ======================================================
    if root.is_file():
        lang = detect_language(str(root))
        code = root.read_text(encoding="utf-8", errors="ignore")

        # =========================
        # PYTHON (tool-backed)
        # =========================
        if lang == "python":
            issues = analyze_python_file(str(root))
            if not issues:
                print("No issues found.")
                return

            aggregated = aggregate_issues(issues)

            # REVIEW ONLY
            if mode == ExecutionMode.REVIEW_ONLY:
                review = generate_review(
                    aggregated,
                    file=str(root),
                    language="python",
                    analysis_type="tool-backed",
                )
                conf = calculate_confidence(
                    analysis_type=review.analysis_type,
                    tools_used=["bandit", "flake8", "radon"],
                )
                env = ResultEnvelope(review, conf)

                if mode == ExecutionMode.JSON:
                    json_results.append(env)
                else:
                    print_review(env)
                return

            # DEBUG ONLY (partial)
            if mode == ExecutionMode.DEBUG_ONLY:
                for issue in issues:
                    prompt = build_python_partial_debug_prompt(code, issue)
                    result = generate_partial_debug(
                        file=str(root),
                        tool=issue.tool,
                        issue_summary=issue.message,
                        prompt=prompt,
                        language="python",
                    )
                    conf = calculate_confidence(
                        analysis_type=result.analysis_type,
                        tools_used=["bandit", "flake8", "radon"],
                    )
                    env = ResultEnvelope(result, conf)

                    if mode == ExecutionMode.JSON:
                        json_results.append(env)
                    else:
                        print_partial_debug(env)
                return

            # FULL DEBUG (default)
            review = generate_review(
                aggregated,
                file=str(root),
                language="python",
                analysis_type="tool-backed",
            )
            review_env = ResultEnvelope(
                review,
                calculate_confidence(
                    analysis_type=review.analysis_type,
                    tools_used=["bandit", "flake8", "radon"],
                ),
            )

            if mode == ExecutionMode.JSON:
                json_results.append(review_env)
            else:
                print_review(review_env)

            for issue in issues:
                prompt = build_python_partial_debug_prompt(code, issue)
                result = generate_partial_debug(
                    file=str(root),
                    tool=issue.tool,
                    issue_summary=issue.message,
                    prompt=prompt,
                    language="python",
                )
                env = ResultEnvelope(
                    result,
                    calculate_confidence(
                        analysis_type=result.analysis_type,
                        tools_used=["bandit", "flake8", "radon"],
                    ),
                )

                if mode == ExecutionMode.JSON:
                    json_results.append(env)
                else:
                    print_partial_debug(env)

            full_prompt = build_python_full_debug_prompt(code, aggregated)
            full = generate_full_debug(
                file=str(root),
                prompt=full_prompt,
                language="python",
                analysis_type="tool-backed",
            )
            full_conf = calculate_confidence(
                analysis_type=full.analysis_type,
                tools_used=["bandit", "flake8", "radon"],
            )
            full_env = ResultEnvelope(full, full_conf)

            if mode == ExecutionMode.JSON:
                json_results.append(full_env)
            else:
                print_full_debug(full_env)

            fixed_code = extract_fixed_code(full.content, language="python")
            if fixed_code:
                exported = export_fixed_file(
                    original_path=str(root),
                    fixed_code=fixed_code,
                    analysis_type=full.analysis_type,
                )
                print(f"\n✅ Fixed code exported to: {exported.fixed_file}")
            else:
                print("\n⚠️ No safe fixed code found. Export skipped.")

        # =========================
        # NON-PYTHON (LLM-only)
        # =========================
        else:
            print("⚠️  LLM-only analysis\n")

            if mode == ExecutionMode.REVIEW_ONLY:
                review = generate_review(
                    {"code": code, "language": lang},
                    file=str(root),
                    language=lang,
                    analysis_type="llm-only",
                )
                conf = calculate_confidence(
                    analysis_type=review.analysis_type,
                )
                env = ResultEnvelope(review, conf)

                if mode == ExecutionMode.JSON:
                    json_results.append(env)
                else:
                    print_review(env)
                return

            # FULL DEBUG (LLM-only)
            full_prompt = build_llm_full_debug_prompt(code, lang)
            full = generate_full_debug(
                file=str(root),
                prompt=full_prompt,
                language=lang,
                analysis_type="llm-only",
            )
            conf = calculate_confidence(
                analysis_type=full.analysis_type,
            )
            env = ResultEnvelope(full, conf)

            if mode == ExecutionMode.JSON:
                json_results.append(env)
            else:
                print_full_debug(env)

            # SAFE non-python export (gated)
            if conf.score >= 0.5:
                fixed_code = extract_fixed_code(full.content, language=lang)
                if fixed_code:
                    exported = export_fixed_file(
                        original_path=str(root),
                        fixed_code=fixed_code,
                        analysis_type=full.analysis_type,
                    )
                    print(f"\n⚠️ LLM-based fix exported to: {exported.fixed_file}")

        if mode == ExecutionMode.JSON:
            print(json.dumps(
                [to_json(r) for r in json_results],
                indent=2,
            ))
        return

    # ======================================================
    # DIRECTORY REVIEW (SAFE: review-only + json)
    # ======================================================
    if mode != ExecutionMode.REVIEW_ONLY:
        print("⚠️ Directory scan supports review-only mode only.")
        return

    for file in root.rglob("*"):
        if any(part in IGNORED_DIRS for part in file.parts):
            continue
        if not file.is_file():
            continue
        if file.suffix.lower() not in SUPPORTED_EXTENSIONS:
            continue

        lang = detect_language(str(file))
        code = file.read_text(encoding="utf-8", errors="ignore")

        if lang == "python":
            issues = analyze_python_file(str(file))
            if not issues:
                continue

            aggregated = aggregate_issues(issues)
            review = generate_review(
            aggregated,
            file=str(file),
            language="python",
            analysis_type="tool-backed",
            )
        else:
            review = generate_review(
                {"code": code, "language": lang},
                file=str(file),
                language=lang,
                analysis_type="llm-only",
            )

        conf = calculate_confidence(
            analysis_type=review.analysis_type,
        )

        env = ResultEnvelope(review, conf)

        if mode == ExecutionMode.JSON:
            json_results.append(env)
        else:
            print_review(env)

    if mode == ExecutionMode.JSON:
        print(json.dumps(
            [to_json(r) for r in json_results],
            indent=2,
        ))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python cli.py <path> [--mode <mode>]")
    else:
        main(sys.argv[1])
