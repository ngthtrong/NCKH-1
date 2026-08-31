from __future__ import annotations

import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path


ANALYSIS_DIRECTORY = Path(__file__).resolve().parents[1] / "analysis"
SPIKE_PLAN_DIRECTORY = Path(__file__).resolve().parents[1] / "spikes" / "plans"
sys.path.insert(0, str(ANALYSIS_DIRECTORY))

from validate_spike_evidence import (  # noqa: E402
    discover_plans,
    validate_evidence_root,
    validate_manifest,
)


class ValidateSpikeEvidenceTest(unittest.TestCase):
    def test_tracked_plans_are_valid_and_payment_remains_blocked(self) -> None:
        plans, errors, blockers = discover_plans(SPIKE_PLAN_DIRECTORY)

        self.assertEqual(errors, [])
        self.assertEqual(len(plans), 3)
        self.assertTrue(any("sandbox credentials" in blocker for blocker in blockers))
        self.assertTrue(any("rubric weight" in blocker for blocker in blockers))

    def test_complete_evidence_rejects_an_empty_result_directory(self) -> None:
        plans, errors, _ = discover_plans(SPIKE_PLAN_DIRECTORY)
        self.assertEqual(errors, [])
        with tempfile.TemporaryDirectory() as temporary_directory:
            evidence_errors, findings = validate_evidence_root(plans, Path(temporary_directory))

        self.assertEqual(findings, [])
        self.assertTrue(any("No measured spike manifest" in error for error in evidence_errors))

    def test_manifest_requires_checksum_backed_artifacts(self) -> None:
        plan = {
            "spike_id": "synthetic-validator-test-only",
            "candidates": ["candidate-a", "candidate-b"],
            "placements": ["POOL"],
            "required_cases": ["cross-tenant-read"],
            "mandatory_pass_cases": ["cross-tenant-read"],
            "required_artifact_kinds": ["security-report"],
        }
        with tempfile.TemporaryDirectory() as temporary_directory:
            run_directory = Path(temporary_directory)
            artifact = run_directory / "security-report.txt"
            artifact.write_text("SYNTHETIC VALIDATOR UNIT FIXTURE; NOT RESEARCH DATA\n", encoding="utf-8")
            manifest = {
                "schema_version": "1.0.0",
                "data_kind": "measured_spike",
                "spike_id": plan["spike_id"],
                "run_id": "synthetic-validator-test-only",
                "replicate": 1,
                "candidate": "candidate-a",
                "placement": "POOL",
                "comparison_group": "synthetic-validator-test-only",
                "workload_fingerprint": "1" * 64,
                "environment_fingerprint": "2" * 64,
                "status": "succeeded",
                "started_at_utc": "2026-01-01T00:00:00Z",
                "finished_at_utc": "2026-01-01T00:00:01Z",
                "source": {"git_commit": "unit-test", "git_dirty": False},
                "environment": {
                    "label": "temporary-unit-test",
                    "postgresql_version": "unit-test",
                    "cpu": "unit-test",
                    "memory_bytes": 1,
                },
                "case_results": {"cross-tenant-read": "PASS"},
                "artifacts": [
                    {
                        "kind": "security-report",
                        "path": artifact.name,
                        "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
                    }
                ],
            }
            manifest_path = run_directory / "manifest.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            _, errors = validate_manifest(manifest_path, plan)
            self.assertEqual(errors, [])

            manifest["artifacts"][0]["sha256"] = "0" * 64
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            _, errors = validate_manifest(manifest_path, plan)
            self.assertTrue(any("does not match" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
