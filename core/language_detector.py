from pathlib import Path

# Map common filename extensions to normalized language names used across the
# pipeline. Keep keys lowercase and include common variants for C/C++ headers
# and multiple C++ extensions so detection works in diverse repos.
EXTENSION_LANGUAGE_MAP = {
    # Core languages
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".java": "java",

    # C / C++
    ".c": "c",
    ".h": "c",        # treat headers as C/C++ family
    ".cpp": "cpp",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".hpp": "cpp",

    # Visual Basic (normalized short name `vb` to match downstream usage)
    ".vb": "vb",

    # SQL
    ".sql": "sql",

    # Other languages already advertised as supported
    ".cs": "csharp",
    ".go": "go",
    ".rs": "rust",
    ".php": "php",
}


def detect_language(file_path: str) -> str | None:
    """Return a normalized language name for a given file path.

    Returns None when the extension is unknown. This function is conservative
    and only maps explicit extensions; callers may still skip unknown files
    gracefully.
    """
    return EXTENSION_LANGUAGE_MAP.get(Path(file_path).suffix.lower())
