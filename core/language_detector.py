from pathlib import Path

EXTENSION_LANGUAGE_MAP = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".java": "java"
}

def detect_language(file_path: str) -> str | None:
    return EXTENSION_LANGUAGE_MAP.get(Path(file_path).suffix.lower())
