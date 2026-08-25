#!/usr/bin/env python3
"""Export resource measurements from Prometheus for one completed experiment run."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import urlopen


QUERIES = (
    ("api_cpu_ratio", 'sum(process_cpu_usage{job="saas-api"})', "ratio"),
    ("api_rss_bytes", 'sum(process_resident_memory_bytes{job="saas-api"})', "bytes"),
    ("api_heap_bytes", 'sum(jvm_memory_used_bytes{job="saas-api",area="heap"})', "bytes"),
    ("db_active_connections", 'sum(hikaricp_connections_active{job="saas-api"})', "count"),
    ("db_max_connections", 'sum(hikaricp_connections_max{job="saas-api"})', "count"),
)


def parse_timestamp(value: str) -> float:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()


def sanitized_source(raw_url: str) -> str:
    parsed = urlsplit(raw_url)
    if not parsed.hostname:
        return raw_url.split("?", 1)[0]
    port = f":{parsed.port}" if parsed.port else ""
    return urlunsplit((parsed.scheme, f"{parsed.hostname}{port}", parsed.path.rstrip("/"), "", ""))


def query_range(
    prometheus_url: str, query: str, start: float, end: float, step_seconds: int
) -> list[dict[str, Any]]:
    parameters = urlencode({"query": query, "start": start, "end": end, "step": step_seconds})
    endpoint = f"{prometheus_url.rstrip('/')}/api/v1/query_range?{parameters}"
    with urlopen(endpoint, timeout=20) as response:  # nosec B310: URL is explicitly configured by the operator
        payload = json.load(response)
    if payload.get("status") != "success":
        raise ValueError(payload.get("error") or "Prometheus returned a non-success response")
    data = payload.get("data", {})
    if data.get("resultType") != "matrix" or not isinstance(data.get("result"), list):
        raise ValueError("Prometheus query_range did not return matrix data")
    return data["result"]


def export(manifest_path: Path, output_path: Path, prometheus_url: str, step_seconds: int) -> int:
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest.get("status") != "succeeded":
            raise ValueError("manifest must be finalized with status=succeeded")
        start = parse_timestamp(manifest["started_at_utc"])
        end = parse_timestamp(manifest["finished_at_utc"])
    except (OSError, KeyError, ValueError, json.JSONDecodeError) as error:
        print(f"resource export error: {error}", file=sys.stderr)
        return 2

    query_results: list[dict[str, Any]] = []
    errors: list[str] = []
    for name, query, unit in QUERIES:
        try:
            series = query_range(prometheus_url, query, start, end, step_seconds)
        except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
            errors.append(f"{name}: {error}")
            series = []
        query_results.append({"name": name, "query": query, "unit": unit, "series": series})

    payload = {
        "schema_version": "1.0.0",
        "data_kind": "measured",
        "run_id": manifest["run_id"],
        "source": sanitized_source(prometheus_url),
        "started_at_utc": manifest["started_at_utc"],
        "finished_at_utc": manifest["finished_at_utc"],
        "step_seconds": step_seconds,
        "queries": query_results,
        "errors": errors,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if errors:
        for error in errors:
            print(f"warning: {error}", file=sys.stderr)
        return 1
    print(f"Prometheus measurements saved to {output_path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument(
        "--prometheus-url",
        default=os.environ.get("PROMETHEUS_URL", "http://127.0.0.1:9090"),
    )
    parser.add_argument("--step-seconds", type=int, default=15)
    args = parser.parse_args()
    if args.step_seconds < 1:
        print("resource export error: --step-seconds must be positive", file=sys.stderr)
        return 2
    return export(args.manifest, args.output, args.prometheus_url, args.step_seconds)


if __name__ == "__main__":
    raise SystemExit(main())
