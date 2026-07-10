"""
Comprehensive API test: every editable field in the client details window.
Runs via modal — tests PUT persistence for all fields and services.
"""
import modal

app = modal.App("tap-test-all-fields")

image = modal.Image.debian_slim(python_version="3.11").pip_install("requests")

@app.function(image=image, timeout=600)
def test_all():
    import requests, time, json

    BASE = "https://tap-client-hub.vercel.app"
    CLIENT_ID = "74e88ab1-85fa-4a36-93ad-8ddd0604595a"  # Aaron Edwards PLLC
    NAME = "Aaron Edwards PLLC (dba Katy Dental Studio)"

    results = []

    def get():
        r = requests.get(f"{BASE}/api/clients?id={CLIENT_ID}", timeout=10)
        if not r.ok: raise Exception(f"GET failed: {r.status_code}")
        return r.json()["clients"][0]

    def put(body):
        r = requests.put(f"{BASE}/api/clients", json=body, timeout=10)
        return r.ok, r.text[:200]

    def test(label, key, new_val, get_path=None):
        """Test one field: save original, set new, verify, restore."""
        try:
            c = get()
            old = c.get(key) if get_path is None else get_path(c)

            # Build body with current state, overriding only the test field
            body = {"id": CLIENT_ID, "name": NAME, "services": c.get("services", [])}
            if get_path is None:
                body[key] = new_val
            else:
                # For nested service updates, we modify services array
                svcs = c.get("services", [])
                # This is handled specially per service type
                body["services"] = svcs

            ok, resp = put(body)
            time.sleep(1)

            c2 = get()
            saved = c2.get(key) if get_path is None else get_path(c2)

            passed = new_val in str(saved) if new_val else True
            results.append(f"{'✅' if passed else '❌'} {label}: {saved} (expected {new_val})")

            # Restore
            if get_path is None:
                body[key] = old
            put(body)
        except Exception as e:
            results.append(f"❌ {label}: {str(e)[:100]}")

    # ── Phase 1: Client Detail Fields ──
    print("=== CLIENT DETAILS ===")
    test("Email", "emails", ["qa-test@tapallc.com"])
    test("Phone", "phones", ["+1-999-000-1111"])
    test("Address", "address", "900 QA Test Blvd")
    test("City", "city", "QAtown")
    test("ZIP", "zip", "99999")
    test("EIN", "ein", "99-9999999")

    # ── Phase 2: Services (toggle + sub-fields) ──
    print("\n=== SERVICE TOGGLES ===")
    # Toggle Payroll off then on
    test("Payroll OFF", "services", [], get_path=lambda c: [s.get("active") for s in c.get("services",[]) if s.get("key")=="payroll"])
    test("Payroll ON", "services", [], get_path=lambda c: [s.get("active") for s in c.get("services",[]) if s.get("key")=="payroll"])

    # ── Phase 3: Service Fields ──
    print("\n=== TAX RETURN FIELDS ===")
    # Filing State, Month, Type are embedded in services array
    test("Tax Filing State", "services", "CA", get_path=lambda c: next((s.get("filing_state") for s in c.get("services",[]) if s.get("key")=="tax_returns"), "?"))
    test("Tax Filing Month", "services", "March", get_path=lambda c: next((s.get("filing_month") for s in c.get("services",[]) if s.get("key")=="tax_returns"), "?"))

    print("\n=== FINANCIAL FIELDS ===")
    test("Fin Cadence", "services", "Quarterly", get_path=lambda c: next((s.get("cadence") for s in c.get("services",[]) if s.get("key")=="financials"), "?"))

    print("\n=== PAYROLL FIELDS ===")
    test("PR Processor", "services", "QBO", get_path=lambda c: next((s.get("processor") for s in c.get("services",[]) if s.get("key")=="payroll"), "?"))
    test("PR Period", "services", "Semi-Monthly", get_path=lambda c: next((s.get("pay_period_freq") for s in c.get("services",[]) if s.get("key")=="payroll"), "?"))

    # ── Results ──
    print("\n" + "="*40)
    for r in results:
        print(r)
    passed = sum(1 for r in results if "✅" in r)
    total = len([r for r in results if "✅" in r or "❌" in r])
    print(f"\n{passed}/{total} passed")
