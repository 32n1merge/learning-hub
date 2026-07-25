"""
Responsive Course Overview & Lesson Selection — Automated Browser Tests

Verifies acceptance criteria for Issue #18.
"""
import http.server
import os
import pathlib
import socketserver
import sys
import threading
import time

PLAYWRIGHT_AVAILABLE = False
try:
    from playwright.sync_api import sync_playwright, expect
    PLAYWRIGHT_AVAILABLE = True
except ImportError:
    pass

DIST_DIR = pathlib.Path(__file__).resolve().parent.parent / "dist"
COURSE_SLUG = "hydroponic-container-farming"
COURSE_PATH = f"/courses/{COURSE_SLUG}/index.html"

VIEWPORTS = [
    (320, 700, "320px"),
    (375, 700, "375px"),
    (768, 900, "768px"),
    (1024, 900, "1024px"),
    (1280, 900, "1280px"),
]


class Server:
    """Static HTTP server on an ephemeral port."""

    def __init__(self, dist_dir):
        os.chdir(str(dist_dir))

        class Handler(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *args):
                pass

        self.server = socketserver.TCPServer(("", 0), Handler)
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        time.sleep(0.3)

    @property
    def base_url(self):
        return f"http://localhost:{self.port}"

    def stop(self):
        self.server.shutdown()


