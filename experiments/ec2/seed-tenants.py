#!/usr/bin/env python3
"""
Seed 5 Tenants and 10-20 Active Users per Tenant for EC2 Benchmark.
Matches the scientific research proposal:
- 3 to 5 simulated tenants
- 10 to 20 concurrent active user accounts per tenant
Output: experiments/ec2/fixtures-ec2.json
"""

import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
os.chdir(ROOT)

PG_CONTAINER = os.environ.get("POSTGRES_CONTAINER", "saas-research-postgres-1")
API_HOST = os.environ.get("API_HOST", "127.0.0.1")
API_PORT = os.environ.get("HTTP_PORT", "8080")
ACCOUNTS_HOST = f"accounts.localhost:{API_PORT}"

# Definition of the 5 tenants with scale
TENANTS_SPEC = [
    {
        "slug": "t-acme",
        "name": "Acme Software (Small)",
        "tier": "STARTER",
        "role": "small",
        "users_count": 15,
        "boards_count": 1,
        "tasks_per_board": 200,
        "custom_data": "jsonb_build_object('story_points', 8, 'sprint', 'Sprint 1')",
        "wip_mode": "STRICT",
        "wip_limit": 2
    },
    {
        "slug": "pool-demo",
        "name": "CTU Project Pool (Medium)",
        "tier": "STARTER",
        "role": "medium",
        "users_count": 15,
        "boards_count": 4,
        "tasks_per_board": 125,  # Total 500 tasks
        "custom_data": "'{}'::jsonb",
        "wip_mode": "WARN",
        "wip_limit": 5
    },
    {
        "slug": "t-lotus",
        "name": "Lotus Media (Large)",
        "tier": "PROFESSIONAL",
        "role": "large",
        "users_count": 20,
        "boards_count": 10,
        "tasks_per_board": 100,  # Total 1,000 tasks
        "custom_data": "jsonb_build_object('channel', 'Web', 'budget_usd', 800)",
        "wip_mode": "WARN",
        "wip_limit": 10
    },
    {
        "slug": "t-finance",
        "name": "FinTech Core (Standard)",
        "tier": "PROFESSIONAL",
        "role": "standard",
        "users_count": 10,
        "boards_count": 2,
        "tasks_per_board": 150,  # Total 300 tasks
        "custom_data": "jsonb_build_object('department', 'Risk', 'priority_score', 95)",
        "wip_mode": "STRICT",
        "wip_limit": 4
    },
    {
        "slug": "t-aggressor",
        "name": "Noisy Neighbor (Spike Traffic)",
        "tier": "STARTER",
        "role": "aggressor",
        "users_count": 20,
        "boards_count": 1,
        "tasks_per_board": 100,
        "custom_data": "'{}'::jsonb",
        "wip_mode": "WARN",
        "wip_limit": 10
    }
]

