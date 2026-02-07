import re
from typing import Optional

def extract_fixed_code(llm_output: str, language: str) -> Optional[str]:
    """
    Extracts fenced corrected code from LLM output.
    Returns None if no safe code block is found.
    """

    pattern = rf"```{language}\n(.*?)```"
    match = re.search(pattern, llm_output, re.DOTALL)

    if not match:
        return None

    return match.group(1).strip()
