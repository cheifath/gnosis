import types
import pytest

from core.language_detector import detect_language
from integrations.github.pr_engine_runner import PullRequestEngineRunner
from core.review_result import ReviewResult, FullDebugResult


def test_detect_language_mappings():
    assert detect_language("foo.ts") == "typescript"
    assert detect_language("Bar.Java") == "java"
    assert detect_language("hello.c") == "c"
    assert detect_language("lib.CPP") == "cpp"
    assert detect_language("module.vb") == "vb"
    assert detect_language("queries.sql") == "sql"


def test_pr_engine_runner_dispatch_for_non_python(monkeypatch):
    # Prepare a runner and stub out network/LLM dependencies
    runner = PullRequestEngineRunner(auth_headers={})

    # Fake changed files: a mixture of non-python supported languages
    fake_files = [
        {"filename": "a.js", "content": "console.log('x')", "language": "javascript"},
        {"filename": "b.ts", "content": "let x:number = 1;", "language": "typescript"},
        {"filename": "c.java", "content": "class A {}", "language": "java"},
        {"filename": "d.c", "content": "int main() {}", "language": "c"},
        {"filename": "e.cpp", "content": "int main() {}", "language": "cpp"},
        {"filename": "f.vb", "content": "Module M\nEnd Module", "language": "visualbasic"},
        {"filename": "g.sql", "content": "SELECT 1;", "language": "sql"},
    ]

    # Patch the fetcher to return our fake files
    monkeypatch.setattr(runner.fetcher, "fetch_changed_files", lambda owner, repo, pr_number: fake_files)

    # Stub LLM-backed generators to avoid subprocess/network calls
    def fake_generate_review(review_data, *, file, language, analysis_type):
        return ReviewResult(file=file, content=f"REVIEW for {file}", language=language, analysis_type=analysis_type)

    def fake_generate_full_debug(file, prompt, *, language, analysis_type):
        return FullDebugResult(file=file, content=f"FULLDEBUG for {file}", language=language, analysis_type=analysis_type)

    # Patch the references used by pr_engine_runner (they were imported at module level)
    import integrations.github.pr_engine_runner as pr_runner_mod
    monkeypatch.setattr(pr_runner_mod, "generate_review", fake_generate_review)
    monkeypatch.setattr(pr_runner_mod, "generate_full_debug", fake_generate_full_debug)

    result = runner.analyze_pr("owner", "repo", 1)

    # Ensure all supported non-python files were processed and returned
    filenames = [f["filename"] for f in result["files"]]
    assert set(filenames) == {f["filename"] for f in fake_files}

    # Ensure each result has review and full_debug entries
    for f in result["files"]:
        assert "review" in f and f["review"].startswith("REVIEW for")
        assert "full_debug" in f and f["full_debug"].startswith("FULLDEBUG for")
        assert isinstance(f["confidence"], float)