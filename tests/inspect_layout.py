"""Inspect current rendering at narrow viewport."""
import subprocess, time, http.server, socketserver, threading, pathlib, os

DIST = pathlib.Path(__file__).resolve().parent.parent / "dist"
os.chdir(str(DIST))

class H(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass

srv = socketserver.TCPServer(("", 8766), H)
th = threading.Thread(target=srv.serve_forever, daemon=True)
th.start()
time.sleep(0.3)

from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    ctx = browser.new_context(viewport={"width": 320, "height": 700})
    page = ctx.new_page()
    page.goto("http://localhost:8766/courses/hydroponic-container-farming/index.html", wait_until="networkidle")

    # Breadcrumb structure
    bc = page.locator("nav.breadcrumb")
    children = bc.locator("> *").all()
    print("=== Breadcrumb items at 320px ===")
    for i, el in enumerate(children):
        txt = el.text_content()
        box = el.bounding_box()
        print(f"  [{i}] '{txt}' width={box['width']:.0f}px height={box['height']:.0f}px")

    # Course header
    hdr = page.locator(".course-header")
    hb = hdr.bounding_box()
    print(f"\nCourse header: height={hb['height']:.0f}px")

    # Lesson items
    print("\n=== First 3 lesson items ===")
    items = page.locator(".lesson-item")
    for i in range(min(3, items.count())):
        ib = items.nth(i).bounding_box()
        print(f"  Lesson {i}: h={ib['height']:.0f}px w={ib['width']:.0f}px")
        link = items.nth(i).locator("a")
        lb = link.bounding_box()
        if lb:
            print(f"    Link: h={lb['height']:.0f}px w={lb['width']:.0f}px")
        desc = items.nth(i).locator("p")
        if desc.count():
            db = desc.bounding_box()
            print(f"    Desc: h={db['height']:.0f}px w={db['width']:.0f}px")
        rt = items.nth(i).locator(".reading-time")
        if rt.count():
            rtb = rt.bounding_box()
            print(f"    ReadingTime: h={rtb['height']:.0f}px w={rtb['width']:.0f}px")

    # Description
    desc = page.locator(".course-description")
    db = desc.bounding_box()
    print(f"\nCourse description: w={db['width']:.0f}px h={db['height']:.0f}px")

    # Container width
    ct = page.locator(".container").first.bounding_box()
    print(f"\nContainer at 320px: w={ct['width']:.0f}px")
    print("Content padding:", page.evaluate("getComputedStyle(document.querySelector('.container')).paddingLeft"))

    # Total page
    print(f"Total scrollHeight: {page.evaluate('document.documentElement.scrollHeight')}px")

    ctx.close()
    browser.close()
srv.shutdown()
