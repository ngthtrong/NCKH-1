from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path


ANALYSIS_DIRECTORY = Path(__file__).resolve().parents[1] / "analysis"
sys.path.insert(0, str(ANALYSIS_DIRECTORY))

from analyze_results import parse_metric_name, run_analysis  # noqa: E402


class AnalyzeResultsTest(unittest.TestCase):
    def write_synthetic_unit_fixture(self, root: Path, run_class: str = "experiment") -> None:
        run_directory = root / "synthetic-unit-fixture"
        run_directory.mkdir(parents=True)
        manifest = {
            "schema_version": "1.1.0",
            "data_kind": "measured",
            "run_class": run_class,
            "eligible_for_final_analysis": run_class == "experiment",
            "protocol_id": "synthetic-unit-protocol" if run_class == "experiment" else None,
            "run_id": "synthetic-unit-fixture",
            "status": "succeeded",
            "started_at_utc": "2026-01-01T00:00:00Z",
            "finished_at_utc": "2026-01-01T00:01:00Z",
            "scenario": "baseline",
            "rate_limit_variant": "not-applicable",
            "source": {"git_commit": "unit-test", "git_dirty": False},
            "target": {
                "environment_label": "synthetic-unit-test-only",
                "base_url": "http://example.invalid",
                "tenant_hosts": ["alpha.example.invalid", "beta.example.invalid"],
            },
            "system": {
                "os": "unit-test",
                "architecture": "unit-test",
                "logical_cpu_count": 1,
                "memory_bytes": 1,
                "cpu_model": "unit-test",
            },
            "tools": {},
            "images": {},
            "workload": {"fixture_notice": "synthetic values used only inside a temporary test directory"},
            "artifacts": {
                "script": "synthetic",
                "summary": "summary.json",
                "raw_metrics": "raw.json",
                "resource_metrics": "resource-metrics.json",
            },
            "notes": "SYNTHETIC UNIT TEST FIXTURE; NOT A RESEARCH RESULT",
        }
        summary = {
            "metrics": {
                "checks": {"type": "rate", "contains": "default", "values": {"rate": 1.0, "passes": 10, "fails": 0}},
                "http_req_duration": {"type": "trend", "contains": "time", "values": {"med": 10.0, "p(95)": 20.0}},
                "http_req_failed": {"type": "rate", "contains": "default", "values": {"rate": 0.0, "passes": 10, "fails": 0}},
                "http_reqs": {"type": "counter", "contains": "default", "values": {"count": 10, "rate": 2.0}},
            }
        }
        (run_directory / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
        (run_directory / "summary.json").write_text(json.dumps(summary), encoding="utf-8")

    def test_parse_metric_tags(self) -> None:
        name, tags = parse_metric_name("http_req_duration{tenant:alpha,role:victim}")
        self.assertEqual(name, "http_req_duration")
        self.assertEqual(tags, {"tenant": "alpha", "role": "victim"})

    def test_analysis_writes_normalized_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            input_root = root / "input"
            output_root = root / "output"
            self.write_synthetic_unit_fixture(input_root)

            exit_code = run_analysis(input_root, output_root, minimum_replicates=1)

            self.assertEqual(exit_code, 0)
            self.assertIn("20.0", (output_root / "comparison.csv").read_text(encoding="utf-8"))
            self.assertIn("synthetic-unit-fixture", (output_root / "report.md").read_text(encoding="utf-8"))
            self.assertTrue((output_root / "p95-by-run.svg").exists())

    def test_analysis_rejects_missing_input(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            self.assertEqual(run_analysis(root / "missing", root / "output"), 2)

    def test_development_runs_are_excluded_from_final_analysis(self) -> None:
        with tempfile.TemporaryDirectory() as temporary_directory:
            root = Path(temporary_directory)
            input_root = root / "input"
            self.write_synthetic_unit_fixture(input_root, run_class="development")

            self.assertEqual(run_analysis(input_root, root / "formal-output"), 2)
            self.assertEqual(
                run_analysis(
                    input_root,
                    root / "development-output",
                    minimum_replicates=1,
                    run_class="development",
                ),
                0,
            )
            report = (root / "development-output" / "report.md").read_text(encoding="utf-8")
            self.assertIn("không đủ điều kiện", report)


if __name__ == "__main__":
    unittest.main()
