"""Compare layout metrics before vs after CSS changes."""
import subprocess, time, http.server, socketserver, threading, pathlib, os

DIST = pathlib.Path(__file__).resolve().parent.parent / "dist"
os.chdir(str(DIST))

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

srv = socketserver.TCPServer(("", 9990), H)
th = threading.Thread(target=srv.serve_forever, daemon=True)
th.start()
time.sleep(0.3)

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])

    for label, vp in [("320px", (320, 700)), ("375px", (375, 700)), ("768px", (768, 900))]:
        ctx = browser.new_context(viewport={"width": vp[0], "height": vp[1]})
        page = ctx.new_page()
        page.goto("http://localhost:9990/courses/hydroponic-container-farming/index.html", wait_until="networkidle")

        ct = page.locator(".container").first.bounding_box()
        hdr = page.locator(".course-header").bounding_box()
        desc = page.locator(".course-description").bounding_box()
        bc = page.locator("nav.breadcrumb").bounding_box()
        meta = page.locator(".course-meta-bar").bounding_box()
        li = page.locator(".lesson-item").first.bounding_box()
        total = page.evaluate("document.documentElement.scrollHeight")

        print(f"\n=== {label} ===")
        print(f"  Breadcrumb:      {bc['width']:5.0f} x {bc['height']:5.0f}px" if bc else "  Breadcrumb: N/A")
        print(f"  Course header:   {hdr['width']:5.0f} x {hdr['height']:5.0f}px" if hdr else "  Header: N/A")
        print(f"  Description:     {desc['width']:5.0f} x {desc['height']:5.0f}px" if desc else "  Desc: N/A")
        print(f"  Meta bar:        {meta['width']:5.0f} x {meta['height']:5.0f}px" if meta else "  Meta: N/A")
        print(f"  Lesson item 0:   {li['width']:5.0f} x {li['height']:5.0f}px" if li else "  Lesson: N/A")
        print(f"  Container:       {ct['width']:5.0f}px" if ct else "  Container: N/A")
        print(f"  Total page:      {total:5d}px")

        ctx.close()

    browser.close()
srv.shutdown()
