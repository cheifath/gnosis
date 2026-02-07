from dataclasses import dataclass

@dataclass
class ExportedFix:
    original_file: str
    fixed_file: str
    content: str
    analysis_type: str
