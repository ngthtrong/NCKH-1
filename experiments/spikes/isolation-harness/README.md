# Project CRUD isolation security harness

This standalone Maven harness implements the same minimal Project CRUD contract for the three
ADR-0003 candidates:

- explicit tenant predicates;
- Hibernate `@Filter` plus explicit guards for native/bulk escape hatches;
- PostgreSQL RLS plus application predicates.

Each candidate is exercised against a shared-database/shared-schema Pool and two physical
database-per-tenant Silo databases on PostgreSQL 18. The security contract checks create/list/read,
known-foreign-ID update/delete, guarded native query, bulk/background mutation, connection/context
reset, runtime-role privileges, and RLS owner/superuser negative controls. It also deliberately removes
the application predicate/filter from native-query, bulk-update, and background-job paths. The
Surefire output labels each observation as a candidate cross-tenant leak, Pool database-guard
protection, or Silo physical-database protection; a passing harness assertion does not relabel a
reproduced candidate leak as a security pass.

Run it separately from the application backend suite:

```bash
scripts/run-p2-isolation-security.sh
```

The harness writes only Maven/Surefire build output below its ignored `target/` directory. It does not
collect latency, RAM, connections, or a research score, and its local pass does not accept ADR-0003 or
Gate B. A later measured run must use the pre-registered manifest/checksum gate in
`experiments/spikes/README.md`.
