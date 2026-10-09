# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project context

Research project (NCKH): a multi-tenant SaaS task-management app (Kanban) built to compare tenant
data-isolation placements. Most docs are in Vietnamese. **Read `docs/PROJECT_STATUS.md` first** — it is
the authoritative resume point (current milestone, test counts, deferred work) and should be updated
after any significant milestone.

Placement terminology (fixed, see `resource/chuan_hoa_thuat_ngu.md`):

- `POOL` = shared database, shared schema, shared tables (isolation via `tenant_id` + PostgreSQL RLS)
- `SCHEMA_PER_TENANT` = shared `schema_db`, one schema + runtime role per tenant
- `SILO_DATABASE` = one database per tenant (database-only silo; compute/storage/identity stay shared)
- "Bridge" = the system running all three at once. The control DB is always shared.

## Commands

Backend (`apps/api`, Java 21, Spring Boot 4, Maven wrapper):

```bash
cd apps/api
./mvnw -B -ntp test                                  # all tests
./mvnw -B -ntp verify                                # what CI runs
./mvnw -B -ntp test -Dtest=RowLevelSecurityTest      # single class
./mvnw -B -ntp test -Dtest='PaymentServiceTest#methodName'
```

Integration tests use Testcontainers with `@Testcontainers(disabledWithoutDocker = true)` — **without a
working Docker daemon they are silently skipped, not failed.** Check the surefire summary for skips
before claiming a green run. On WSL, Docker Desktop with WSL integration must be running.

Frontend (`apps/web`, Node ≥ 22.12, React 19 + Vite + Vitest):

```bash
cd apps/web
npm ci
npm run api:check        # fails if src/api/generated.ts drifts from docs/api/openapi.yaml
npm run lint             # tsc -b (type check only; no ESLint)
npm test                 # vitest run
npx vitest run src/pages/LoginPage.test.tsx   # single test file
npm run build
npm run dev              # :5173, proxies /api to VITE_API_PROXY_TARGET (default :8080)
E2E_ENV_FILE=../../infra/.env npm run test:e2e   # Playwright; needs running stack (see below)
```

Full local stack (Docker Compose: PostgreSQL 18, api, worker, web, Caddy, MinIO, Mailpit, Prometheus, Grafana):

```bash
scripts/dev-up.sh        # creates infra/.env from infra/.env.example if missing, builds, waits for health
scripts/dev-down.sh      # stops, keeps volumes
docker compose --env-file infra/.env -f infra/compose.yaml logs --follow api worker
node scripts/verify-extension-workflow.mjs   # smoke: 3 placements + capabilities (self-cleaning)
node scripts/verify-p-app-workflow.mjs       # smoke: core app regression
scripts/validate-infra.sh                    # JSON/Python checks, experiment unit tests, compose config
```

Entry points: `http://accounts.localhost:8080` (login), tenants at `pool-demo.`, `schema-demo.`,
`silo-demo.localhost:8080`. Seed credentials are `DEMO_OWNER_*` in `infra/.env`. Never use
`docker compose down --volumes` to fix startup/migration problems, and never hand-edit placement rows in
the control DB — the worker/System Admin UI owns that state.

## Architecture

Modular monolith, one codebase (`vn.edu.ctu.saas`) deployed as **two processes**:

- **API** (default profile): REST, auth, business transactions. Its DB roles have no `CREATEDB`/`BYPASSRLS`.
- **Worker** (`worker` profile, `application-worker.yml`, no web server): all `@Profile("worker")`
  `@Scheduled` pollers — provisioning, application-outbox dispatch, application schema upgrades,
  customization DDL, demo seeding. Only the worker gets the privileged provisioner credential.

### Two data planes

