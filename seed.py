"""Seed TAP Client Hub demo data into Supabase."""
import psycopg2
import urllib.parse
from datetime import date, datetime

password = "NsHd9sN7FnP3Tpae"

dsn = f"postgresql://postgres:{urllib.parse.quote_plus(password)}@db.phgogybfgovrlcdmifpv.supabase.co:6543/postgres"

conn = psycopg2.connect(dsn)
cur = conn.cursor()

# ── Services already seeded by schema ──

# ── Seed profiles (staff)
staff = [
    ("Terry Anderson", "admin", "US"),
    ("Lindsay Brooks", "manager", "US"),
    ("Misty Cole", "staff", "US"),
    ("Jill Dawson", "staff", "US"),
    ("Aaron Edwards", "staff", "US"),
    ("Paula Rivers", "admin", "US"),
]

profile_ids = {}
for name, role, loc in staff:
    cur.execute(
        "INSERT INTO profiles (id, full_name, role, location, active, modules) VALUES (gen_random_uuid(), %s, %s, %s, true, '{clients,workload,time,fin,pr,stx,t9,rend,vault,support}') RETURNING id",
        (name, role, loc)
    )
    profile_ids[name] = cur.fetchone()[0]

print(f"Seeded {len(staff)} profiles")

# ── Seed clients
clients_data = [
    ("303A Properties LLC", "business", "Single-member LLC", "Terry", "active", "Austin", "TX", "78701", "1201 Congress Ave", "contact@303aproperties.com", "(512) 555-0101", "Terry Anderson"),
    ("Aaron Edwards PLLC", "business", "PLLC", "Lindsay", "active", "Dallas", "TX", "75201", "2001 Ross Ave", "aaron@edwardspllc.com", "(214) 555-0202", "Lindsay Brooks"),
    ("Bluebonnet Enterprises Inc.", "business", "S-Corp", "Misty", "active", "San Antonio", "TX", "78205", "300 Alamo Plaza", "admin@bluebonnetent.com", "(210) 555-0303", "Misty Cole"),
    ("Brazos River Partners", "business", "Partnership", "Terry", "active", "Houston", "TX", "77002", "800 Capitol St", "info@brazosriver.com", "(713) 555-0404", "Terry Anderson"),
    ("Cindy's Creations LLC", "business", "Single-member LLC", "Jill", "active", "Fort Worth", "TX", "76102", "500 Main St", "cindy@creationsllc.com", "(817) 555-0505", "Jill Dawson"),
    ("David Morrison", "personal", None, "Lindsay", "active", "Plano", "TX", "75093", "1401 Preston Rd", "david.morrison@gmail.com", "(972) 555-0606", "Lindsay Brooks"),
    ("El Paso Mercantile LP", "business", "LP", "Misty", "active", "El Paso", "TX", "79901", "221 N Kansas St", "office@epmercantile.com", "(915) 555-0707", "Misty Cole"),
    ("Frost & Gardner CPAs", "business", "Partnership", "Terry", "active", "Lubbock", "TX", "79401", "1500 Broadway", "info@frostgardner.com", "(806) 555-0808", "Terry Anderson"),
    ("Greenway Energy Services", "business", "S-Corp", "Lindsay", "active", "Midland", "TX", "79701", "310 W Wall St", "billing@greenwayenergy.com", "(432) 555-0909", "Lindsay Brooks"),
    ("Hill Country Ranches LLC", "business", "Single-member LLC", "Jill", "active", "Fredericksburg", "TX", "78624", "100 Main St", "ranch@hillcountry.com", "(830) 555-1010", "Jill Dawson"),
    ("Isabel Torres CPA", "personal", None, "Misty", "active", "McAllen", "TX", "78501", "500 S Broadway", "isabel@torrescpa.com", "(956) 555-1111", "Misty Cole"),
    ("Juniper Capital Group", "business", "S-Corp", "Terry", "active", "Amarillo", "TX", "79101", "600 S Tyler St", "info@junipercapital.com", "(806) 555-1212", "Terry Anderson"),
    ("Katy Professional Park", "business", "Partnership", "Lindsay", "active", "Katy", "TX", "77494", "24020 Westheimer Pkwy", "management@katypropark.com", "(281) 555-1313", "Lindsay Brooks"),
    ("Longhorn Logistics Inc.", "business", "S-Corp", "Misty", "active", "Waco", "TX", "76701", "425 Austin Ave", "dispatch@longhornlogistics.com", "(254) 555-1414", "Misty Cole"),
]

