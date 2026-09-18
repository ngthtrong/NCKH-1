from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ANALYSIS_DIRECTORY = Path(__file__).resolve().parents[1] / "analysis"
sys.path.insert(0, str(ANALYSIS_DIRECTORY))

from capture_manifest import start_manifest  # noqa: E402


class CaptureManifestTest(unittest.TestCase):
    def arguments(self, output: Path, run_class: str) -> argparse.Namespace:
        return argparse.Namespace(
            output=output,
            run_id=f"synthetic-{run_class}",
            run_class=run_class,
            scenario="smoke",
            variant="not-applicable",
            script="experiments/k6/smoke.js",
            summary_file="summary.json",
            raw_file="raw-metrics.json",
            resource_file="resource-metrics.json",
        )

    def test_development_manifest_is_never_final_analysis_evidence(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "manifest.json"
            with patch("capture_manifest.git_metadata", return_value={
                "git_commit": "0" * 40,
                "git_dirty": True,
            }), patch.dict(os.environ, {}, clear=True):
                self.assertEqual(start_manifest(self.arguments(output, "development")), 0)

            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(payload["schema_version"], "1.1.0")
            self.assertEqual(payload["run_class"], "development")
            self.assertFalse(payload["eligible_for_final_analysis"])
            self.assertIsNone(payload["protocol_id"])

    def test_experiment_manifest_requires_clean_source_and_protocol(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "manifest.json"
            with patch("capture_manifest.git_metadata", return_value={
                "git_commit": "0" * 40,
                "git_dirty": True,
            }), patch.dict(os.environ, {"EXPERIMENT_PROTOCOL_ID": "protocol-v1"}, clear=True):
                with self.assertRaisesRegex(ValueError, "clean Git worktree"):
                    start_manifest(self.arguments(output, "experiment"))

            with patch("capture_manifest.git_metadata", return_value={
                "git_commit": "0" * 40,
                "git_dirty": False,
            }), patch.dict(os.environ, {}, clear=True):
                with self.assertRaisesRegex(ValueError, "EXPERIMENT_PROTOCOL_ID"):
                    start_manifest(self.arguments(output, "experiment"))

    def test_eligible_experiment_records_protocol(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            output = Path(temporary_directory) / "manifest.json"
            with patch("capture_manifest.git_metadata", return_value={
                "git_commit": "0" * 40,
                "git_dirty": False,
            }), patch.dict(os.environ, {"EXPERIMENT_PROTOCOL_ID": "protocol-v1"}, clear=True):
                self.assertEqual(start_manifest(self.arguments(output, "experiment")), 0)

            payload = json.loads(output.read_text(encoding="utf-8"))
            self.assertTrue(payload["eligible_for_final_analysis"])
            self.assertEqual(payload["protocol_id"], "protocol-v1")


if __name__ == "__main__":
    unittest.main()
