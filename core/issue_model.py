from dataclasses import dataclass
from typing import Optional

@dataclass
class CodeIssue:
    file: str
    tool: str
    category: str      # security | style | complexity
    severity: str      # low | medium | high
    line: Optional[int]
    message: str
