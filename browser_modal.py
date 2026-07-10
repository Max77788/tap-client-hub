"""Single-field test with verbose logging to trace the save pipeline."""
import modal

app = modal.App("tap-browser-test")
CREDS = {"email": "tushar@tapallc.com", "password": "TapHub2024!"}

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("chromium", "chromium-driver")
    .pip_install("selenium")
)

@app.function(image=image, timeout=300)
def single_test():
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

    # Login
    print("LOGIN...")
    driver.get("https://tap-client-hub.vercel.app/login"); time.sleep(3)
    if "/login" in driver.current_url:
        driver.find_element(By.CSS_SELECTOR, "input[type='email']").send_keys(CREDS["email"])
        driver.find_element(By.CSS_SELECTOR, "input[type='password']").send_keys(CREDS["password"])
        for b in driver.find_elements(By.TAG_NAME, "button"):
            if "sign in" in (b.text or "").lower(): b.click(); break
        time.sleep(4)
    for el in driver.find_elements(By.XPATH, "//*[text()='×']"):
        try: el.click(); time.sleep(1)
        except: pass
    for _ in range(15):
        if "Total clients" in driver.find_element(By.TAG_NAME, "body").text: break
        time.sleep(1)
    print("  Ready")

    # Search + open
    si = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Search']")
    si.clear(); si.send_keys("Katy Dental"); si.send_keys(Keys.ENTER); time.sleep(3)
    card = driver.find_element(By.CSS_SELECTOR, ".ccard"); card.click(); time.sleep(3)

    # Get slideover panel
    panel = None
    for el in driver.find_elements(By.CSS_SELECTOR, "[class*='over']"):
        if "DETAILS" in (el.text or ""):
            panel = el; break
    if not panel:
        print("NO SLIDEOVER")
        driver.quit(); return

    # Read current address
    for f in panel.find_elements(By.XPATH, ".//*[contains(text(), 'Address')]"):
        try:
            parent = f.find_element(By.XPATH, "..")
            for inp in parent.find_elements(By.TAG_NAME, "input"):
                if inp.is_displayed():
                    print(f"  Current address: '{inp.get_attribute('value')}'")
        except: pass

    # Type NEW-ADDR-999 — use fresh lookup each time
    print("  Typing NEW-ADDR-999...")
    # Re-find the address input inside the slideover
    addr_found = False
    panel2 = None
    for el in driver.find_elements(By.CSS_SELECTOR, "[class*='over']"):
        if "DETAILS" in (el.text or ""):
            panel2 = el; break

    if panel2:
        for f in panel2.find_elements(By.XPATH, ".//*[contains(text(), 'Address')]"):
            try:
                parent = f.find_element(By.XPATH, "..")
                for inp in parent.find_elements(By.TAG_NAME, "input"):
                    if inp.is_displayed() and not inp.get_attribute("readonly"):
                        # Set via JS to trigger React synthetic events
                        driver.execute_script("""
                            arguments[0].value = 'NEW-ADDR-999';
                            arguments[0].dispatchEvent(new Event('input', {bubbles: true}));
                            arguments[0].dispatchEvent(new Event('blur', {bubbles: true}));
                            arguments[0].dispatchEvent(new Event('change', {bubbles: true}));
                        """, inp)
                        addr_found = True
                        print(f"  Typed: '{inp.get_attribute('value')}'")
            except Exception as e:
                print(f"  Type error: {e}")
    print(f"  Address found: {addr_found}")

    # Inject save data interceptor
    driver.execute_script("""
        window.__saveData = null;
        var origSetTimeout = window.setTimeout;
        window.setTimeout = function(fn, delay) {
            return origSetTimeout.call(window, fn, delay);
        };
    """)

    # Click save
    # Inject save data interceptor
    driver.execute_script("""
        window.__saveData = null;
        var origSetTimeout = window.setTimeout;
        window.setTimeout = function(fn, delay) {
            return origSetTimeout.call(window, fn, delay);
        };
    """)

    # Click save
    print("  Looking for Save button...")
    btns = driver.find_elements(By.TAG_NAME, "button")
    for b in btns:
        txt = b.text.strip().lower()
        if "save" in txt:
            rect = b.rect
            dis = b.get_attribute("disabled")
            print(f"  Button: rect={rect} disabled={dis} displayed={b.is_displayed()} enabled={b.is_enabled()}")
            # Try React's internal event
            driver.execute_script("""
                var btn = arguments[0];
                // Get React props from fiber
                var key = Object.keys(btn).find(k => k.startsWith('__reactFiber'));
                console.log('React fiber:', key);
                // Also try dispatching a MouseEvent
                btn.dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true}));
                btn.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
                btn.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
            """, b)
            time.sleep(2)
            print(f"  After events, text='{b.text}'")
            # Also try regular click again
            b.click()
            time.sleep(1)
            print(f"  After regular click, text='{b.text}'")
            break

    time.sleep(3)
    # Check browser console for errors
    console_logs = driver.execute_script("return window.__saveData || 'NO DATA';")
    print(f"  Save data: {console_logs}")
    print(f"  After save, buttons: {[b.text for b in driver.find_elements(By.TAG_NAME, 'button') if 'save' in b.text.lower() or 'saving' in b.text.lower()]}")

    # Wait for debounce
    time.sleep(5)

    # Refresh + reopen
    print("  Refreshing...")
    driver.refresh(); time.sleep(3)
    # Wait for data
    for _ in range(10):
        if "Total clients" in driver.find_element(By.TAG_NAME, "body").text: break
        time.sleep(1)
    si = driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Search']")
    si.clear(); si.send_keys("Katy Dental"); si.send_keys(Keys.ENTER); time.sleep(3)
    card = driver.find_element(By.CSS_SELECTOR, ".ccard"); card.click(); time.sleep(3)

    # Read address from slideover
    panel2 = None
    for el in driver.find_elements(By.CSS_SELECTOR, "[class*='over']"):
        if "DETAILS" in (el.text or ""):
            panel2 = el; break
    if panel2:
        for f in panel2.find_elements(By.XPATH, ".//*[contains(text(), 'Address')]"):
            try:
                parent = f.find_element(By.XPATH, "..")
                for inp in parent.find_elements(By.TAG_NAME, "input"):
                    if inp.is_displayed():
                        addr = inp.get_attribute("value")
                        print(f"  VERIFY: address='{addr}'")
                        print(f"  {'✅ PERSISTED!' if 'NEW-ADDR-999' in addr else '❌ FAILED'}")

                        # Restore
                        if 'NEW-ADDR-999' in addr:
                            inp.clear(); inp.send_keys("21954 Kingsland Blvd."); inp.send_keys(Keys.TAB)
                            for b in driver.find_elements(By.TAG_NAME, "button"):
                                if "save" in (b.text or "").lower():
                                    b.click(); print("  Restored original")
                            break
            except: pass

    driver.quit()