- **Control plane** (`control_db`): users, tenants, memberships, placements, capabilities, payments,
  provisioning jobs, sessions. JPA entities live **only** in the `control` package. Migrations:
  `db/migration/control` (applied by Spring's Flyway at startup).
- **Application plane** (per placement): projects/boards/tasks/resources/notifications/outbox/customization.
  **No JPA here** — all access is raw SQL via `TenantJdbcExecutor`. Migrations: `db/migration/application`,
  applied per placement by `TenantDatabaseProvisioner` (new tenants) and `ApplicationSchemaMigrationWorker`
  (upgrading existing `ACTIVE` placements). Never open one transaction spanning both databases.

### Tenant request path

1. `TenantHostResolver` derives the tenant slug from the `Host` subdomain.
2. JWT (`kind=tenant`) is validated; `TenantContextFilter` requires token `tenant_slug` == host slug,
   tenant `ACTIVE`, active membership, and matching `membership_version` (role changes/revocation take
   effect on the next request). It builds an immutable `TenantContext` in `TenantContextHolder` and
   always clears it in `finally`.
3. Services call `TenantJdbcExecutor.read/write`, which gets a connection from
   `DefaultTenantDataSourceResolver` (shared Hikari pool for Pool; lazily created, capped, idle-evicted
   Hikari pools for Schema/Silo using encrypted credentials from `tenant_placements`), then sets
   transaction-local `app.tenant_id`, `app.user_id`, `app.correlation_id` and `search_path`.

Tenant identity must never come from a DTO, query param, or payload — business APIs derive it from
host + token only (frontend DTOs deliberately have no `tenantId`). Project-level permissions are re-checked
against application-DB `project_memberships`, not token claims.

Background jobs have no request, so workers (`OutboxWorker`, `CustomizationSchemaWorker`, etc.) set a
`TenantContext` manually and restore/clear it afterward — follow that pattern for any new tenant-scoped job.

### Rules when changing the application schema

- Every application table needs `tenant_id uuid NOT NULL`, and (for Pool) must be included in the
  migration's RLS loop: `ENABLE` + `FORCE ROW LEVEL SECURITY` with the `tenant_isolation` policy on
  `current_setting('app.tenant_id')`. Silo/Schema keep `tenant_id` too as defense in depth.
- The same migration set runs on all three placements — it must work under `search_path` = tenant schema.
- **Bump `TenantDatabaseProvisioner.LATEST_APPLICATION_SCHEMA_VERSION`** when adding a `V<n>` application
  migration. Outbox dispatch, capability changes and customization DDL skip any placement whose
  `schema_version` doesn't equal this constant.
- Business mutations and their `outbox_events` row are written in the same local transaction; delivery is
  at-least-once, so consumers must be idempotent.

### Other cross-cutting pieces

- **Provisioning**: payment webhook → provisioning job in control DB → worker claims with `SKIP LOCKED` +
  lease/heartbeat, short transactions around external DDL, idempotent retry, rollback that only removes
  resources the job created (`FAILED_ROLLED_BACK` vs `ROLLBACK_FAILED`).
- **Capabilities** (`BRANDING`, `CUSTOM_DATA`, `APPROVALS`, `AUTOMATION`) are independent of placement but
  bounded by it server-side: Pool → Branding only; Schema → + Custom Data; Silo → all four. Both API and
  worker re-check the current capability state.
- **Custom data**: metadata lives in the application schema; the worker creates real tables/columns with
  physical names derived from UUIDs (`TenantDdlExecutor`). Runtime roles only have DML.
- **Pluggable adapters** selected by properties: `PaymentProvider` (`app.payment.provider=fake` is the only
  implementation), `ResourceStorage` (`minio` default / `filesystem`), `NotificationDispatcher`. Storage
  keys are server-generated `<tenant>/<resource>/<name>`; downloads use signed URLs.

### API contract

`docs/api/openapi.yaml` is the source of truth. After changing a backend endpoint/DTO, update the spec,
run `npm run api:generate`, and consume the types in `apps/web/src/api/types.ts` / `endpoints.ts`
(which alias `components['schemas']` from `generated.ts`). CI fails on drift via `api:check`. Never
hand-edit `generated.ts`.

Frontend: access token held in memory only; refresh token is an `HttpOnly` host-only cookie; mutating
requests send the `XSRF-TOKEN` cookie as `X-CSRF-TOKEN`. Login happens on the accounts host, then a
one-time transfer code is exchanged on the tenant subdomain (`/auth/exchange`).

## Research-integrity constraints

These come from `docs/PROJECT_STATUS.md` and the research protocol and apply to any edit:

- Never fabricate measurements, DOIs, survey/SUS results, or experiment outputs. Keep `UNVERIFIED` labels
  until a source is actually verified. `experiments/results/` and `experiments/derived/` are git-ignored.
- Local tests/smoke runs are technical regression checks, not research evidence — don't mark research
  gates (A/B/E), SLOs, or ADRs 0003–0005 as passed/`Accepted` based on them.
- Real payment providers (VNPay/Stripe), VPS/Internet deployment, P2 measurement, pilots and user studies
  are deliberately paused; don't start them without an explicit decision from the team.
- Don't recreate `resource/important.md`, `resource/thuyet_minh_SaaS.md`, or `draft.md` (intentionally removed).
