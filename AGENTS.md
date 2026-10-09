# Repository Guidelines

## Project Structure & Module Organization

Read `docs/PROJECT_STATUS.md` before contributing; update it after significant milestones.

- `apps/api`: Java 21/Spring Boot API and worker; source in `src/main/java`, Flyway migrations in `src/main/resources/db/migration`, tests in `src/test/java`.
- `apps/web`: React/TypeScript SPA; components, pages, API clients, and styles in `src`; Playwright scenarios in `e2e`.
- `infra` and `scripts`: Docker Compose, monitoring, runbooks, and development/validation scripts.
- `experiments`: k6 workloads, Python analysis, schemas, and `tests`.
- `docs` and `resource`: architecture, OpenAPI contract, research protocols, and project plans.
- `reportTemplate`: standalone LaTeX reports; figures and diagrams belong in `assets`.

## Build, Test, and Development Commands

Use Java 21, Node.js ≥22.12, and Docker Compose v2.

- Root: `scripts/dev-up.sh` builds/starts the stack and creates `infra/.env` if missing; `scripts/dev-down.sh` stops it while preserving volumes.
- `apps/api`: `./mvnw -B -ntp verify` runs backend verification used by CI.
- `apps/web`: `npm ci`, then `npm run api:check`, `npm run lint`, `npm test`, and `npm run build` validate contracts, types, tests, and production output. `npm run dev` starts Vite on port 5173.
- Root: `scripts/validate-infra.sh` validates infrastructure and runs experiment unit tests.
- Root: `make -C reportTemplate all` builds reports; `make -C reportTemplate check` validates PDFs.

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF, spaces, two-space indentation; Java uses four spaces. Use PascalCase classes/components and camelCase functions/variables. Keep Java packages under `vn.edu.ctu.saas`. Frontend linting is TypeScript checking; no ESLint or formatter is configured.

Treat `docs/api/openapi.yaml` as authoritative. Update it with endpoint changes, then run `npm run api:generate` in `apps/web`; never edit `src/api/generated.ts` manually.

## Testing Guidelines

Use JUnit/Testcontainers (`*Test.java`, `*IntegrationTest.java`), Vitest/Testing Library (`*.test.ts[x]`), Playwright (`*.e2e.ts`), and Python unittest (`test_*.py`). No numeric coverage threshold is configured. Add regression tests for changed behavior, especially isolation and authorization. Docker-dependent integration tests skip without Docker; inspect skipped counts. With the stack running, execute `E2E_ENV_FILE=../../infra/.env npm run test:e2e` from `apps/web`.

## Commit & Pull Request Guidelines

Recent history uses `feat:`, `docs:`, and `chore:` alongside informal messages; prefer concise, descriptive prefixed commits. PRs should explain behavior changes, link relevant issues, report checks/skips, and include screenshots for UI changes. Pass applicable CI checks.

## Security & Research Integrity

Derive business tenant identity from host/token; use `TenantJdbcExecutor` for application-plane SQL. Preserve RLS across all placements. Keep secrets, participant data, and raw measurements out of Git. Never fabricate research evidence or equate local tests with research gates.
