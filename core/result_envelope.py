from dataclasses import dataclass
from typing import Generic, TypeVar
from core.confidence import ConfidenceScore

T = TypeVar("T")

@dataclass
class ResultEnvelope(Generic[T]):
    result: T
    confidence: ConfidenceScore
