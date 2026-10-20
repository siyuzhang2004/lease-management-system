"""Versioned starter data, with optional local analysis overrides."""
import json


def read_json(path):
    with open(path, "r", encoding="utf-8") as source:
        return json.load(source)


def load_disclosure_data(base, name, default=None):
    for path in (base.parent / "analysis" / "disclosures" / name,
                 base / "seed-data" / "disclosures" / name):
        if path.exists():
            return read_json(path)
    return {} if default is None else default


def load_workspace_params(base):
    # Merge by contract ID so a local revision overrides its bundled starter.
    records = {}
    for folder in (base / "seed-data" / "workspace-contracts",
                   base.parent / "analysis" / "workspace-contracts"):
        seen = set()
        for path in sorted(folder.glob("*.json")):
            params = read_json(path)
            record_id = params.get("recordId")
            if not isinstance(record_id, str) or not record_id or record_id in seen:
                raise ValueError(f"合同初始化数据编号缺失或重复：{path.name}")
            seen.add(record_id)
            records[record_id] = params
    return list(records.values())
