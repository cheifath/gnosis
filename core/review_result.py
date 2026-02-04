# core/review_result.py

from dataclasses import dataclass
from typing import Optional
from typing import Literal


@dataclass
class ReviewResult:
    file: str
    content: str
    language: str
    analysis_type: str  # "tool-backed" | "llm-only"


@dataclass
class PartialDebugResult:
    file: str
    tool: str
    issue_summary: str
    content: str
    language: str
    analysis_type: str


@dataclass
class FullDebugResult:
    file: str
    content: str
    language: str
    analysis_type: str