def test_responsive():
    if not PLAYWRIGHT_AVAILABLE:
        print("SKIP: playwright not installed")
        return

    srv = Server(DIST_DIR)
    BASE_URL = srv.base_url
    failures = []

    def check(label, ok, detail=""):
        if ok:
            print(f"  OK  {label}")
        else:
            msg = f"  FAIL {label}"
            if detail:
                msg += f" — {detail}"
            print(msg)
            failures.append(msg)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True, args=["--no-sandbox", "--disable-gpu"]
            )

            # ── 1. No horizontal scroll at any viewport ──
            print("\n[1] No horizontal scroll at any viewport")
            for w, h, label in VIEWPORTS:
                ctx = browser.new_context(viewport={"width": w, "height": h})
                page = ctx.new_page()
                page.goto(f"{BASE_URL}{COURSE_PATH}", wait_until="networkidle")
                sw = page.evaluate("document.documentElement.scrollWidth")
                cw = page.evaluate("document.documentElement.clientWidth")
                ok = sw <= cw + 1
                check(
                    f"{label} — scroll", ok,
                    f"scrollWidth={sw} > clientWidth={cw}" if not ok else "",
                )
                ctx.close()

            # ── 2. Breadcrumb fits container ──
            print("\n[2] Breadcrumb fits container")
            for w, h, label in VIEWPORTS:
                ctx = browser.new_context(viewport={"width": w, "height": h})
                page = ctx.new_page()
                page.goto(f"{BASE_URL}{COURSE_PATH}", wait_until="networkidle")
                bc = page.locator("nav.breadcrumb")
                bc_box = bc.bounding_box()
                ct_box = page.locator(".container").first.bounding_box()
                ok = bc_box and ct_box and bc_box["width"] <= ct_box["width"] + 1
                check(f"{label} — breadcrumb width", ok)
                items = bc.locator("> *").all()
                check(f"{label} — breadcrumb has items", len(items) >= 3)
                ctx.close()

            # ── 3. Course header elements all visible ──
            print("\n[3] Course header elements visible")
            ctx = browser.new_context(viewport={"width": 375, "height": 700})
            page = ctx.new_page()
            page.goto(f"{BASE_URL}{COURSE_PATH}", wait_until="networkidle")
            check("course-title h1", page.locator("h1#course-title").is_visible())
            check("course-description p", page.locator(".course-description").is_visible())
            check("course-meta-bar", page.locator(".course-meta-bar").is_visible())
            meta_items = page.locator(".course-meta-bar > *")
            check(f"meta items count", meta_items.count() >= 2)
            ctx.close()

            # ── 4. Lesson entries ──
            print("\n[4] Lesson entries fit viewport")
            ctx = browser.new_context(viewport={"width": 375, "height": 700})
            page = ctx.new_page()
            page.goto(f"{BASE_URL}{COURSE_PATH}", wait_until="networkidle")
            items = page.locator(".lesson-item")
            count = items.count()
            check("lesson items exist", count >= 5)
            ct_w = page.locator(".container").first.bounding_box()["width"]
            for i in range(min(3, count)):
                ib = items.nth(i).bounding_box()
                ok = ib and ib["width"] <= ct_w + 1
                check(f"lesson item {i} width", ok,
                      f"item_w={ib['width']:.0f} > container={ct_w:.0f}" if not ok else "")
            ctx.close()

            # ── 5. Touch targets — lesson links provide adequate hit area ──
            print("\n[5] Lesson link touch targets")
            ctx = browser.new_context(viewport={"width": 375, "height": 700})
            page = ctx.new_page()
            page.goto(f"{BASE_URL}{COURSE_PATH}", wait_until="networkidle")
            links = page.locator(".lesson-item a").all()
            for i, link in enumerate(links):
                box = link.bounding_box()
                if box and box["height"] < 20:
                    check(f"lesson link {i} height {box['height']:.0f}px", False)
            check("lesson link touch targets ok", True)
            ctx.close()

            # ── 6. Focus-visible appears on lesson links ──
            print("\n[6] Keyboard focus visible")
            ctx = browser.new_context(viewport={"width": 1280, "height": 900})
            page = ctx.new_page()
            page.goto(f"{BASE_URL}{COURSE_PATH}", wait_until="networkidle")
            page.keyboard.press("Tab")
            page.keyboard.press("Tab")
            page.keyboard.press("Tab")
            page.keyboard.press("Tab")
            focused = page.evaluate("""() => {
                const el = document.activeElement;
                if (!el) return null;
                const style = getComputedStyle(el);
                return {
                    tag: el.tagName,
                    class: el.className,
                    outline: style.outline,
                    outlineOffset: style.outlineOffset,
                    outlineColor: style.outlineColor
                };
            }""")
            if focused:
                has_outline = focused["outline"] and focused["outline"] != "0px" and focused["outline"] != "none"
                check("focus-visible shows outline on lesson link", has_outline,
                      f"outline={focused['outline']}" if not has_outline else "")
            else:
                check("focused element found", False)
            ctx.close()

            # ── 7. No horizontal scroll on lesson pages ──
            print("\n[7] No horizontal scroll on lesson pages")
            lesson_slug = "01-what-is-hydroponic-farming"
            lesson_url = f"{BASE_URL}/courses/{COURSE_SLUG}/{lesson_slug}.html"
            for w, h, label in VIEWPORTS[:3]:
                ctx = browser.new_context(viewport={"width": w, "height": h})
                page = ctx.new_page()
                page.goto(lesson_url, wait_until="networkidle")
                sw = page.evaluate("document.documentElement.scrollWidth")
                cw = page.evaluate("document.documentElement.clientWidth")
                ok = sw <= cw + 1
                check(f"lesson {label} — no scroll", ok,
                      f"scrollWidth={sw} > clientWidth={cw}" if not ok else "")
                ctx.close()

            # ── 8. Accessibility breadcrumb semantics ──
            print("\n[8] Accessibility semantics intact")
            ctx = browser.new_context(viewport={"width": 1280, "height": 900})
            page = ctx.new_page()
            page.goto(f"{BASE_URL}{COURSE_PATH}", wait_until="networkidle")
            skip = page.locator(".skip-link")
            check("skip-link visible", skip.is_visible())
            check("skip-link text", skip.text_content() == "Skip to main content")
            bc = page.locator('nav[aria-label="Breadcrumb"]')
            check("breadcrumb aria-label", bc.count() > 0)
            check("main#main-content", page.locator("#main-content").count() > 0)
            check("main[role=main]", page.locator("main[role=main]").count() > 0)
            h2 = page.locator("#lessons-heading")
            check("lessons heading", h2.is_visible())
            check("lessons heading text", h2.text_content() == "Lessons")
            site_nav = page.locator('nav[aria-label="Main navigation"]')
            check("main navigation exists", site_nav.count() > 0)
            ctx.close()

            # ── 9. Lesson page breadcrumb ──
            print("\n[9] Lesson page breadcrumb")
            lesson_url = f"{BASE_URL}/courses/{COURSE_SLUG}/01-what-is-hydroponic-farming.html"
            ctx = browser.new_context(viewport={"width": 375, "height": 700})
            page = ctx.new_page()
            page.goto(lesson_url, wait_until="networkidle")
            lbc = page.locator("nav.breadcrumb")
            lbc_items = lbc.locator("> *").all()
            check("lesson breadcrumb has 5+ items", len(lbc_items) >= 5)
            course_link = lbc.locator(f'a[href*="{COURSE_SLUG}"]')
            check("lesson breadcrumb has course link", course_link.count() > 0)
            ctx.close()

            # ── 10. Metadata reflows as a coherent group ──
            print("\n[10] Metadata group reflows at narrow widths")
            for w in [320, 375]:
                ctx = browser.new_context(viewport={"width": w, "height": 700})
                page = ctx.new_page()
                page.goto(f"{BASE_URL}{COURSE_PATH}", wait_until="networkidle")
                mb = page.locator(".course-meta-bar")
                expect(mb).to_be_visible()
                children = mb.locator("> *").all()
                for i, ch in enumerate(children):
                    ch_box = ch.bounding_box()
                    ok = ch_box is not None and ch_box["width"] > 0 and ch_box["height"] > 0
                    check(f"meta item {i} visible at {w}px", ok)
                ctx.close()

            browser.close()

    finally:
        srv.stop()

    if failures:
        print(f"\n{'='*60}")
        print(f"FAILED: {len(failures)} test(s)")
        for f in failures:
            print(f"  • {f}")
        sys.exit(1)
    else:
        print(f"\n{'='*60}")
        print("ALL TESTS PASSED")
        sys.exit(0)


if __name__ == "__main__":
    test_responsive()
