from dataclasses import asdict, is_dataclass

def to_json(obj):
    """
    Recursively converts dataclasses to JSON-serializable dicts.
    """
    if is_dataclass(obj):
        return asdict(obj)
    elif isinstance(obj, list):
        return [to_json(item) for item in obj]
    elif isinstance(obj, dict):
        return {k: to_json(v) for k, v in obj.items()}
    else:
        return obj
