"""
Tests: Lesson page responsive CSS rules (Issue #19).

These tests verify the built CSS contains the responsive rules
needed for lesson reading. They check string presence/rules
in the compiled stylesheet.

Run: python3 -m pytest tests/test_responsive.py -v
"""
import pytest

CSS_PATH = "assets/styles.css"


@pytest.fixture(scope="module")
def css():
    with open(CSS_PATH) as f:
        return f.read()


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def rule_exists(css: str, rule_fragment: str) -> bool:
    """Check if *rule_fragment* (e.g. 'max-width: 740px') appears anywhere."""
    return rule_fragment in css


def selector_exists(css: str, selector: str) -> bool:
    """Check if the CSS selector text appears."""
    return selector in css


def media_rule_exists(css: str, media_query: str, rules: list[str]) -> bool:
    """Check that *rules* all appear inside a @media *media_query* block."""
    # Find the @media block — walk past the first '{' and track brace depth
    start = css.find(f"@media {media_query}")
    if start == -1:
        return False
    # find the opening '{'
    brace_start = css.find("{", start)
    if brace_start == -1:
        return False
    depth = 0
    end = brace_start
    for i, ch in enumerate(css[brace_start:], start=brace_start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    block = css[brace_start:end]
    for r in rules:
        if r not in block:
            return False
    return True


# ===============================================================
# 1. Content sizing — comfortable line length
# ===============================================================

class TestLessonContentSizing:
    def test_has_max_width(self, css):
        assert rule_exists(css, "max-width: 740px")

    def test_has_auto_margins(self, css):
        assert rule_exists(css, "margin: 0 auto")


# ===============================================================
# 2. Long strings / URLs — overflow-wrap & word-break
# ===============================================================

class TestTextOverflowSafety:
    def test_overflow_wrap(self, css):
        assert rule_exists(css, "overflow-wrap: break-word")

    def test_word_break(self, css):
        assert rule_exists(css, "word-break: break-word")


# ===============================================================
# 3. Tables — scrollable within bounded content region
# ===============================================================

class TestTableOverflow:
    def test_table_overflow_x_auto(self, css):
        assert selector_exists(css, ".lesson-content table")
        assert rule_exists(css, "overflow-x: auto")

    def test_table_display_block(self, css):
        assert rule_exists(css, "display: block")
        assert rule_exists(css, "display: table")


# ===============================================================
# 4. Pre / code — local horizontal scroll
# ===============================================================

class TestPreScroll:
    def test_pre_overflow_x_auto(self, css):
        assert selector_exists(css, ".lesson-content pre")
        assert rule_exists(css, "overflow-x: auto")


# ===============================================================
# 5. Images / video / iframe — defensive max-width
# ===============================================================

class TestMediaConstraints:
    def test_img_max_width(self, css):
        assert rule_exists(css, "max-width: 100%")

    def test_svg_max_width(self, css):
        assert selector_exists(css, ".lesson-content svg")


# ===============================================================
# 6. Payoff-diagram / wide containers — defensive overflow
# ===============================================================

class TestWideContainerOverflow:
    def test_payoff_diagram_overflow(self, css):
        assert selector_exists(css, ".lesson-content .payoff-diagram")
        assert rule_exists(css, "overflow-x: auto")


# ===============================================================
# 7. Breadcrumb — mobile vertical stacking (no orphaned separators)
# ===============================================================

class TestBreadcrumbMobile:
    def test_breadcrumb_columns_on_mobile(self, css):
        assert media_rule_exists(
            css, "(max-width: 640px)",
            ["flex-direction: column", ".breadcrumb"],
        ), "breadcrumb should stack vertically on mobile"

    def test_breadcrumb_separator_hidden_on_mobile(self, css):
        assert media_rule_exists(
            css, "(max-width: 640px)",
            [".breadcrumb .separator", "display: none"],
        ), "separators hidden when breadcrumb stacks"


# ===============================================================
# 8. Lesson nav — full-width wrapping buttons
# ===============================================================

class TestLessonNavMobile:
    def test_nav_stacks_on_mobile(self, css):
        assert media_rule_exists(
            css, "(max-width: 640px)",
            [".lesson-nav", "flex-direction: column"],
        ), "lesson-nav should stack on mobile"

    def test_nav_links_full_width_on_mobile(self, css):
        assert media_rule_exists(
            css, "(max-width: 640px)",
            [".lesson-nav a", "width: 100%"],
        ), "lesson-nav links should be full-width on mobile"


# ===============================================================
# 9. Print styles — chrome hidden, content not clipped
# ===============================================================

class TestPrintStyles:
    def test_print_hides_chrome(self, css):
        assert media_rule_exists(
            css, "print",
            [".site-header", ".site-footer", ".skip-link",
             ".search-section", ".lesson-nav", ".theme-toggle",
             ".breadcrumb", "display: none"],
        ), "Print should hide navigation chrome"

    def test_print_pre_visible(self, css):
        assert media_rule_exists(
            css, "print",
            ["overflow-x: visible"],
        ) or media_rule_exists(
            css, "print",
            ["white-space: pre-wrap"],
        ), "Print should show full pre content"

    def test_print_table_not_clipped(self, css):
        assert media_rule_exists(
            css, "print",
            ["display: table"],
        ) or media_rule_exists(
            css, "print",
            ["width: auto"],
        ), "Print should show full table content"

    def test_print_background_colors(self, css):
        assert media_rule_exists(
            css, "print",
            ["print-color-adjust: exact"],
        ), "Print should preserve background colors"

    def test_lesson_content_overflows_visible(self, css):
        assert media_rule_exists(
            css, "print",
            [".lesson-content", "overflow-x: visible"],
        ), "Print should allow full content width"


# ===============================================================
# 10. No document-level horizontal scrolling (mobile)
# ===============================================================

class TestNoHorizontalScroll:
    def test_body_overflow_x_hidden_on_mobile(self, css):
        assert media_rule_exists(
            css, "(max-width: 640px)",
            ["body", "overflow-x: hidden"],
        ), "Body should hide horizontal overflow on mobile"


# ===============================================================
# 11. Touch-friendly nav on coarse pointer
# ===============================================================

class TestTouchTargets:
    def test_coarse_pointer_padding(self, css):
        assert selector_exists(css, "@media (pointer: coarse)")
        # At least verify the rule exists somewhere
        assert ".lesson-nav a {" in css


# ===============================================================
# 12. Body-level overflow guard
# ===============================================================

class TestBodyOverflowGuard:
    def test_body_overflow_x_hidden(self, css):
        assert rule_exists(css, "overflow-x: hidden")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
