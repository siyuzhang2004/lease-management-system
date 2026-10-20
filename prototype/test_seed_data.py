import copy
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from lease_engine import calculate
from seed_data import load_disclosure_data, load_workspace_params


class SeedDataTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name) / "prototype"
        self.base.mkdir()
        source = Path(__file__).resolve().parent
        shutil.copytree(source / "seed-data", self.base / "seed-data")
        shutil.copyfile(source / "default-contract.json", self.base / "default-contract.json")

    def test_clean_checkout_has_all_contracts_and_disclosure_inputs(self):
        self.assertFalse((self.base.parent / "analysis").exists())
        contracts = load_workspace_params(self.base)
        with open(self.base / "default-contract.json", encoding="utf-8") as file:
            contracts.append(json.load(file))
        self.assertEqual(len(contracts), 9)
        self.assertEqual(len({p["company"] for p in contracts}), 8)
        self.assertEqual(len({p["recordId"] for p in contracts}), 9)
        for params in contracts:
            result = calculate(params)
            self.assertGreater(len(result["rows"]), 0)
            self.assertEqual(result["params"]["recordId"], params["recordId"])
        rates = load_disclosure_data(self.base, "international.json")
        self.assertTrue(rates["rates"])
        self.assertTrue(load_disclosure_data(self.base, "fixed-history.json"))
        self.assertTrue(load_disclosure_data(self.base, "opening-carry.json"))
        self.assertEqual(set(load_disclosure_data(self.base, "group-reference.json")),
                         {"2026-06", "2026-09"})

    def test_local_override_merges_by_id_without_losing_other_contracts(self):
        originals = load_workspace_params(self.base)
        updated = copy.deepcopy(originals[0])
        updated["name"] = "Local revised contract"
        folder = self.base.parent / "analysis" / "workspace-contracts"
        folder.mkdir(parents=True)
        with open(folder / "renamed-file.json", "w", encoding="utf-8") as file:
            json.dump(updated, file)
        merged = load_workspace_params(self.base)
        self.assertEqual(len(merged), len(originals))
        self.assertEqual(next(p for p in merged if p["recordId"] == updated["recordId"])["name"],
                         updated["name"])
        folder = self.base.parent / "analysis" / "disclosures"
        folder.mkdir()
        with open(folder / "international.json", "w", encoding="utf-8") as file:
            json.dump({"rates": {"test": 1}}, file)
        self.assertEqual(load_disclosure_data(self.base, "international.json"),
                         {"rates": {"test": 1}})
        self.assertTrue(load_disclosure_data(self.base, "fixed-history.json"))

    def test_duplicate_ids_are_rejected(self):
        params = load_workspace_params(self.base)[0]
        with open(self.base / "seed-data/workspace-contracts/duplicate.json", "w", encoding="utf-8") as file:
            json.dump(params, file)
        with self.assertRaisesRegex(ValueError, "重复"):
            load_workspace_params(self.base)


if __name__ == "__main__":
    unittest.main()
