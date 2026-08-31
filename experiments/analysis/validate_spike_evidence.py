#!/usr/bin/env python3
"""Validate pre-registered P2 spike plans and checksum-backed measured evidence."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


PENDING = "PENDING_DATA"
PLAN_VERSION = "1.0.0"
EVIDENCE_VERSION = "1.0.0"


def load_object(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path}: JSON root must be an object")
    return payload


def parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def unique_non_empty_strings(value: Any, label: str, errors: list[str]) -> list[str]:
    if not isinstance(value, list) or not value:
        errors.append(f"{label} must be a non-empty array")
        return []
    strings = [item for item in value if isinstance(item, str) and item]
    if len(strings) != len(value):
        errors.append(f"{label} must contain only non-empty strings")
    duplicates = sorted(item for item, count in Counter(strings).items() if count > 1)
    if duplicates:
        errors.append(f"{label} contains duplicates: {', '.join(duplicates)}")
    return strings


def validate_plan(path: Path) -> tuple[dict[str, Any] | None, list[str], list[str]]:
    errors: list[str] = []
    blockers: list[str] = []
    try:
        plan = load_object(path)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        return None, [str(error)], blockers

    if plan.get("schema_version") != PLAN_VERSION:
        errors.append(f"{path}: schema_version must be {PLAN_VERSION}")
    if plan.get("data_kind") != "spike_protocol":
        errors.append(f"{path}: data_kind must be spike_protocol")
    spike_id = plan.get("spike_id")
    if not isinstance(spike_id, str) or not spike_id:
        errors.append(f"{path}: spike_id is required")
    if plan.get("decision") != PENDING:
        errors.append(f"{path}: tracked plan decision must remain {PENDING}")

    candidates = unique_non_empty_strings(plan.get("candidates"), f"{path}: candidates", errors)
    placements = unique_non_empty_strings(plan.get("placements"), f"{path}: placements", errors)
    required_cases = unique_non_empty_strings(
        plan.get("required_cases"), f"{path}: required_cases", errors
    )
    mandatory_pass_cases = unique_non_empty_strings(
        plan.get("mandatory_pass_cases"), f"{path}: mandatory_pass_cases", errors
    )
    artifact_kinds = unique_non_empty_strings(
        plan.get("required_artifact_kinds"), f"{path}: required_artifact_kinds", errors
    )
    if candidates and len(candidates) < 2:
        errors.append(f"{path}: at least two candidates are required")
    unknown_mandatory_cases = sorted(set(mandatory_pass_cases) - set(required_cases))
    if unknown_mandatory_cases:
        errors.append(
            f"{path}: mandatory_pass_cases are absent from required_cases: "
            f"{', '.join(unknown_mandatory_cases)}"
        )

    minimum_replicates = plan.get("minimum_replicates")
    if not isinstance(minimum_replicates, int) or isinstance(minimum_replicates, bool) or minimum_replicates < 1:
        errors.append(f"{path}: minimum_replicates must be a positive integer")

    rubric = plan.get("rubric")
    weights: list[float] = []
    if not isinstance(rubric, list) or not rubric:
        errors.append(f"{path}: rubric must be a non-empty array")
    else:
        rubric_ids: list[str] = []
        for index, criterion in enumerate(rubric):
            label = f"{path}: rubric[{index}]"
            if not isinstance(criterion, dict):
                errors.append(f"{label} must be an object")
                continue
            criterion_id = criterion.get("id")
            if not isinstance(criterion_id, str) or not criterion_id:
                errors.append(f"{label}.id is required")
            else:
                rubric_ids.append(criterion_id)
            weight = criterion.get("weight_percent")
            if weight is None:
                blockers.append(f"{spike_id or path.name}: rubric weight for {criterion_id or index} awaits approval")
            elif isinstance(weight, bool) or not isinstance(weight, (int, float)) or not math.isfinite(weight) or weight <= 0:
                errors.append(f"{label}.weight_percent must be a positive finite number or null")
            else:
                weights.append(float(weight))
        if len(set(rubric_ids)) != len(rubric_ids):
            errors.append(f"{path}: rubric ids must be unique")
        if len(weights) == len(rubric) and not math.isclose(sum(weights), 100.0, abs_tol=1e-9):
            errors.append(f"{path}: rubric weights must sum to 100, got {sum(weights):g}")

    credential_gate = plan.get("credential_gate")
    if credential_gate is not None:
        if not isinstance(credential_gate, dict):
            errors.append(f"{path}: credential_gate must be an object")
        elif credential_gate.get("status") != PENDING:
            errors.append(f"{path}: tracked credential gate must remain {PENDING}")
        else:
            blockers.append(f"{spike_id or path.name}: sandbox credentials are not recorded as supplied")

    return plan, errors, blockers


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_artifacts(
    manifest_path: Path, artifacts: Any, required_kinds: set[str], errors: list[str]
) -> None:
    if not isinstance(artifacts, list) or not artifacts:
        errors.append(f"{manifest_path}: artifacts must be a non-empty array")
        return

    seen_kinds: set[str] = set()
    for index, artifact in enumerate(artifacts):
        label = f"{manifest_path}: artifacts[{index}]"
        if not isinstance(artifact, dict):
            errors.append(f"{label} must be an object")
            continue
        kind = artifact.get("kind")
        relative = artifact.get("path")
        expected = artifact.get("sha256")
        if not isinstance(kind, str) or not kind:
            errors.append(f"{label}.kind is required")
            continue
        seen_kinds.add(kind)
        if not isinstance(relative, str) or not relative:
            errors.append(f"{label}.path is required")
            continue
        candidate_path = (manifest_path.parent / relative).resolve()
        try:
            candidate_path.relative_to(manifest_path.parent.resolve())
        except ValueError:
            errors.append(f"{label}.path escapes the evidence run directory")
            continue
        if not candidate_path.is_file() or candidate_path.stat().st_size == 0:
            errors.append(f"{label}.path is missing or empty: {relative}")
            continue
        if not isinstance(expected, str) or len(expected) != 64:
            errors.append(f"{label}.sha256 must contain 64 hexadecimal characters")
            continue
        try:
            int(expected, 16)
        except ValueError:
            errors.append(f"{label}.sha256 is not hexadecimal")
            continue
        actual = sha256(candidate_path)
        if actual.lower() != expected.lower():
            errors.append(f"{label}.sha256 does not match {relative}")

    missing = sorted(required_kinds - seen_kinds)
    if missing:
        errors.append(f"{manifest_path}: missing artifact kinds: {', '.join(missing)}")


def validate_manifest(
    manifest_path: Path, plan: dict[str, Any]
) -> tuple[dict[str, Any] | None, list[str]]:
    errors: list[str] = []
    try:
        manifest = load_object(manifest_path)
    except (OSError, json.JSONDecodeError, ValueError) as error:
        return None, [str(error)]

    if manifest.get("schema_version") != EVIDENCE_VERSION:
        errors.append(f"{manifest_path}: schema_version must be {EVIDENCE_VERSION}")
    if manifest.get("data_kind") != "measured_spike":
        errors.append(f"{manifest_path}: data_kind must be measured_spike")
    if manifest.get("spike_id") != plan.get("spike_id"):
        errors.append(f"{manifest_path}: spike_id does not match its plan")
    if manifest.get("status") != "succeeded":
        errors.append(f"{manifest_path}: only status=succeeded can support a decision")

    run_id = manifest.get("run_id")
    if not isinstance(run_id, str) or not run_id:
        errors.append(f"{manifest_path}: run_id is required")
    candidate = manifest.get("candidate")
    if candidate not in plan.get("candidates", []):
        errors.append(f"{manifest_path}: unknown candidate {candidate!r}")
    placement = manifest.get("placement")
    if placement not in plan.get("placements", []):
        errors.append(f"{manifest_path}: unknown placement {placement!r}")
    replicate = manifest.get("replicate")
    if not isinstance(replicate, int) or isinstance(replicate, bool) or replicate < 1:
        errors.append(f"{manifest_path}: replicate must be a positive integer")

    for field in ("comparison_group", "workload_fingerprint", "environment_fingerprint"):
        value = manifest.get(field)
        if not isinstance(value, str) or not value:
            errors.append(f"{manifest_path}: {field} is required")
    for field in ("workload_fingerprint", "environment_fingerprint"):
        value = manifest.get(field)
        if isinstance(value, str):
            try:
                valid_digest = len(value) == 64 and int(value, 16) >= 0
            except ValueError:
                valid_digest = False
            if not valid_digest:
                errors.append(f"{manifest_path}: {field} must be a SHA-256 digest")

    started = parse_datetime(manifest.get("started_at_utc"))
    finished = parse_datetime(manifest.get("finished_at_utc"))
    if started is None or finished is None or finished < started:
        errors.append(f"{manifest_path}: timestamps are missing, invalid, or reversed")

    source = manifest.get("source")
    if (
        not isinstance(source, dict)
        or not isinstance(source.get("git_commit"), str)
        or not source.get("git_commit")
    ):
        errors.append(f"{manifest_path}: source.git_commit is required")
    elif source.get("git_dirty") is not False:
        errors.append(f"{manifest_path}: decision evidence must come from a clean commit")

    environment = manifest.get("environment")
    if not isinstance(environment, dict):
        errors.append(f"{manifest_path}: environment is required")
    else:
        for field in ("label", "postgresql_version", "cpu"):
            value = environment.get(field)
            if not isinstance(value, str) or not value:
                errors.append(f"{manifest_path}: environment.{field} is required")
        memory = environment.get("memory_bytes")
        if not isinstance(memory, int) or isinstance(memory, bool) or memory < 1:
            errors.append(f"{manifest_path}: environment.memory_bytes must be a positive integer")

    case_results = manifest.get("case_results")
    if not isinstance(case_results, dict):
        errors.append(f"{manifest_path}: case_results must be an object")
    else:
        missing_cases = sorted(set(plan.get("required_cases", [])) - set(case_results))
        if missing_cases:
            errors.append(f"{manifest_path}: missing required cases: {', '.join(missing_cases)}")
        unknown_cases = sorted(set(case_results) - set(plan.get("required_cases", [])))
        if unknown_cases:
            errors.append(f"{manifest_path}: unregistered cases: {', '.join(unknown_cases)}")
        failed_cases = sorted(
            case for case, result in case_results.items() if result not in ("PASS", "NOT_APPLICABLE")
        )
        if failed_cases:
            errors.append(f"{manifest_path}: non-passing cases: {', '.join(failed_cases)}")
        mandatory_not_passed = sorted(
            case
            for case in plan.get("mandatory_pass_cases", [])
            if case_results.get(case) != "PASS"
        )
        if mandatory_not_passed:
            errors.append(
                f"{manifest_path}: mandatory cases must be PASS: {', '.join(mandatory_not_passed)}"
            )

    if plan.get("credential_gate") is not None and manifest.get("credential_backed") is not True:
        errors.append(f"{manifest_path}: payment evidence must be credential_backed=true")

    validate_artifacts(
        manifest_path,
        manifest.get("artifacts"),
        set(plan.get("required_artifact_kinds", [])),
        errors,
    )
    return manifest, errors


def validate_evidence_root(
    plans: list[dict[str, Any]], evidence_root: Path, require_complete: bool = False
) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    findings: list[str] = []
    plans_by_id = {str(plan["spike_id"]): plan for plan in plans}
    manifests_by_spike: dict[str, list[dict[str, Any]]] = defaultdict(list)
    manifest_paths = sorted(evidence_root.rglob("manifest.json")) if evidence_root.exists() else []
    if not manifest_paths:
        return [f"No measured spike manifest found in {evidence_root}"], findings

    seen_run_ids: set[str] = set()
    for path in manifest_paths:
        try:
            raw = load_object(path)
        except (OSError, json.JSONDecodeError, ValueError) as error:
            errors.append(str(error))
            continue
        spike_id = raw.get("spike_id")
        plan = plans_by_id.get(str(spike_id))
        if plan is None:
            errors.append(f"{path}: no registered plan for spike_id={spike_id!r}")
            continue
        manifest, manifest_errors = validate_manifest(path, plan)
        errors.extend(manifest_errors)
        if manifest is None or manifest_errors:
            continue
        run_id = str(manifest["run_id"])
        if run_id in seen_run_ids:
            errors.append(f"Duplicate spike run_id: {run_id}")
            continue
        seen_run_ids.add(run_id)
        manifests_by_spike[str(spike_id)].append(manifest)

    for spike_id, plan in plans_by_id.items():
        spike_manifests = manifests_by_spike.get(spike_id, [])
        for fingerprint_field in ("comparison_group", "workload_fingerprint", "environment_fingerprint"):
            values = {str(item[fingerprint_field]) for item in spike_manifests}
            if len(values) > 1:
                errors.append(f"{spike_id}: {fingerprint_field} differs across comparison runs")
        counts = Counter(
            (str(item["candidate"]), str(item["placement"]))
            for item in spike_manifests
        )
        replicate_keys = [
            (str(item["candidate"]), str(item["placement"]), int(item["replicate"]))
            for item in spike_manifests
        ]
        duplicate_replicates = sorted(
            key for key, count in Counter(replicate_keys).items() if count > 1
        )
        if duplicate_replicates:
            errors.append(f"{spike_id}: duplicate candidate/placement/replicate records")
        if not require_complete:
            findings.append(f"{spike_id}: {len(spike_manifests)} valid measured runs")
            continue
        minimum = int(plan["minimum_replicates"])
        for candidate in plan["candidates"]:
            for placement in plan["placements"]:
                count = counts[(candidate, placement)]
                if count < minimum:
                    errors.append(
                        f"{spike_id}: {candidate}/{placement} has {count} measured run(s); {minimum} required"
                    )
                replicates = {
                    int(item["replicate"])
                    for item in spike_manifests
                    if item["candidate"] == candidate and item["placement"] == placement
                }
                expected = set(range(1, minimum + 1))
                if not expected.issubset(replicates):
                    errors.append(
                        f"{spike_id}: {candidate}/{placement} lacks numbered replicates "
                        f"{sorted(expected - replicates)}"
                    )
        findings.append(f"{spike_id}: {len(spike_manifests)} valid measured runs")
    return errors, findings


def discover_plans(plan_root: Path) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    plans: list[dict[str, Any]] = []
    errors: list[str] = []
    blockers: list[str] = []
    paths = sorted(plan_root.glob("*.json")) if plan_root.exists() else []
    if not paths:
        return plans, [f"No spike plan found in {plan_root}"], blockers
    for path in paths:
        plan, plan_errors, plan_blockers = validate_plan(path)
        errors.extend(plan_errors)
        blockers.extend(plan_blockers)
        if plan is not None and not plan_errors:
            plans.append(plan)
    ids = [str(plan["spike_id"]) for plan in plans]
    duplicates = sorted(item for item, count in Counter(ids).items() if count > 1)
    if duplicates:
        errors.append(f"Duplicate spike ids: {', '.join(duplicates)}")
    return plans, errors, blockers


def run_validation(plan_root: Path, evidence_root: Path | None, require_complete: bool) -> int:
    plans, errors, blockers = discover_plans(plan_root)
    for error in errors:
        print(f"ERROR: {error}", file=sys.stderr)
    if errors:
        return 2

    print(f"Validated {len(plans)} pre-registered P2 spike plan(s).")
    for blocker in blockers:
        print(f"BLOCKED: {blocker}")

    if evidence_root is not None:
        evidence_errors, findings = validate_evidence_root(plans, evidence_root, require_complete)
        for finding in findings:
            print(f"EVIDENCE: {finding}")
        for error in evidence_errors:
            print(f"ERROR: {error}", file=sys.stderr)
        if evidence_errors:
            return 2
    elif require_complete:
        print("ERROR: --require-complete also requires --evidence-root", file=sys.stderr)
        return 2

    if require_complete and blockers:
        print("ERROR: P2 decision remains blocked by unresolved pre-registered fields", file=sys.stderr)
        return 2
    print("P2 protocol validation passed; this does not mark Gate B as achieved.")
    return 0


def parser() -> argparse.ArgumentParser:
    argument_parser = argparse.ArgumentParser(description=__doc__)
    argument_parser.add_argument("--plan-root", type=Path, required=True)
    argument_parser.add_argument("--evidence-root", type=Path)
    argument_parser.add_argument("--require-complete", action="store_true")
    return argument_parser


def main() -> int:
    args = parser().parse_args()
    return run_validation(args.plan_root, args.evidence_root, args.require_complete)


if __name__ == "__main__":
    raise SystemExit(main())
