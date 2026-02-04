from core.review_result import ReviewResult
from cli.formatter import (
    format_review,
    format_partial_debug,
    format_full_debug,
)


def print_review(result: ReviewResult) -> None:
    """
    Prints formatted review output to console.
    """
    output = format_review(result)
    print(output)


def print_partial_debug(result) -> None:
    """
    Prints formatted partial debug output.
    """
    output = format_partial_debug(result)
    print(output)


def print_full_debug(result) -> None:
    """
    Prints formatted full debug output.
    """
    output = format_full_debug(result)
    print(output)
