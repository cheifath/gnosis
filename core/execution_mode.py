from enum import Enum

class ExecutionMode(str, Enum):
    REVIEW_ONLY = "review-only"
    DEBUG_ONLY = "debug-only"
    FULL_DEBUG = "full-debug"
    JSON = "json"
