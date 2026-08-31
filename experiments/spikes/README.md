# P2 spike protocol and evidence gate

This directory pre-registers the comparisons required by ADR-0003 through ADR-0005. It contains no
measured result and does not mark Gate B as achieved.

## Registered plans

- `plans/isolation.json`: the three Pool-isolation candidates, both Pool and database-only Silo,
  adversarial cases, three-repeat minimum, measurements, elimination rules, and the weights already
  fixed by ADR-0003.
- `plans/storage.json`: filesystem and MinIO under the same Pool/Silo contract, including namespace,
  quota, expiring download, failure recovery, backup/restore, footprint, and ADR-0005 weights.
- `plans/payment.json`: VNPay Sandbox and Stripe Test Mode contract cases. Credential status and scoring
  weights remain `PENDING_DATA`; the group must approve the weights before the first provider run.

The payment plan intentionally does not infer that local `PAYMENT_PROVIDER=fake` is a real sandbox
credential. Provider evidence must set `credential_backed=true` and carry sanitized artifacts produced
against the corresponding sandbox.

The first runnable slice is `isolation-harness/`, invoked by
`scripts/run-p2-isolation-security.sh`. It runs the guarded Project CRUD contract for all three
isolation candidates on Pool and physical database-per-tenant Silo. Its Surefire output is local
technical evidence only. The harness also exercises deliberate application-guard omission for native,
bulk, and background paths and labels candidate leaks separately from Pool database-guard or Silo
physical-boundary protection. Measured runs remain pending.

## Validation

Validate the tracked protocols:

```bash
scripts/validate-p2-spikes.sh
```

Measured runs belong below the ignored `experiments/results/spikes/` tree. A run directory must contain
`manifest.json` following `experiments/schemas/spike-evidence.schema.json` plus every artifact named by
the matching plan. Every artifact is non-empty, stays inside its run directory, and is bound by SHA-256.
Every comparison also records the same comparison-group, workload fingerprint and environment
fingerprint, with numbered repetitions. The validator rejects dirty-commit evidence, missing adversarial
cases, mandatory cases marked `NOT_APPLICABLE`, failed cases, missing candidates, mixed workload or
environment fingerprints, missing Pool/Silo coverage, and too few repetitions.

```bash
scripts/validate-p2-spikes.sh experiments/results/spikes
scripts/validate-p2-spikes.sh experiments/results/spikes --require-complete
```

The first evidence command checks all available runs. The second is the fail-closed ADR decision gate;
it also rejects unresolved protocol blockers such as payment weights or credentials. Passing it only
means the registered spike evidence is structurally complete. Gate B still requires review of raw
measurements, score calculation, and explicit ADR acceptance by the research group.

Unit tests may create checksum fixtures in an operating-system temporary directory. Those fixtures are
labelled test-only and are never written under `experiments/results/`.
