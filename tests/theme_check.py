"""Check dark/light theme at narrow widths."""
import os, pathlib, socketserver, threading, time, http.server

DIST = pathlib.Path(__file__).resolve().parent.parent / "dist"
os.chdir(str(DIST))

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

srv = socketserver.TCPServer(("", 0), H)
port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
time.sleep(0.3)

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])

    # Dark theme at 320px (default)
    ctx = browser.new_context(viewport={"width": 320, "height": 700})
    page = ctx.new_page()
    url = f"http://localhost:{port}/courses/hydroponic-container-farming/index.html"
    page.goto(url, wait_until="networkidle")
    sw = page.evaluate("document.documentElement.scrollWidth")
    cw = page.evaluate("document.documentElement.clientWidth")
    ok = sw <= cw + 1
    t = "OK" if ok else f"FAIL ({sw} > {cw})"
    print(f"[320px dark]: scroll {t}")
    bg = page.evaluate("getComputedStyle(document.body).backgroundColor")
    print(f"  bg color: {bg}")
    has_dt = page.evaluate("document.documentElement.hasAttribute('data-theme')")
    print(f"  has data-theme: {has_dt}")
    ctx.close()

    # Light theme at 320px
    ctx = browser.new_context(viewport={"width": 320, "height": 700}, color_scheme="light")
    page = ctx.new_page()
    page.goto(url, wait_until="networkidle")
    sw = page.evaluate("document.documentElement.scrollWidth")
    cw = page.evaluate("document.documentElement.clientWidth")
    ok = sw <= cw + 1
    t = "OK" if ok else f"FAIL ({sw} > {cw})"
    print(f"[320px light]: scroll {t}")
    ctx.close()

    # Dark theme at 768px
    ctx = browser.new_context(viewport={"width": 768, "height": 900})
    page = ctx.new_page()
    page.goto(url, wait_until="networkidle")
    sw = page.evaluate("document.documentElement.scrollWidth")
    cw = page.evaluate("document.documentElement.clientWidth")
    ok = sw <= cw + 1
    t = "OK" if ok else f"FAIL ({sw} > {cw})"
    print(f"[768px dark]: scroll {t}")
    ctx.close()

    browser.close()
srv.shutdown()
