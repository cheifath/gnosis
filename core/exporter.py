from pathlib import Path
from core.export_result import ExportedFix

def export_fixed_file(
    *,
    original_path: str,
    fixed_code: str,
    analysis_type: str,
) -> ExportedFix:
    original = Path(original_path)

    fixed_path = original.with_suffix(original.suffix + ".fixed")

    fixed_path.write_text(
        fixed_code,
        encoding="utf-8",
    )

    return ExportedFix(
        original_file=str(original),
        fixed_file=str(fixed_path),
        content=fixed_code,
        analysis_type=analysis_type,
    )
