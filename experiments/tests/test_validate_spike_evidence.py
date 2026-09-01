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
    validate_elimination,
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
        self.assertTrue(any("No measured spike manifest or candidate elimination" in error for error in evidence_errors))

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
                "source": {"git_commit": "0" * 40, "git_dirty": False},
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

            manifest["artifacts"][0]["sha256"] = hashlib.sha256(artifact.read_bytes()).hexdigest()
            manifest["artifacts"].append(dict(manifest["artifacts"][0]))
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            _, errors = validate_manifest(manifest_path, plan)
            self.assertTrue(any("duplicates artifact kind" in error for error in errors))
            self.assertTrue(any("duplicates artifact path" in error for error in errors))

            manifest["artifacts"] = manifest["artifacts"][:1]
            manifest["source"]["git_commit"] = "not-a-git-object"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            _, errors = validate_manifest(manifest_path, plan)
            self.assertTrue(any("full 40- or 64-digit Git object ID" in error for error in errors))

    def test_elimination_requires_registered_reason_failure_and_checksums(self) -> None:
        plan = {
            "spike_id": "synthetic-elimination-test-only",
            "candidates": ["candidate-a", "candidate-b"],
            "placements": ["POOL"],
            "required_cases": ["cross-tenant-read", "cross-tenant-write"],
            "mandatory_pass_cases": ["cross-tenant-read", "cross-tenant-write"],
            "required_artifact_kinds": ["security-report", "environment-manifest"],
            "elimination_artifact_kinds": ["security-report", "environment-manifest"],
            "eliminate_if": ["cross-tenant-access-succeeds"],
            "elimination_triggers": {
                "cross-tenant-access-succeeds": ["cross-tenant-read"],
            },
        }
        with tempfile.TemporaryDirectory() as temporary_directory:
            run_directory = Path(temporary_directory)
            artifacts = []
            for kind in plan["elimination_artifact_kinds"]:
                artifact = run_directory / f"{kind}.txt"
                artifact.write_text("SYNTHETIC VALIDATOR UNIT FIXTURE; NOT RESEARCH DATA\n", encoding="utf-8")
                artifacts.append({
                    "kind": kind,
                    "path": artifact.name,
                    "sha256": hashlib.sha256(artifact.read_bytes()).hexdigest(),
                })
            elimination = {
                "schema_version": "1.0.0",
                "data_kind": "spike_candidate_elimination",
                "spike_id": plan["spike_id"],
                "elimination_id": "synthetic-elimination-test-only",
                "candidate": "candidate-a",
                "placement": "POOL",
                "status": "eliminated",
                "reason": "cross-tenant-access-succeeds",
                "observed_at_utc": "2026-01-01T00:00:00Z",
                "source": {"git_commit": "0" * 40, "git_dirty": False},
                "environment": {
                    "label": "temporary-unit-test",
                    "postgresql_version": "unit-test",
                    "cpu": "unit-test",
                    "memory_bytes": 1,
                },
                "case_results": {
                    "cross-tenant-read": "FAIL",
                    "cross-tenant-write": "PASS",
                },
                "artifacts": artifacts,
            }
            elimination_path = run_directory / "elimination.json"
            elimination_path.write_text(json.dumps(elimination), encoding="utf-8")

            _, errors = validate_elimination(elimination_path, plan)
            self.assertEqual(errors, [])

            elimination["case_results"]["cross-tenant-read"] = "PASS"
            elimination["case_results"]["cross-tenant-write"] = "FAIL"
            elimination_path.write_text(json.dumps(elimination), encoding="utf-8")
            _, errors = validate_elimination(elimination_path, plan)
            self.assertTrue(any("is not supported by a FAIL" in error for error in errors))

            elimination["case_results"]["cross-tenant-write"] = "PASS"
            elimination_path.write_text(json.dumps(elimination), encoding="utf-8")
            _, errors = validate_elimination(elimination_path, plan)
            self.assertTrue(any("at least one mandatory case must be FAIL" in error for error in errors))

            elimination["case_results"]["cross-tenant-read"] = "FAIL"
            elimination["reason"] = "unregistered-reason"
            elimination_path.write_text(json.dumps(elimination), encoding="utf-8")
            _, errors = validate_elimination(elimination_path, plan)
            self.assertTrue(any("reason is not registered" in error for error in errors))

    def test_complete_gate_skips_measurements_only_for_validly_eliminated_candidate(self) -> None:
        plan = {
            "spike_id": "synthetic-completion-test-only",
            "candidates": ["candidate-a", "candidate-b"],
            "placements": ["POOL"],
            "minimum_replicates": 1,
            "required_cases": ["cross-tenant-read"],
            "mandatory_pass_cases": ["cross-tenant-read"],
            "required_artifact_kinds": ["security-report", "environment-manifest"],
            "elimination_artifact_kinds": ["security-report", "environment-manifest"],
            "eliminate_if": ["cross-tenant-access-succeeds"],
            "elimination_triggers": {
                "cross-tenant-access-succeeds": ["cross-tenant-read"],
            },
        }
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            elimination_directory = root / "candidate-a"
            measured_directory = root / "candidate-b"
            elimination_directory.mkdir()
            measured_directory.mkdir()

            def artifact(directory: Path, kind: str) -> dict[str, str]:
                path = directory / f"{kind}.txt"
                path.write_text("SYNTHETIC VALIDATOR UNIT FIXTURE; NOT RESEARCH DATA\n", encoding="utf-8")
                return {
                    "kind": kind,
                    "path": path.name,
                    "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                }

            common_environment = {
                "label": "temporary-unit-test",
                "postgresql_version": "unit-test",
                "cpu": "unit-test",
                "memory_bytes": 1,
            }
            elimination = {
                "schema_version": "1.0.0",
                "data_kind": "spike_candidate_elimination",
                "spike_id": plan["spike_id"],
                "elimination_id": "synthetic-candidate-a-elimination",
                "candidate": "candidate-a",
                "placement": "POOL",
                "status": "eliminated",
                "reason": "cross-tenant-access-succeeds",
                "observed_at_utc": "2026-01-01T00:00:00Z",
                "source": {"git_commit": "0" * 40, "git_dirty": False},
                "environment": common_environment,
                "case_results": {"cross-tenant-read": "FAIL"},
                "artifacts": [
                    artifact(elimination_directory, "security-report"),
                    artifact(elimination_directory, "environment-manifest"),
                ],
            }
            (elimination_directory / "elimination.json").write_text(
                json.dumps(elimination), encoding="utf-8"
            )
            manifest = {
                "schema_version": "1.0.0",
                "data_kind": "measured_spike",
                "spike_id": plan["spike_id"],
                "run_id": "synthetic-candidate-b-run-1",
                "replicate": 1,
                "candidate": "candidate-b",
                "placement": "POOL",
                "comparison_group": "synthetic-comparison",
                "workload_fingerprint": "1" * 64,
                "environment_fingerprint": "2" * 64,
                "status": "succeeded",
                "started_at_utc": "2026-01-01T00:00:00Z",
                "finished_at_utc": "2026-01-01T00:00:01Z",
                "source": {"git_commit": "0" * 40, "git_dirty": False},
                "environment": common_environment,
                "case_results": {"cross-tenant-read": "PASS"},
                "artifacts": [
                    artifact(measured_directory, "security-report"),
                    artifact(measured_directory, "environment-manifest"),
                ],
            }
            (measured_directory / "manifest.json").write_text(
                json.dumps(manifest), encoding="utf-8"
            )

            errors, findings = validate_evidence_root([plan], root, require_complete=True)
            self.assertEqual(errors, [])
            self.assertTrue(any("candidate-a eliminated" in finding for finding in findings))

            second_elimination_directory = root / "candidate-b-elimination"
            second_elimination_directory.mkdir()
            second_elimination = dict(elimination)
            second_elimination["elimination_id"] = "synthetic-candidate-b-elimination"
            second_elimination["candidate"] = "candidate-b"
            second_elimination["artifacts"] = [
                artifact(second_elimination_directory, "security-report"),
                artifact(second_elimination_directory, "environment-manifest"),
            ]
            (second_elimination_directory / "elimination.json").write_text(
                json.dumps(second_elimination), encoding="utf-8"
            )
            errors, _ = validate_evidence_root([plan], root, require_complete=True)
            self.assertTrue(any("all candidates are eliminated" in error for error in errors))


if __name__ == "__main__":
    unittest.main()
