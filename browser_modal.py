"""
Phase 1: Test all client detail fields — proven approach with .ccard click.
"""

import modal

app = modal.App("tap-browser-test")
CREDS = {"email": "tushar@tapallc.com", "password": "TapHub2024!"}

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("chromium", "chromium-driver")
    .pip_install("selenium")
)

@app.function(image=image, timeout=600)
def test_details():
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import Select
    from selenium.webdriver.common.keys import Keys
    import time

    opts = Options()
    for a in ['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--window-size=1440,900']:
        opts.add_argument(a)
    opts.binary_location = '/usr/bin/chromium'
    driver = webdriver.Chrome(options=opts)
    results = []

    def dwait(n=3): time.sleep(n)

    def login_if_needed():
        driver.get("https://tap-client-hub.vercel.app/login"); dwait(3)
        if "/login" not in driver.current_url:
            return  # already logged in
        driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(CREDS["email"])
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(CREDS["password"])
        for b in driver.find_elements(By.TAG_NAME, "button"):
            if "sign in" in (b.text or "").lower(): b.click(); break
        dwait(4)
        # Dismiss tip
        for el in driver.find_elements(By.XPATH, "//*[text()='×']"):
            try: el.click(); dwait(1)
            except: pass
        # Wait for data
        for _ in range(10):
            if "Total clients" in driver.find_element(By.TAG_NAME, "body").text:
                break
            dwait(1)

    def open_client():
        si = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Search']")
        si.clear(); si.send_keys("Katy Dental"); si.send_keys(Keys.ENTER); dwait(3)
        card = driver.find_element(By.CSS_SELECTOR, ".ccard")
        card.click(); dwait(3)

    def find_slideover():
        """Return the slideover panel element."""
        els = driver.find_elements(By.CSS_SELECTOR, "[class*='over']")
        for el in els:
            txt = (el.text or "")
            if "DETAILS" in txt and "Email" in txt:
                return el
        # Fallback: last [class*='over'] with substantial text
        for el in reversed(els):
            if len(el.text) > 100:
                return el
        return None

    def get_input_by_label(panel, label: str) -> str:
        """Find input/select by label inside panel, return value."""
        fields = panel.find_elements(By.XPATH, f".//*[contains(text(), '{label}')]")
        for f in fields:
            try:
                parent = f.find_element(By.XPATH, "..")
                for inp in parent.find_elements(By.TAG_NAME, "input"):
                    if not inp.get_attribute("readonly") and inp.is_displayed():
                        return inp.get_attribute("value") or ""
                for sel in parent.find_elements(By.TAG_NAME, "select"):
                    if sel.is_displayed():
                        try:
                            return Select(sel).first_selected_option.text
                        except: pass
            except: pass
        return "NOT_FOUND"

    def set_input_by_label(panel, label: str, value: str):
        """Find input/select by label, set value."""
        fields = panel.find_elements(By.XPATH, f".//*[contains(text(), '{label}')]")
        for f in fields:
            try:
                parent = f.find_element(By.XPATH, "..")
                # Try select first
                for sel in parent.find_elements(By.TAG_NAME, "select"):
                    if sel.is_displayed():
                        for o in sel.find_elements(By.TAG_NAME, "option"):
                            if value.lower() in o.text.lower():
                                Select(sel).select_by_visible_text(o.text)
                                return
                # Try input
                for inp in parent.find_elements(By.TAG_NAME, "input"):
                    if inp.is_displayed() and not inp.get_attribute("readonly"):
                        inp.clear(); inp.send_keys(value); return
            except: pass

    def save():
        for b in reversed(driver.find_elements(By.CSS_SELECTOR, "button")):
            if "save" in (b.text or "").lower():
                b.click(); dwait(5); return True
        return False

    # ── RUN TESTS ──
    tests = [
        ("Email", "Email", "test-qa@tapallc.com"),
        ("Phone", "Phone", "+1-555-999-0000"),
        ("Assigned To", "Assigned To", "Janeth"),
        ("Address", "Address", "999 Test Blvd"),
        ("City", "City", "Austin"),
        ("ZIP", "ZIP", "78701"),
        ("EIN", "EIN", "99-9999999"),
    ]

    for name, label, new_val in tests:
        try:
            login_if_needed()
            open_client()
            panel = find_slideover()
            if not panel:
                results.append(f"❌ {name}: slideover not found")
                continue

            old_val = get_input_by_label(panel, label)
            results.append(f"   {name}: old='{old_val}'")

            set_input_by_label(panel, label, new_val)

            if save():
                # Refresh + reopen to verify
                driver.refresh(); dwait(3)
                open_client()
                panel2 = find_slideover()
                if panel2:
                    saved_val = get_input_by_label(panel2, label)
                    ok = new_val.lower() in saved_val.lower() or new_val in saved_val
                    results.append(f"{'✅' if ok else '❌'} {name}: saved='{saved_val}' (expected '{new_val}')")
                    # Restore
                    set_input_by_label(panel2, label, old_val)
                    save()
                else:
                    results.append(f"❌ {name}: couldn't reopen to verify")
            else:
                results.append(f"❌ {name}: save button not found")
        except Exception as e:
            results.append(f"❌ {name}: {str(e)[:100]}")

    print("\n=== RESULTS ===")
    for r in results:
        if "✅" in r or "❌" in r:
            print(r)
    passed = sum(1 for r in results if "✅" in r)
    total = len([r for r in results if "✅" in r or "❌" in r])
    print(f"\n{passed}/{total} passed")
    driver.quit()
