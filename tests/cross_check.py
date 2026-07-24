"""Cross-check: Options trading course (different content density)."""
import os, pathlib, socketserver, threading, time, http.server, sys

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
    for label, (w, h) in [("320px", (320, 700)), ("375px", (375, 700))]:
        ctx = browser.new_context(viewport={"width": w, "height": h})
        page = ctx.new_page()
        page.goto(f"http://localhost:{port}/courses/options-trading/index.html", wait_until="networkidle")
        sw = page.evaluate("document.documentElement.scrollWidth")
        cw = page.evaluate("document.documentElement.clientWidth")
        status = "OK" if sw <= cw + 1 else "FAIL"
        print(f"[{label}] Options course — scroll: {status} (scrollWidth={sw}, clientWidth={cw})")
        ctx.close()
    browser.close()
srv.shutdown()
