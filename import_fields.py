"""
Import script: fill missing fields from Sales Tax & Payroll Google Sheets.
Matching: client_code exact match → name fuzzy fallback.
Runs via Modal.
"""
import modal

app = modal.App("tap-import-missing-fields")

image = modal.Image.debian_slim(python_version="3.11").pip_install("requests", "psycopg2-binary")

@app.function(image=image, timeout=600, secrets=[modal.Secret.from_name("tap-hub-db")])
def run_import():
    import requests, csv, io, psycopg2, os, time

    # ── DB connection ──
    DB_HOST = "db.rqxscydyvrvbdkqagemy.supabase.co"
    DB_NAME = "postgres"
    DB_USER = "postgres"
    DB_PASS = os.environ.get("DB_PASSWORD", "")
    DB_PORT = 5432

    conn = psycopg2.connect(
        host=DB_HOST, port=DB_PORT, dbname=DB_NAME,
        user=DB_USER, password=DB_PASS, sslmode="require"
    )
    cur = conn.cursor()

    # ── Load clients ──
    cur.execute("SELECT id, name, client_code FROM tap_hub_project.clients WHERE status = 'active'")
    clients = cur.fetchall()
    print(f"Loaded {len(clients)} clients from DB")

    # Build lookup: client_code → id
    code_to_id = {}
    name_to_id = {}
    for cid, name, code in clients:
        if code:
            code_to_id[code.strip()] = cid
        if name:
            # Normalize name for fuzzy matching
            norm = name.lower().strip().replace(",", "").replace(".", "").replace("  ", " ")
            name_to_id[norm] = cid

    # Also build index of all service rows: (client_id, service_id) map
    cur.execute("""
        SELECT cs.id, cs.client_id, s.code, s.id as service_id
        FROM tap_hub_project.client_services cs
        JOIN tap_hub_project.services s ON cs.service_id = s.id
    """)
    svc_rows = cur.fetchall()
    # Group by client_id, build dict of service code → cs_id
    from collections import defaultdict
    client_svcs = defaultdict(dict)  # client_id → {code: cs_id}
    for cs_id, cl_id, code, svc_id in svc_rows:
        client_svcs[cl_id][code.lower()] = cs_id
    print(f"Loaded {len(svc_rows)} service rows")

    stats = {"sales_tax_updated": 0, "payroll_updated": 0, "sales_tax_unmatched": 0, "payroll_unmatched": 0}

    def find_client(client_code, name_guess=""):
        """Match on client_code first, fallback to fuzzy name"""
        cc = str(client_code).strip()
        if cc in code_to_id:
            return code_to_id[cc]

        # Fuzzy name match
        if name_guess:
            norm = name_guess.lower().strip().replace(",", "").replace(".", "").replace("  ", " ")
            if norm in name_to_id:
                return name_to_id[norm]
            # Try substring match
            for db_name, cid in name_to_id.items():
                if norm in db_name or db_name in norm:
                    return cid
        return None

    # ── PHASE 4: Sales Tax import ──
    print("\n=== SALES TAX IMPORT ===")
    st_url = "https://docs.google.com/spreadsheets/d/1fjVYdEh0bPg1EpsuosdmTDhWkRWtdi97/export?format=csv&gid=1465513989"
    st_csv = requests.get(st_url, timeout=15).text
    reader = csv.reader(io.StringIO(st_csv))
    rows = list(reader)
    # Header is row 3 (0-indexed: row 3)
    header_row = 3
    print(f"Sales Tax: {len(rows)} total rows, header at row {header_row}")

    for i, row in enumerate(rows[header_row+1:], start=header_row+1):
        if len(row) < 5:
            continue
        client_code = row[1].strip() if len(row) > 1 else ""
        service_name = row[4].strip() if len(row) > 4 else ""

        if not client_code or not service_name:
            continue

        cid = find_client(client_code, service_name)
        if not cid:
            stats["sales_tax_unmatched"] += 1
            if stats["sales_tax_unmatched"] <= 5:
                print(f"  UNMATCHED: code={client_code} name={service_name[:50]}")
            continue

        # Find sales_tax service for this client
        st_cs_id = client_svcs.get(cid, {}).get("stx")
        if not st_cs_id:
            continue

        cur.execute(
            "UPDATE tap_hub_project.client_services SET service_name = %s WHERE id = %s",
            (service_name, st_cs_id)
        )
        stats["sales_tax_updated"] += 1

    # ── PHASE 5: Payroll import ──
    print("\n=== PAYROLL IMPORT ===")
    pr_url = "https://docs.google.com/spreadsheets/d/12KnepUO5b0JMleag2pTc453_zCG9AYzV/export?format=csv&gid=293206712"
    pr_csv = requests.get(pr_url, timeout=15).text
    reader = csv.reader(io.StringIO(pr_csv))
    rows = list(reader)
    print(f"Payroll: {len(rows)} rows")

    for i, row in enumerate(rows[1:], start=1):  # Skip header
        if len(row) < 7:
            continue
        client_code = row[0].strip() if row[0] else ""
        processor = row[1].strip() if len(row) > 1 else ""
        eftps = row[2].strip() if len(row) > 2 else ""
        pin = row[3].strip() if len(row) > 3 else ""
        assigned_to = row[4].strip() if len(row) > 4 else ""
        frequency = row[5].strip() if len(row) > 5 else ""
        paydate = row[6].strip() if len(row) > 6 else ""

        if not client_code:
            continue

        cid = find_client(client_code)
        if not cid:
            stats["payroll_unmatched"] += 1
            if stats["payroll_unmatched"] <= 5:
                print(f"  UNMATCHED: code={client_code}")
            continue

        # Find payroll service for this client
        pr_cs_id = client_svcs.get(cid, {}).get("pr")
        if not pr_cs_id:
            continue

        cur.execute("""
            UPDATE tap_hub_project.client_services
            SET processor = COALESCE(NULLIF(%s, ''), processor),
                eftps = COALESCE(NULLIF(%s, ''), eftps),
                payroll_password = COALESCE(NULLIF(%s, ''), payroll_password),
                assigned_to = COALESCE(NULLIF(%s, ''), assigned_to),
                pay_period_frequency = COALESCE(NULLIF(%s, ''), pay_period_frequency),
                paydate = COALESCE(NULLIF(%s, ''), paydate)
            WHERE id = %s
        """, (processor, eftps, pin, assigned_to, frequency, paydate, pr_cs_id))
        stats["payroll_updated"] += 1

    conn.commit()

    # ── PHASE 6: Verify ──
    print("\n=== RESULTS ===")
    print(f"Sales Tax: {stats['sales_tax_updated']} updated, {stats['sales_tax_unmatched']} unmatched")
    print(f"Payroll: {stats['payroll_updated']} updated, {stats['payroll_unmatched']} unmatched")

    # Sample check
    cur.execute("SELECT service_name FROM tap_hub_project.client_services WHERE service_name IS NOT NULL LIMIT 3")
    samples = cur.fetchall()
    print(f"\nSample service_names: {[s[0][:40] for s in samples if s[0]]} ")

    cur.execute("SELECT paydate, payroll_password FROM tap_hub_project.client_services WHERE paydate IS NOT NULL LIMIT 3")
    samples2 = cur.fetchall()
    print(f"Sample payroll: {samples2} ")

    cur.close()
    conn.close()
    print("\nDone!")