client_ids = {}
for (name, ctype, entity, group, status, city, state, zip_code, addr, email, phone, assigned) in clients_data:
    cur.execute(
        """INSERT INTO clients (name, type, entity_type, group_owner, status, city, state, zip, address)
           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (name, ctype, entity, group, status, city, state, zip_code, addr)
    )
    client_ids[name] = cur.fetchone()[0]
    
    # Add contact
    cur.execute(
        "INSERT INTO contacts (client_id, name, email, phone, is_primary) VALUES (%s, %s, %s, %s, true)",
        (client_ids[name], assigned, email, phone)
    )

print(f"Seeded {len(clients_data)} clients with contacts")

# ── Seed client_services with work_periods
# Map service codes to IDs
cur.execute("SELECT code, id FROM services")
service_map = {r[0]: r[1] for r in cur.fetchall()}

svc_configs = [
    # (client_name, service_code, assigned_name, frequency, processor)
    # 303A Properties
    ("303A Properties LLC", "FIN", "Terry Anderson", "monthly", "TA"),
    ("303A Properties LLC", "PR", "Misty Cole", "monthly", "MC"),
    ("303A Properties LLC", "STX", "Lindsay Brooks", "monthly", "LB"),
    ("303A Properties LLC", "TAX", "Terry Anderson", "yearly", "TA"),
    ("303A Properties LLC", "REND", "Lindsay Brooks", "yearly", "TA"),
    # Aaron Edwards
    ("Aaron Edwards PLLC", "FIN", "Lindsay Brooks", "monthly", "LB"),
    ("Aaron Edwards PLLC", "PR", "Misty Cole", "monthly", "MC"),
    ("Aaron Edwards PLLC", "T9", "Aaron Edwards", "yearly", "AE"),
    ("Aaron Edwards PLLC", "TAX", "Lindsay Brooks", "yearly", "LB"),
    # Bluebonnet
    ("Bluebonnet Enterprises Inc.", "FIN", "Misty Cole", "monthly", "MC"),
    ("Bluebonnet Enterprises Inc.", "PR", "Misty Cole", "monthly", "MC"),
    ("Bluebonnet Enterprises Inc.", "STX", "Misty Cole", "monthly", "MC"),
    ("Bluebonnet Enterprises Inc.", "T9", "Jill Dawson", "yearly", "JD"),
    ("Bluebonnet Enterprises Inc.", "TAX", "Terry Anderson", "yearly", "TA"),
    # Brazos River
    ("Brazos River Partners", "FIN", "Terry Anderson", "monthly", "TA"),
    ("Brazos River Partners", "PR", "Misty Cole", "monthly", "MC"),
    ("Brazos River Partners", "STX", "Lindsay Brooks", "monthly", "LB"),
    ("Brazos River Partners", "REND", "Terry Anderson", "yearly", "TA"),
    ("Brazos River Partners", "TAX", "Terry Anderson", "yearly", "TA"),
    # Cindy's Creations
    ("Cindy's Creations LLC", "FIN", "Jill Dawson", "quarterly", "JD"),
    ("Cindy's Creations LLC", "PR", "Misty Cole", "monthly", "MC"),
    ("Cindy's Creations LLC", "STX", "Jill Dawson", "quarterly", "JD"),
    ("Cindy's Creations LLC", "T9", "Aaron Edwards", "yearly", "AE"),
    ("Cindy's Creations LLC", "TAX", "Lindsay Brooks", "yearly", "LB"),
    # David Morrison
    ("David Morrison", "TAX", "Lindsay Brooks", "yearly", "LB"),
    # El Paso Mercantile
    ("El Paso Mercantile LP", "FIN", "Misty Cole", "monthly", "MC"),
    ("El Paso Mercantile LP", "PR", "Misty Cole", "monthly", "MC"),
    ("El Paso Mercantile LP", "STX", "Misty Cole", "monthly", "MC"),
    ("El Paso Mercantile LP", "T9", "Jill Dawson", "yearly", "JD"),
    ("El Paso Mercantile LP", "REND", "Misty Cole", "yearly", "MC"),
    ("El Paso Mercantile LP", "TAX", "Misty Cole", "yearly", "MC"),
    # Frost & Gardner
    ("Frost & Gardner CPAs", "FIN", "Terry Anderson", "monthly", "TA"),
    ("Frost & Gardner CPAs", "TAX", "Terry Anderson", "yearly", "TA"),
    # Greenway Energy
    ("Greenway Energy Services", "FIN", "Lindsay Brooks", "monthly", "LB"),
    ("Greenway Energy Services", "PR", "Misty Cole", "monthly", "MC"),
    ("Greenway Energy Services", "STX", "Lindsay Brooks", "monthly", "LB"),
    ("Greenway Energy Services", "T9", "Aaron Edwards", "yearly", "AE"),
    ("Greenway Energy Services", "REND", "Lindsay Brooks", "yearly", "LB"),
    ("Greenway Energy Services", "TAX", "Lindsay Brooks", "yearly", "LB"),
    # Hill Country Ranches
    ("Hill Country Ranches LLC", "FIN", "Jill Dawson", "quarterly", "JD"),
    ("Hill Country Ranches LLC", "PR", "Misty Cole", "monthly", "MC"),
    ("Hill Country Ranches LLC", "TAX", "Jill Dawson", "yearly", "JD"),
    # Isabel Torres
    ("Isabel Torres CPA", "TAX", "Misty Cole", "yearly", "MC"),
    # Juniper Capital
    ("Juniper Capital Group", "FIN", "Terry Anderson", "monthly", "TA"),
    ("Juniper Capital Group", "PR", "Misty Cole", "monthly", "MC"),
    ("Juniper Capital Group", "STX", "Lindsay Brooks", "monthly", "LB"),
    ("Juniper Capital Group", "T9", "Jill Dawson", "yearly", "JD"),
    ("Juniper Capital Group", "REND", "Terry Anderson", "yearly", "TA"),
    ("Juniper Capital Group", "TAX", "Terry Anderson", "yearly", "TA"),
    # Katy Professional Park
    ("Katy Professional Park", "FIN", "Lindsay Brooks", "monthly", "LB"),
    ("Katy Professional Park", "PR", "Misty Cole", "monthly", "MC"),
    ("Katy Professional Park", "T9", "Aaron Edwards", "yearly", "AE"),
    ("Katy Professional Park", "REND", "Lindsay Brooks", "yearly", "LB"),
    ("Katy Professional Park", "TAX", "Lindsay Brooks", "yearly", "LB"),
    # Longhorn Logistics
    ("Longhorn Logistics Inc.", "FIN", "Misty Cole", "monthly", "MC"),
    ("Longhorn Logistics Inc.", "PR", "Misty Cole", "monthly", "MC"),
    ("Longhorn Logistics Inc.", "STX", "Misty Cole", "monthly", "MC"),
    ("Longhorn Logistics Inc.", "T9", "Jill Dawson", "yearly", "JD"),
    ("Longhorn Logistics Inc.", "TAX", "Misty Cole", "yearly", "MC"),
]

months_2026 = [f"2026-{m:02d}" for m in range(1, 13)]

# Service tracking: stage vs count (from schema v2 services.tracking column)
cur.execute("SELECT code, tracking FROM services")
tracking_map = {r[0]: r[1] for r in cur.fetchall()}

svc_count = 0
wp_count = 0
pc_count = 0

# Monthly expected defaults for count services
PR_EXPECTED = {"2026-01":5,"2026-02":4,"2026-03":4,"2026-04":5,"2026-05":4,"2026-06":5,
               "2026-07":4,"2026-08":5,"2026-09":4,"2026-10":5,"2026-11":4,"2026-12":5}
PR_DONE =     {"2026-01":5,"2026-02":4,"2026-03":4,"2026-04":5,"2026-05":4,"2026-06":0,
               "2026-07":0,"2026-08":0,"2026-09":0,"2026-10":0,"2026-11":0,"2026-12":0}

T9_MONTHLY = {"2026-01":2,"2026-02":3,"2026-03":1,"2026-04":5,"2026-05":2,"2026-06":0,
              "2026-07":0,"2026-08":0,"2026-09":0,"2026-10":0,"2026-11":0,"2026-12":0}

for (cname, scode, aname, freq, proc) in svc_configs:
    tracking = tracking_map.get(scode, 'stage')
    
    # Skip T9 if annual target not set (some clients don't have 1099s)
    exp_annual = None
    if scode == 'T9':
        exp_annual = 25  # default 25 forms/year
    
    cur.execute(
        """INSERT INTO client_services (client_id, service_id, assigned_to, active, frequency, processor, expected_annual)
           VALUES (%s, %s, %s, true, %s, %s, %s) RETURNING id""",
        (client_ids[cname], service_map[scode], profile_ids.get(aname), freq, proc, exp_annual)
    )
    cs_id = cur.fetchone()[0]
    svc_count += 1
    
    if tracking == 'stage':
        # Stage services: create work_periods
        for m in months_2026:
            cur.execute(
                "INSERT INTO work_periods (client_service_id, period, stage) VALUES (%s, %s, 'not_started')",
                (cs_id, m)
            )
            wp_count += 1
            
    elif tracking == 'count' and scode == 'PR':
        # Payroll: count runs per month
        for m in months_2026:
            cur.execute(
                "INSERT INTO period_counts (client_service_id, period, processed, expected) VALUES (%s, %s, %s, %s)",
                (cs_id, m, PR_DONE.get(m, 0), PR_EXPECTED.get(m, 1))
            )
            pc_count += 1
            
    elif tracking == 'count' and scode == 'T9':
        # 1099s: count forms per month
        for m in months_2026:
            cur.execute(
                "INSERT INTO period_counts (client_service_id, period, processed, expected) VALUES (%s, %s, %s, %s)",
                (cs_id, m, T9_MONTHLY.get(m, 0), None)
            )
            pc_count += 1

conn.commit()
cur.close()
conn.close()

print(f"Seeded {svc_count} client_services: {wp_count} work_periods (stage) + {pc_count} period_counts (count)")
print("DONE - TAP Client Hub demo data seeded! (schema v2)")
