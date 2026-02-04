# core/review_result.py

from dataclasses import dataclass
from typing import Optional


@dataclass
class ReviewResult:
    file: str
    content: str


@dataclass
class PartialDebugResult:
    file: str
    tool: str
    issue_summary: str
    content: str


@dataclass
class FullDebugResult:
    file: str
    content: str
