from typing import Dict, List

from integrations.github.pr_fetcher import GitHubPRFetcher

from analyzers.python.python_static_analyzer import analyze_python_file
from core.review_aggregator import aggregate_issues

import tempfile
from pathlib import Path
import os

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

        files = self.fetcher.fetch_changed_files(
            owner=owner,
            repo=repo,
            pr_number=pr_number,
        )

        pr_results: List[Dict] = []

        for f in files:
            filename = f["filename"]
            content = f["content"]
            language = f["language"]

            file_result = self._analyze_file(
                filename,
                content,
                language,
            )

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

            with tempfile.NamedTemporaryFile(
                mode="w",
                suffix=Path(filename).suffix,
                delete=False,
                encoding="utf-8",
            ) as tmp:
                tmp.write(content)
                tmp_path = tmp.name
            
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
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