def run_psql(db, sql_query):
    """Execute SQL query in postgres container."""
    cmd = [
        "docker", "exec", "-i", PG_CONTAINER,
        "psql", "-U", "postgres", "-d", db, "-v", "ON_ERROR_STOP=1", "-qAt"
    ]
    res = subprocess.run(cmd, input=sql_query, text=True, capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(f"PSQL Error ({db}): {res.stderr}\nQuery was:\n{sql_query[:300]}")
    return res.stdout.strip()

def http_post(url, payload, headers):
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8")
        raise RuntimeError(f"HTTP {e.code} for {url}: {err}")

def get_tenant_token(email, password, tenant_slug):
    """Login and transfer to get tenant session token."""
    # 1. Login to control plane
    login_url = f"http://{API_HOST}:{API_PORT}/api/v1/auth/login"
    login_resp = http_post(
        login_url,
        {"email": email, "password": password},
        {"Host": ACCOUNTS_HOST, "Content-Type": "application/json"}
    )
    control_token = login_resp["accessToken"]

    # 2. Request tenant transfer
    transfer_url = f"http://{API_HOST}:{API_PORT}/api/v1/auth/tenant-transfer"
    transfer_resp = http_post(
        transfer_url,
        {"tenantSlug": tenant_slug},
        {
            "Host": ACCOUNTS_HOST,
            "Authorization": f"Bearer {control_token}",
            "Content-Type": "application/json"
        }
    )
    redirect_url = transfer_resp["redirectUrl"]
    
    # 3. Exchange code on tenant host
    # Extract code and host
    import urllib.parse
    parsed = urllib.parse.urlparse(redirect_url)
    qs = urllib.parse.parse_qs(parsed.query)
    code = qs["code"][0]
    tenant_host = parsed.netloc

    exchange_url = f"http://{API_HOST}:{API_PORT}/api/v1/auth/exchange"
    exchange_resp = http_post(
        exchange_url,
        {"code": code},
        {"Host": tenant_host, "Content-Type": "application/json"}
    )
    return {
        "accessToken": exchange_resp["accessToken"],
        "tenantId": exchange_resp["activeTenant"]["id"],
        "host": tenant_host
    }

def main():
    print("=" * 60)
    print("SEEDING 5 TENANTS & 10-20 USERS PER TENANT FOR EC2 BENCHMARK")
    print("=" * 60)

    # 1. Read DEMO_OWNER_PASSWORD from infra/.env to use as the shared benchmark password.
    env_file = ROOT / "infra" / ".env"
    demo_password = None
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            if line.startswith("DEMO_OWNER_PASSWORD="):
                demo_password = line.split("=", 1)[1].strip().strip('"').strip("'")
                break
    if not demo_password:
        demo_password = "ChangeMe123!"

    # Verified Spring Security BCryptPasswordEncoder(10) hash for "ChangeMe123!"
    DEFAULT_CHANGEME123_HASH = "$2a$10$..QXS1ISiQAsnpbv0/fUk.0bY34XqckqUV/Uv2g7XHTlkSt5vKC0."

    # Poll up to 30 seconds for worker container to initialize control_db
    print("[*] Waiting for control_db initialization...")
    owner_hash = None
    for attempt in range(15):
        try:
            owner_hash = run_psql("control_db", "SELECT password_hash FROM user_accounts LIMIT 1;")
            if owner_hash and owner_hash.startswith("$2"):
                print(f"    [✓] Worker initialized demo user in control_db (attempt {attempt + 1}).")
                break
        except Exception:
            pass
        time.sleep(2)

    # Fallback to precomputed BCrypt hash if worker hasn't finished yet and default password is used
    if not owner_hash:
        if demo_password == "ChangeMe123!":
            print("    [*] Worker still initializing; using verified Spring BCrypt hash for ChangeMe123!.")
            owner_hash = DEFAULT_CHANGEME123_HASH
        else:
            # Poll another 30 seconds if custom password was provided
            print("    [*] Waiting additional 30s for custom password hash from worker...")
            for _ in range(15):
                time.sleep(2)
                try:
                    owner_hash = run_psql("control_db", "SELECT password_hash FROM user_accounts LIMIT 1;")
                    if owner_hash and owner_hash.startswith("$2"):
                        break
                except Exception:
                    pass
            if not owner_hash:
                raise RuntimeError("Could not obtain password hash from control_db. Check worker container.")

    # Ensure demo owner exists in control_db
    run_psql("control_db", f"""
    INSERT INTO user_accounts (id, email, display_name, password_hash, enabled, system_admin, created_at, updated_at)
    VALUES (gen_random_uuid(), 'owner@example.test', 'Demo Owner', '{owner_hash}', true, true, now(), now())
    ON CONFLICT (email) DO UPDATE SET password_hash = '{owner_hash}', enabled = true, system_admin = true;
    """)

    fixtures = {"tenants": {}, "summary": {}}

    for spec in TENANTS_SPEC:
        slug = spec["slug"]
        name = spec["name"]
        tier = spec["tier"]
        user_count = spec["users_count"]
        print(f"\n[+] Seeding Tenant: {slug} ({name}) - {user_count} Users, {spec['boards_count']} Board(s)...")

        # A. Upsert Tenant in control_db
        tenant_sql = f"""
        DO $$
        DECLARE
            t_id uuid;
        BEGIN
            SELECT id INTO t_id FROM tenants WHERE slug = '{slug}';
            IF t_id IS NULL THEN
                t_id := gen_random_uuid();
                INSERT INTO tenants (id, slug, name, tier, status, created_at, updated_at)
                VALUES (t_id, '{slug}', '{name}', '{tier}', 'ACTIVE', now(), now());
                
                INSERT INTO tenant_placements (id, tenant_id, placement_type, created_at, updated_at)
                VALUES (gen_random_uuid(), t_id, 'POOL', now(), now());
            ELSE
                UPDATE tenants SET status = 'ACTIVE', tier = '{tier}', updated_at = now() WHERE id = t_id;
            END IF;
        END $$;
        SELECT id FROM tenants WHERE slug = '{slug}';
        """
        tenant_id = run_psql("control_db", tenant_sql)

        # B. Upsert Users & Memberships for this tenant
        user_emails = []
        user_password = demo_password   # Use the same password as the demo owner
        
        user_sql = "BEGIN;\n"
        for u_idx in range(1, user_count + 1):
            email = f"user{u_idx}@{slug}.test"
            display_name = f"{slug.title()} Member {u_idx}"
            user_emails.append(email)
            role = "ADMIN" if u_idx == 1 else "MEMBER"
            user_sql += f"""
            INSERT INTO user_accounts (id, email, display_name, password_hash, enabled, system_admin, created_at, updated_at)
            VALUES (gen_random_uuid(), '{email}', '{display_name}', '{owner_hash}', true, false, now(), now())
            ON CONFLICT (email) DO UPDATE SET password_hash = '{owner_hash}', enabled = true;

            INSERT INTO tenant_memberships (id, tenant_id, user_id, role, active, security_version, created_at, updated_at)
            SELECT gen_random_uuid(), '{tenant_id}', id, '{role}', true, 1, now(), now()
            FROM user_accounts WHERE email = '{email}'
            ON CONFLICT (tenant_id, user_id) DO UPDATE SET active = true, role = '{role}';
            """
        user_sql += "COMMIT;\n"
        run_psql("control_db", user_sql)

        # Resolve all user UUIDs from control_db for this tenant
        all_user_ids = [
            uid.strip()
            for uid in run_psql(
                "control_db",
                f"SELECT user_id FROM tenant_memberships WHERE tenant_id = '{tenant_id}' AND active = true;"
            ).splitlines()
            if uid.strip()
        ]
        if not all_user_ids:
            raise RuntimeError(f"Could not resolve user IDs for tenant {slug} in control_db")
        first_user_id = all_user_ids[0]

        pm_inserts = "\n            ".join(
            f"INSERT INTO project_memberships (id, tenant_id, project_id, user_id, role, created_at, updated_at) VALUES (gen_random_uuid(), '{tenant_id}', p_id, '{uid}', 'MANAGER', now(), now()) ON CONFLICT (tenant_id, project_id, user_id) DO NOTHING;"
            for uid in all_user_ids
        )

        # C. Seed Project, Board, Columns, and Tasks in pool_db
        pool_sql = f"""
        BEGIN;
        -- Seed Tenant Kanban Settings (WIP Mode, Limits)
        INSERT INTO tenant_kanban_settings (tenant_id, settings, version, updated_at)
        VALUES ('{tenant_id}', jsonb_build_object(
            'wipMode', '{spec["wip_mode"]}',
            'wipLimit', {spec["wip_limit"]},
            'cardStyle', 'FULL',
            'defaultColumns', jsonb_build_array('To Do', 'In Progress', 'Done'),
            'fields', jsonb_build_array()
        ), 0, now())
        ON CONFLICT (tenant_id) DO UPDATE SET settings = EXCLUDED.settings;

        -- Create Project
        INSERT INTO projects (id, tenant_id, name, description, created_by, created_at, updated_at)
        VALUES (gen_random_uuid(), '{tenant_id}', '{name} Project', 'Benchmark project for {slug}',
                '{first_user_id}', now(), now())
        ON CONFLICT (tenant_id, name) DO NOTHING;

        -- Create Board and Project Memberships
        DO $$
        DECLARE
            p_id uuid;
            b_id uuid;
            col_todo uuid;
            col_inprog uuid;
            col_done uuid;
            b_idx int;
        BEGIN
            SELECT id INTO p_id FROM projects WHERE tenant_id = '{tenant_id}' AND name = '{name} Project';

            -- Add all tenant users to project_memberships so they can access boards and tasks
            {pm_inserts}

            FOR b_idx IN 1..{spec['boards_count']} LOOP
                b_id := gen_random_uuid();
                INSERT INTO boards (id, tenant_id, project_id, name, created_at, updated_at)
                VALUES (b_id, '{tenant_id}', p_id, 'Board ' || b_idx, now(), now());

                col_todo := gen_random_uuid();
                col_inprog := gen_random_uuid();
                col_done := gen_random_uuid();

                INSERT INTO board_columns (id, tenant_id, board_id, name, position, created_at, updated_at) VALUES
                (col_todo, '{tenant_id}', b_id, 'To Do', 1000, now(), now()),
                (col_inprog, '{tenant_id}', b_id, 'In Progress', 2000, now(), now()),
                (col_done, '{tenant_id}', b_id, 'Done', 3000, now(), now());

                -- Seed Tasks
                INSERT INTO tasks (id, tenant_id, project_id, board_id, board_column_id, title, position, version, created_by, created_at, updated_at, custom_data)
                SELECT gen_random_uuid(), '{tenant_id}', p_id, b_id, col_todo,
                       'Task ' || i || ' on Board ' || b_idx,
                       i * 1000, 0,
                       '{first_user_id}',
                       now(), now(),
                       {spec['custom_data']}
                FROM generate_series(1, {spec['tasks_per_board']}) i;
            END LOOP;
        END $$;
        COMMIT;
        """
        run_psql("pool_db", pool_sql)

        # Get first board and columns for testing
        board_id = run_psql("pool_db", f"SELECT id FROM boards WHERE tenant_id = '{tenant_id}' LIMIT 1;")
        columns_raw = run_psql("pool_db", f"SELECT id FROM board_columns WHERE tenant_id = '{tenant_id}' AND board_id = '{board_id}' ORDER BY position;")
        columns = columns_raw.splitlines()

        # D. Obtain JWT tokens for each user
        print(f"    Fetching JWT tokens for {user_count} users...")
        user_tokens = []
        tenant_host = None
        for email in user_emails:
            sess = get_tenant_token(email, demo_password, slug)
            user_tokens.append(sess["accessToken"])
            tenant_host = sess["host"]

        fixtures["tenants"][slug] = {
            "slug": slug,
            "name": name,
            "role": spec["role"],
            "tenantId": tenant_id,
            "host": tenant_host,
            "boardId": board_id,
            "columns": columns,
            "usersCount": user_count,
            "tokens": user_tokens
        }
        print(f"    Done {slug}: {len(user_tokens)} tokens acquired.")

    fixtures["summary"] = {
        "tenantsCount": len(TENANTS_SPEC),
        "totalUsers": sum(s["users_count"] for s in TENANTS_SPEC),
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    out_file = ROOT / "experiments/ec2/fixtures-ec2.json"
    out_file.parent.mkdir(parents=True, exist_ok=True)
    out_file.write_text(json.dumps(fixtures, indent=2), encoding="utf-8")
    print(f"\n[✓] Successfully generated fixtures: {out_file}")
    print(f"    Total Tenants: {fixtures['summary']['tenantsCount']}")
    print(f"    Total Active Users: {fixtures['summary']['totalUsers']}")

if __name__ == "__main__":
    main()
