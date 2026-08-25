#!/usr/bin/env python3
"""Normalize measured k6 summaries, run QA checks, and build reproducible outputs."""

from __future__ import annotations

import argparse
import csv
import html
import json
import math
import re
import statistics
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable


METRIC_PATTERN = re.compile(r"^(?P<name>[^{}]+)(?:\{(?P<tags>[^{}]*)\})?$")
EXPECTED_METRICS = ("checks", "http_req_duration", "http_req_failed", "http_reqs")
OBSERVATION_FIELDS = (
    "run_id",
    "scenario",
    "rate_limit_variant",
    "metric",
    "statistic",
    "value",
    "unit",
    "tags",
)
COMPARISON_METRICS = {
    ("http_req_duration", "med"): "median_ms",
    ("http_req_duration", "p(95)"): "p95_ms",
    ("http_reqs", "rate"): "throughput_rps",
    ("http_req_failed", "rate"): "error_rate",
    ("victim_latency", "p(95)"): "victim_p95_ms",
    ("victim_error_rate", "rate"): "victim_error_rate",
    ("api_cpu_ratio", "median"): "cpu_median_ratio",
    ("api_rss_bytes", "max"): "rss_max_bytes",
    ("db_active_connections", "max"): "db_active_connections_max",
}


@dataclass(frozen=True)
class RunData:
    directory: Path
    manifest: dict[str, Any]
    summary: dict[str, Any]

    @property
    def run_id(self) -> str:
        return str(self.manifest["run_id"])

    @property
    def scenario(self) -> str:
        return str(self.manifest["scenario"])

    @property
    def variant(self) -> str:
        return str(self.manifest["rate_limit_variant"])


def parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_metric_name(metric_key: str) -> tuple[str, dict[str, str]]:
    match = METRIC_PATTERN.fullmatch(metric_key)
    if not match:
        return metric_key, {}
    tags: dict[str, str] = {}
    raw_tags = match.group("tags")
    if raw_tags:
        for item in raw_tags.split(","):
            if ":" in item:
                key, value = item.split(":", 1)
                tags[key.strip()] = value.strip()
    return match.group("name"), tags


def statistic_unit(metric: str, statistic: str, contains: str) -> str:
    if statistic in {"passes", "fails", "count"}:
        return "count"
    if statistic == "rate":
        if metric in {"checks", "http_req_failed", "victim_error_rate"} or metric.endswith("_rate"):
            return "ratio"
        return "per_second"
    if contains == "time" or metric.endswith("_latency"):
        return "milliseconds"
    if contains == "data":
        return "bytes"
    return "value"


