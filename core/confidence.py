from dataclasses import dataclass
from typing import Literal

ConfidenceLevel = Literal["high", "medium", "low"]

@dataclass
class ConfidenceScore:
    level: ConfidenceLevel
    score: float           # 0.0 – 1.0
    rationale: str
