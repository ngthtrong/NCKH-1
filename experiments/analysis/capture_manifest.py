#!/usr/bin/env python3
"""Create and finalize an experiment manifest without recording credentials."""

from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
RUN_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
WORKLOAD_ENVIRONMENT_KEYS = (
    "BASELINE_VUS",
    "BASELINE_DURATION",
    "LOAD_RATE",
    "LOAD_DURATION",
    "LOAD_PREALLOCATED_VUS",
    "LOAD_MAX_VUS",
    "STRESS_START_VUS",
    "STRESS_PEAK_VUS",
    "STRESS_RAMP_UP",
    "STRESS_HOLD",
    "STRESS_PEAK_RAMP",
    "STRESS_PEAK_HOLD",
    "STRESS_RAMP_DOWN",
    "AGGRESSOR_RATE",
    "AGGRESSOR_PREALLOCATED_VUS",
    "AGGRESSOR_MAX_VUS",
    "VICTIM_RATE",
    "VICTIM_PREALLOCATED_VUS",
    "VICTIM_MAX_VUS",
    "NOISY_DURATION",
    "THINK_TIME_SECONDS",
    "REQUEST_TIMEOUT",
    "SLO_P95_MS",
    "SEED",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def run_command(command: list[str]) -> str | None:
    if shutil.which(command[0]) is None:
        return None
    try:
        completed = subprocess.run(
            command,
            cwd=REPOSITORY_ROOT,
            check=True,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    output = (completed.stdout or completed.stderr).strip()
    return output.splitlines()[0] if output else None


def git_metadata() -> dict[str, Any]:
    commit = run_command(["git", "rev-parse", "HEAD"]) or "unknown"
    if shutil.which("git") is None:
        dirty: bool | None = None
    else:
        try:
            result = subprocess.run(
                ["git", "status", "--porcelain", "--untracked-files=no"],
                cwd=REPOSITORY_ROOT,
                check=True,
                capture_output=True,
                text=True,
                timeout=10,
            )
            dirty = bool(result.stdout.strip())
        except (OSError, subprocess.SubprocessError):
            dirty = None
    return {"git_commit": commit, "git_dirty": dirty}


def memory_bytes() -> int | None:
    try:
        return os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
    except (AttributeError, OSError, ValueError):
        return None


def cpu_model() -> str | None:
    cpu_info = Path("/proc/cpuinfo")
    if cpu_info.exists():
        for line in cpu_info.read_text(encoding="utf-8", errors="replace").splitlines():
            if line.lower().startswith("model name") and ":" in line:
                return line.split(":", 1)[1].strip()
    return platform.processor() or None


def sanitize_url(raw_url: str) -> str:
    parsed = urlsplit(raw_url)
    if not parsed.scheme or not parsed.hostname:
        return raw_url.split("?", 1)[0]
    port = f":{parsed.port}" if parsed.port else ""
    return urlunsplit((parsed.scheme, f"{parsed.hostname}{port}", parsed.path.rstrip("/"), "", ""))


def tenant_hosts() -> list[str]:
    domain = os.environ.get("TENANT_DOMAIN", "localhost")
    hosts: list[str] = []
    for prefix in ("TENANT_A", "TENANT_B", "TENANT_C", "TENANT_D", "TENANT_E"):
        explicit_host = os.environ.get(f"{prefix}_HOST")
        slug = os.environ.get(f"{prefix}_SLUG")
        host = explicit_host or (f"{slug}.{domain}" if slug else None)
        if host and host not in hosts:
            hosts.append(host)
    return hosts


def image_digest(environment_name: str, local_image: str) -> str | None:
    explicit_digest = os.environ.get(environment_name)
    if explicit_digest:
        return explicit_digest
    return run_command(["docker", "image", "inspect", local_image, "--format", "{{.Id}}"])


def atomic_json_write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = path.with_suffix(path.suffix + ".tmp")
    temporary_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary_path.replace(path)


def start_manifest(args: argparse.Namespace) -> int:
    if not RUN_ID_PATTERN.fullmatch(args.run_id):
        raise ValueError("run-id must contain only letters, digits, dots, underscores, or hyphens")

    workload = {
        key.lower(): os.environ[key]
        for key in WORKLOAD_ENVIRONMENT_KEYS
        if os.environ.get(key) not in (None, "")
    }
    payload: dict[str, Any] = {
        "schema_version": "1.0.0",
        "data_kind": "measured",
        "run_id": args.run_id,
        "status": "running",
        "started_at_utc": utc_now(),
        "finished_at_utc": None,
        "scenario": args.scenario,
        "rate_limit_variant": args.variant,
        "source": git_metadata(),
        "target": {
            "environment_label": os.environ.get("EXPERIMENT_ENVIRONMENT", "local"),
            "base_url": sanitize_url(os.environ.get("BASE_URL", "http://127.0.0.1:8080")),
            "tenant_hosts": tenant_hosts(),
        },
        "system": {
            "os": platform.platform(),
            "architecture": platform.machine(),
            "logical_cpu_count": os.cpu_count(),
            "memory_bytes": memory_bytes(),
            "cpu_model": cpu_model(),
        },
        "tools": {
            "python": platform.python_version(),
            "k6": run_command(["k6", "version"]),
            "docker": run_command(["docker", "--version"]),
        },
        "images": {
            "api": image_digest("API_IMAGE_DIGEST", "saas-research-api:local"),
            "web": image_digest("WEB_IMAGE_DIGEST", "saas-research-web:local"),
        },
        "workload": workload,
        "artifacts": {
            "script": args.script,
            "summary": args.summary_file,
            "raw_metrics": args.raw_file,
            "resource_metrics": args.resource_file,
        },
        "notes": os.environ.get("EXPERIMENT_NOTES", ""),
    }
    atomic_json_write(args.output, payload)
    return 0


def finish_manifest(args: argparse.Namespace) -> int:
    payload = json.loads(args.output.read_text(encoding="utf-8"))
    if payload.get("status") != "running":
        raise ValueError(f"manifest is not running: {payload.get('status')}")
    payload["status"] = args.status
    payload["finished_at_utc"] = utc_now()
    atomic_json_write(args.output, payload)
    return 0


def parser() -> argparse.ArgumentParser:
    argument_parser = argparse.ArgumentParser(description=__doc__)
    subparsers = argument_parser.add_subparsers(dest="command", required=True)

    start = subparsers.add_parser("start", help="Capture immutable run context before k6 starts")
    start.add_argument("--output", type=Path, required=True)
    start.add_argument("--run-id", required=True)
    start.add_argument(
        "--scenario",
        choices=("smoke", "baseline", "load", "stress", "noisy-neighbor"),
        required=True,
    )
    start.add_argument("--variant", choices=("not-applicable", "before", "after"), required=True)
    start.add_argument("--script", required=True)
    start.add_argument("--summary-file", required=True)
    start.add_argument("--raw-file", required=True)
    start.add_argument("--resource-file", required=True)
    start.set_defaults(handler=start_manifest)

    finish = subparsers.add_parser("finish", help="Record completion time and final status")
    finish.add_argument("--output", type=Path, required=True)
    finish.add_argument("--status", choices=("succeeded", "failed", "aborted"), required=True)
    finish.set_defaults(handler=finish_manifest)
    return argument_parser


def main() -> int:
    args = parser().parse_args()
    try:
        return args.handler(args)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"manifest error: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
