import subprocess

def run_llm(prompt: str) -> str:
    """
    Sends a prompt to the local Qwen model via Ollama and returns the response.
    """
    result = subprocess.run(
        ["ollama", "run", "qwen2.5-coder:3b"],
        input=prompt,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace"
    )

    return result.stdout.strip()