def validate_and_load_runs(input_root: Path) -> tuple[list[RunData], list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []
    runs: list[RunData] = []
    manifest_paths = sorted(input_root.rglob("manifest.json")) if input_root.exists() else []

    if not manifest_paths:
        errors.append(f"Không tìm thấy manifest.json trong {input_root}")
        return runs, errors, warnings

    seen_run_ids: Counter[str] = Counter()
    for manifest_path in manifest_paths:
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            errors.append(f"{manifest_path}: manifest không đọc được ({error})")
            continue

        run_id = str(manifest.get("run_id", ""))
        seen_run_ids[run_id] += 1
        if manifest.get("data_kind") != "measured":
            errors.append(f"{manifest_path}: data_kind phải là measured")
            continue
        if manifest.get("status") != "succeeded":
            warnings.append(f"{run_id or manifest_path.name}: bỏ qua run có status={manifest.get('status')}")
            continue

        started = parse_datetime(manifest.get("started_at_utc"))
        finished = parse_datetime(manifest.get("finished_at_utc"))
        if started is None or finished is None:
            errors.append(f"{run_id}: timestamp thiếu hoặc sai định dạng")
            continue
        if finished < started:
            errors.append(f"{run_id}: finished_at_utc sớm hơn started_at_utc")
            continue

        artifact = manifest.get("artifacts", {})
        summary_value = artifact.get("summary") if isinstance(artifact, dict) else None
        if not isinstance(summary_value, str) or not summary_value:
            errors.append(f"{run_id}: thiếu artifacts.summary")
            continue
        summary_path = manifest_path.parent / summary_value
        try:
            summary = json.loads(summary_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            errors.append(f"{run_id}: summary không đọc được tại {summary_path} ({error})")
            continue
        if not isinstance(summary.get("metrics"), dict):
            errors.append(f"{run_id}: summary không có object metrics")
            continue

        missing_metrics = [name for name in EXPECTED_METRICS if name not in summary["metrics"]]
        if missing_metrics:
            warnings.append(f"{run_id}: thiếu metric chuẩn {', '.join(missing_metrics)}")
        runs.append(RunData(manifest_path.parent, manifest, summary))

    for run_id, count in seen_run_ids.items():
        if run_id and count > 1:
            errors.append(f"run_id trùng lặp: {run_id} xuất hiện {count} lần")

    return sorted(runs, key=lambda run: run.run_id), errors, warnings


def observations_for(runs: Iterable[RunData]) -> list[dict[str, Any]]:
    observations: list[dict[str, Any]] = []
    for run in runs:
        metrics = run.summary["metrics"]
        for metric_key in sorted(metrics):
            metric_payload = metrics[metric_key]
            if not isinstance(metric_payload, dict) or not isinstance(metric_payload.get("values"), dict):
                continue
            metric, tags = parse_metric_name(metric_key)
            contains = str(metric_payload.get("contains", "default"))
            for statistic, raw_value in sorted(metric_payload["values"].items()):
                if isinstance(raw_value, bool) or not isinstance(raw_value, (int, float)):
                    continue
                value = float(raw_value)
                if not math.isfinite(value):
                    continue
                observations.append(
                    {
                        "run_id": run.run_id,
                        "scenario": run.scenario,
                        "rate_limit_variant": run.variant,
                        "metric": metric,
                        "statistic": statistic,
                        "value": value,
                        "unit": statistic_unit(metric, statistic, contains),
                        "tags": json.dumps(tags, ensure_ascii=False, sort_keys=True),
                    }
                )
    return observations


def percentile(values: list[float], probability: float) -> float:
    ordered = sorted(values)
    index = max(0, math.ceil(probability * len(ordered)) - 1)
    return ordered[index]


def resource_observations_for(runs: Iterable[RunData]) -> tuple[list[dict[str, Any]], list[str]]:
    observations: list[dict[str, Any]] = []
    warnings: list[str] = []
    for run in runs:
        artifact = run.manifest.get("artifacts", {})
        resource_value = artifact.get("resource_metrics") if isinstance(artifact, dict) else None
        if not isinstance(resource_value, str) or not resource_value:
            warnings.append(f"{run.run_id}: manifest không khai báo resource_metrics")
            continue
        resource_path = run.directory / resource_value
        try:
            payload = json.loads(resource_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as error:
            warnings.append(f"{run.run_id}: không đọc được resource metrics ({error})")
            continue
        for export_error in payload.get("errors", []):
            warnings.append(f"{run.run_id}: Prometheus export không đầy đủ ({export_error})")
        for query_result in payload.get("queries", []):
            if not isinstance(query_result, dict):
                continue
            metric = str(query_result.get("name", ""))
            unit = str(query_result.get("unit", "value"))
            if not metric:
                continue
            for series in query_result.get("series", []):
                if not isinstance(series, dict):
                    continue
                numeric_values: list[float] = []
                for item in series.get("values", []):
                    if not isinstance(item, list) or len(item) != 2:
                        continue
                    try:
                        value = float(item[1])
                    except (TypeError, ValueError):
                        continue
                    if math.isfinite(value):
                        numeric_values.append(value)
                if not numeric_values:
                    continue
                tags = series.get("metric", {})
                tags_json = json.dumps(tags if isinstance(tags, dict) else {}, ensure_ascii=False, sort_keys=True)
                statistics_by_name = {
                    "min": min(numeric_values),
                    "median": statistics.median(numeric_values),
                    "p(95)": percentile(numeric_values, 0.95),
                    "max": max(numeric_values),
                }
                for statistic, value in statistics_by_name.items():
                    observations.append(
                        {
                            "run_id": run.run_id,
                            "scenario": run.scenario,
                            "rate_limit_variant": run.variant,
                            "metric": metric,
                            "statistic": statistic,
                            "value": value,
                            "unit": unit,
                            "tags": tags_json,
                        }
                    )
    return observations, warnings


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: Iterable[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(fieldnames), extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def comparison_rows(runs: Iterable[RunData], observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
    run_lookup = {run.run_id: run for run in runs}
    rows_by_run: dict[str, dict[str, Any]] = {}
    for run_id, run in run_lookup.items():
        rows_by_run[run_id] = {
            "run_id": run_id,
            "scenario": run.scenario,
            "rate_limit_variant": run.variant,
            "environment": run.manifest["target"]["environment_label"],
            "git_commit": run.manifest["source"]["git_commit"],
            "median_ms": "",
            "p95_ms": "",
            "throughput_rps": "",
            "error_rate": "",
            "victim_p95_ms": "",
            "victim_error_rate": "",
            "cpu_median_ratio": "",
            "rss_max_bytes": "",
            "db_active_connections_max": "",
        }

    for observation in observations:
        if observation["tags"] != "{}":
            continue
        column = COMPARISON_METRICS.get((observation["metric"], observation["statistic"]))
        if column and observation["run_id"] in rows_by_run:
            rows_by_run[observation["run_id"]][column] = observation["value"]
    return [rows_by_run[run_id] for run_id in sorted(rows_by_run)]


def qa_findings(
    runs: list[RunData], comparisons: list[dict[str, Any]], minimum_replicates: int
) -> tuple[list[str], list[str], list[dict[str, Any]]]:
    errors: list[str] = []
    warnings: list[str] = []
    outliers: list[dict[str, Any]] = []
    grouped_runs: dict[tuple[str, str, str], list[RunData]] = defaultdict(list)
    for run in runs:
        environment = str(run.manifest["target"]["environment_label"])
        grouped_runs[(run.scenario, run.variant, environment)].append(run)

    for group, group_runs in sorted(grouped_runs.items()):
        scenario, variant, environment = group
        if scenario != "smoke" and len(group_runs) < minimum_replicates:
            warnings.append(
                f"Nhóm {scenario}/{variant}/{environment} chỉ có {len(group_runs)} lần lặp; "
                f"mức tối thiểu cấu hình là {minimum_replicates}."
            )
        workload_signatures = {
            json.dumps(run.manifest.get("workload", {}), sort_keys=True) for run in group_runs
        }
        target_signatures = {
            json.dumps(run.manifest.get("target", {}), sort_keys=True) for run in group_runs
        }
        if len(workload_signatures) > 1:
            warnings.append(f"Nhóm {scenario}/{variant}/{environment} có tham số workload không đồng nhất.")
        if len(target_signatures) > 1:
            warnings.append(f"Nhóm {scenario}/{variant}/{environment} có target không đồng nhất.")

    comparison_lookup = {row["run_id"]: row for row in comparisons}
    for group, group_runs in sorted(grouped_runs.items()):
        values = [
            (run.run_id, comparison_lookup[run.run_id]["p95_ms"])
            for run in group_runs
            if comparison_lookup[run.run_id]["p95_ms"] != ""
        ]
        if len(values) < 4:
            continue
        numeric_values = [float(value) for _, value in values]
        quartiles = statistics.quantiles(numeric_values, n=4, method="inclusive")
        lower_bound = quartiles[0] - 1.5 * (quartiles[2] - quartiles[0])
        upper_bound = quartiles[2] + 1.5 * (quartiles[2] - quartiles[0])
        for run_id, value in values:
            numeric_value = float(value)
            if numeric_value < lower_bound or numeric_value > upper_bound:
                outliers.append(
                    {
                        "run_id": run_id,
                        "metric": "p95_ms",
                        "value": numeric_value,
                        "method": "Tukey 1.5 IQR",
                        "lower_bound": lower_bound,
                        "upper_bound": upper_bound,
                        "excluded": False,
                    }
                )
    return errors, warnings, outliers


def format_value(value: Any, digits: int = 3) -> str:
    if value == "" or value is None:
        return "—"
    if isinstance(value, (int, float)):
        return f"{value:.{digits}f}"
    return str(value)


def write_report(
    path: Path,
    comparisons: list[dict[str, Any]],
    errors: list[str],
    warnings: list[str],
    outliers: list[dict[str, Any]],
) -> None:
    lines = [
        "# Báo cáo thực nghiệm được tái tạo tự động",
        "",
        "> Tệp này chỉ tổng hợp các run có `data_kind=measured` và `status=succeeded`. "
        "Công cụ không tự điền dữ liệu thiếu và không biến ngưỡng kiểm thử thành kết quả đo.",
        "",
        "## Dữ liệu đầu vào",
        "",
        f"- Số run hợp lệ: {len(comparisons)}",
        f"- Lỗi QA: {len(errors)}",
        f"- Cảnh báo QA: {len(warnings)}",
        f"- Điểm ngoại lệ được gắn cờ (không tự loại): {len(outliers)}",
        "",
        "## Kết quả theo run",
        "",
        "| Run | Kịch bản | Biến thể rate limit | Median (ms) | p95 (ms) | Throughput (req/s) | Error rate | Victim p95 (ms) | Victim error rate | CPU median | RSS max (MiB) | DB active max |",
        "|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for row in comparisons:
        lines.append(
            "| {run_id} | {scenario} | {variant} | {median} | {p95} | {throughput} | {errors} | {victim_p95} | {victim_errors} | {cpu} | {rss} | {connections} |".format(
                run_id=row["run_id"],
                scenario=row["scenario"],
                variant=row["rate_limit_variant"],
                median=format_value(row["median_ms"]),
                p95=format_value(row["p95_ms"]),
                throughput=format_value(row["throughput_rps"]),
                errors=format_value(row["error_rate"], 5),
                victim_p95=format_value(row["victim_p95_ms"]),
                victim_errors=format_value(row["victim_error_rate"], 5),
                cpu=format_value(row["cpu_median_ratio"], 4),
                rss=format_value(
                    float(row["rss_max_bytes"]) / (1024 * 1024) if row["rss_max_bytes"] != "" else ""
                ),
                connections=format_value(row["db_active_connections_max"]),
            )
        )

    lines.extend(["", "## Kiểm tra chất lượng dữ liệu", ""])
    if not errors and not warnings and not outliers:
        lines.append("Không phát hiện vấn đề theo các kiểm tra tự động đã cấu hình.")
    for error in errors:
        lines.append(f"- Lỗi: {error}")
    for warning in warnings:
        lines.append(f"- Cảnh báo: {warning}")
    for outlier in outliers:
        lines.append(
            f"- Ngoại lệ: `{outlier['run_id']}` có {outlier['metric']}={outlier['value']:.3f}; "
            "giữ nguyên trong dữ liệu, cần giải thích trước khi quyết định loại."
        )

    lines.extend(
        [
            "",
            "## Diễn giải",
            "",
            "Báo cáo này trình bày số đo và cờ QA, chưa tự khẳng định phương án Pool hay Silo tốt hơn. "
            "Chỉ diễn giải so sánh sau khi các nhóm có cùng commit, target, workload, seed, đủ số lần lặp "
            "và các sai khác tài nguyên đã được kiểm soát.",
            "",
        ]
    )
    path.write_text("\n".join(lines), encoding="utf-8")


def write_p95_chart(path: Path, comparisons: list[dict[str, Any]]) -> bool:
    values = [(row["run_id"], float(row["p95_ms"])) for row in comparisons if row["p95_ms"] != ""]
    if not values:
        return False
    width = max(800, 120 * len(values) + 140)
    height = 460
    left, right, top, bottom = 90, 30, 45, 115
    chart_width = width - left - right
    chart_height = height - top - bottom
    maximum = max(value for _, value in values)
    scale_max = maximum if maximum > 0 else 1.0
    bar_slot = chart_width / len(values)
    bar_width = max(12.0, bar_slot * 0.58)

    svg = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">',
        '<rect width="100%" height="100%" fill="white"/>',
        '<style>text{font-family:system-ui,sans-serif;fill:#263238}.axis{stroke:#78909c;stroke-width:1}.grid{stroke:#eceff1;stroke-width:1}.bar{fill:#1565c0}</style>',
        f'<text x="{width / 2:.1f}" y="25" text-anchor="middle" font-size="18">HTTP request duration p95 by measured run</text>',
    ]
    for index in range(6):
        fraction = index / 5
        y = top + chart_height * (1 - fraction)
        label = scale_max * fraction
        svg.append(f'<line class="grid" x1="{left}" y1="{y:.2f}" x2="{width - right}" y2="{y:.2f}"/>')
        svg.append(f'<text x="{left - 10}" y="{y + 4:.2f}" text-anchor="end" font-size="11">{label:.1f}</text>')
    svg.append(f'<line class="axis" x1="{left}" y1="{top}" x2="{left}" y2="{top + chart_height}"/>')
    svg.append(f'<line class="axis" x1="{left}" y1="{top + chart_height}" x2="{width - right}" y2="{top + chart_height}"/>')
    svg.append(f'<text x="18" y="{top + chart_height / 2:.1f}" transform="rotate(-90 18 {top + chart_height / 2:.1f})" text-anchor="middle" font-size="12">milliseconds</text>')

    for index, (run_id, value) in enumerate(values):
        x = left + index * bar_slot + (bar_slot - bar_width) / 2
        bar_height = chart_height * value / scale_max
        y = top + chart_height - bar_height
        svg.append(f'<rect class="bar" x="{x:.2f}" y="{y:.2f}" width="{bar_width:.2f}" height="{bar_height:.2f}" rx="2"/>')
        svg.append(f'<text x="{x + bar_width / 2:.2f}" y="{max(top + 12, y - 6):.2f}" text-anchor="middle" font-size="11">{value:.1f}</text>')
        safe_label = html.escape(run_id[:32])
        label_x = x + bar_width / 2
        label_y = top + chart_height + 10
        svg.append(f'<text x="{label_x:.2f}" y="{label_y:.2f}" transform="rotate(45 {label_x:.2f} {label_y:.2f})" text-anchor="start" font-size="10">{safe_label}</text>')
    svg.append("</svg>")
    path.write_text("\n".join(svg) + "\n", encoding="utf-8")
    return True


def run_analysis(input_root: Path, output_root: Path, minimum_replicates: int = 3) -> int:
    runs, load_errors, load_warnings = validate_and_load_runs(input_root)
    if not runs:
        for error in load_errors:
            print(f"error: {error}", file=sys.stderr)
        for warning in load_warnings:
            print(f"warning: {warning}", file=sys.stderr)
        return 2

    output_root.mkdir(parents=True, exist_ok=True)
    observations = observations_for(runs)
    resource_observations, resource_warnings = resource_observations_for(runs)
    observations.extend(resource_observations)
    comparisons = comparison_rows(runs, observations)
    qa_errors, qa_warnings, outliers = qa_findings(runs, comparisons, minimum_replicates)
    all_errors = load_errors + qa_errors
    all_warnings = load_warnings + resource_warnings + qa_warnings

    write_csv(output_root / "observations.csv", observations, OBSERVATION_FIELDS)
    comparison_fields = list(comparisons[0].keys())
    write_csv(output_root / "comparison.csv", comparisons, comparison_fields)
    qa_payload = {
        "schema_version": "1.0.0",
        "input_root": str(input_root),
        "eligible_run_count": len(runs),
        "errors": all_errors,
        "warnings": all_warnings,
        "outliers": outliers,
        "outlier_policy": "Flag only; never remove automatically.",
    }
    (output_root / "qa.json").write_text(
        json.dumps(qa_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    write_report(output_root / "report.md", comparisons, all_errors, all_warnings, outliers)
    write_p95_chart(output_root / "p95-by-run.svg", comparisons)

    print(f"Analyzed {len(runs)} measured run(s) into {output_root}")
    if all_errors:
        print(f"QA found {len(all_errors)} error(s); inspect qa.json", file=sys.stderr)
        return 1
    return 0


def parser() -> argparse.ArgumentParser:
    argument_parser = argparse.ArgumentParser(description=__doc__)
    argument_parser.add_argument("--input", type=Path, default=Path("experiments/results"))
    argument_parser.add_argument("--output", type=Path, default=Path("experiments/derived"))
    argument_parser.add_argument("--minimum-replicates", type=int, default=3)
    return argument_parser


def main() -> int:
    args = parser().parse_args()
    if args.minimum_replicates < 1:
        print("error: --minimum-replicates must be at least 1", file=sys.stderr)
        return 2
    return run_analysis(args.input, args.output, args.minimum_replicates)


if __name__ == "__main__":
    raise SystemExit(main())
