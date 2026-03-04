from typing import Dict, List
import tempfile
from pathlib import Path
import os
from integrations.github.pr_fetcher import GitHubPRFetcher
from analyzers.python.python_static_analyzer import analyze_python_file
from core.review_aggregator import aggregate_issues
from ai.review_generator import generate_review
from ai.debug_generator import generate_full_debug
from ai.debug_prompt_builder import (
    build_python_full_debug_prompt,
    build_llm_full_debug_prompt,
)
from core.confidence_calculator import calculate_confidence
from core.result_envelope import ResultEnvelope
from core.fix_extractor import extract_fixed_code


class PullRequestEngineRunner:
    def __init__(self, auth_headers: dict):
        self.fetcher = GitHubPRFetcher(auth_headers)

    def analyze_pr(
        self,
        owner: str,
        repo: str,
        pr_number: int,
    ) -> Dict:
        # Fetch all changed files from the PR
        files = self.fetcher.fetch_changed_files(
            owner=owner,
            repo=repo,
            pr_number=pr_number,
        )

        pr_results: List[Dict] = []  # Store results for each file

        for f in files:
            filename = f["filename"]
            content = f["content"]
            language = f["language"]

            # Debugging print to track file name and detected language
            print(f"Detected file: {filename}, Detected language: {language}")

            # Handle files according to their language
            if language == "python":
                print(f"Processing Python file: {filename}")
                file_result = self._analyze_file(
                    filename,
                    content,
                    language,
                )
            elif language == "javascript":
                print(f"Processing JavaScript file: {filename}")
                file_result = self._analyze_file(
                    filename,
                    content,
                    language,
                )
            else:
                # If it's an unsupported language, skip the file
                print(f"Skipping unsupported file: {filename} with language {language}")
                continue

            pr_results.append(file_result)

        return {
            "pr_number": pr_number,
            "files": pr_results,
        }

    def _analyze_file(
        self,
        filename: str,
        content: str,
        language: str,
    ) -> Dict:
        tmp_path = None
        try:
            # Using actual filename instead of temp file for analysis.
            tmp_path = f"tmp_{Path(filename).name}"

            with open(tmp_path, "w", encoding="utf-8") as tmp:
                tmp.write(content)

            print("Detected language:", language)

            # =========================
            # PYTHON (tool-backed)
            # =========================
            if language == "python":
                issues = analyze_python_file(tmp_path)
                print("DEBUG ISSUES:", issues)

                if not issues:
                    return {
                        "filename": filename,
                        "review": "No issues found by static analysis tools.",
                        "full_debug": None,
                        "confidence": {
                            "level": "high",
                            "score": 1.0,
                            "rationale": "No issues detected by static analysis tools (bandit, flake8, radon).",
                        },
                        "fixed_code": None,
                    }

                else:
                    aggregated = aggregate_issues(issues)

                    review = generate_review(
                        aggregated,
                        file=filename,
                        language="python",
                        analysis_type="tool-backed",
                    )

                    full_prompt = build_python_full_debug_prompt(
                        content,
                        aggregated,
                    )

                    full_debug = generate_full_debug(
                        file=filename,
                        prompt=full_prompt,
                        language="python",
                        analysis_type="tool-backed",
                    )

                    confidence = calculate_confidence(
                        analysis_type=full_debug.analysis_type,
                        tools_used=["bandit", "flake8", "radon"],
                    )

                    fixed_code = extract_fixed_code(
                        full_debug.content,
                        language="python",
                    )

                    return {
                        "filename": filename,
                        "review": review.content,
                        "full_debug": full_debug.content,
                        "confidence": confidence.score,
                        "fixed_code": fixed_code,
                        "issues": issues,
                    }

            # =========================
            # NON-PYTHON (LLM-only)
            # =========================
            else:
                review = generate_review(
                    {"code": content, "language": language},
                    file=filename,
                    language=language,
                    analysis_type="llm-only",
                )

                full_prompt = build_llm_full_debug_prompt(
                    content,
                    language,
                )

                full_debug = generate_full_debug(
                    file=filename,
                    prompt=full_prompt,
                    language=language,
                    analysis_type="llm-only",
                )

                confidence = calculate_confidence(
                    analysis_type=full_debug.analysis_type,
                )

                fixed_code = extract_fixed_code(
                    full_debug.content,
                    language=language,
                )

                return {
                    "filename": filename,
                    "review": review.content,
                    "full_debug": full_debug.content,
                    "confidence": confidence.score,
                    "fixed_code": fixed_code,
                }

        finally:
            # Remove the temp file after processing
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)