// @ts-check
import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { width: 320, height: 800, label: '320px (narrow mobile)' },
  { width: 375, height: 800, label: '375px (mobile)' },
  { width: 768, height: 900, label: '768px (tablet)' },
  { width: 1024, height: 900, label: '1024px (desktop)' },
  { width: 1280, height: 900, label: '1280px (wide desktop)' },
];

/**
 * Check that no element overflows the document width
 */
async function hasNoHorizontalScroll(page) {
  return page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const body = document.body;
    // Check if body scrollWidth exceeds viewport (overflow-x: hidden might mask it)
    const scrollWidth = Math.max(
      body.scrollWidth,
      document.documentElement.scrollWidth,
      body.offsetWidth
    );
    return scrollWidth <= docWidth + 1; // 1px tolerance for subpixel
  });
}

/**
 * Check if a selector's width is within viewport bounds
 */
async function elementFitsViewport(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= document.documentElement.clientWidth;
  }, selector);
}

test.describe('Homepage responsive course discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for content to render and search to initialize
    await page.waitForSelector('.course-card', { timeout: 10000 });
  });

  for (const vp of VIEWPORTS) {
    test(`no horizontal scrolling at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Allow layout to settle
      await page.waitForTimeout(200);
      expect(await hasNoHorizontalScroll(page)).toBe(true);
    });
  }

  for (const vp of VIEWPORTS) {
    test(`search input fits viewport at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(200);
      const fits = await elementFitsViewport(page, '.search-wrapper');
      expect(fits).toBe(true);
    });
  }

  test('course grid renders as single column at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.waitForTimeout(200);
    // Check visually: all cards have same left offset (single column)
    const leftOffsets = await page.locator('.course-card').evaluateAll((cards) => {
      return cards.map(c => c.getBoundingClientRect().left);
    });
    expect(leftOffsets.length).toBeGreaterThan(0);
    const sameLeft = leftOffsets.every(l => Math.abs(l - leftOffsets[0]) < 2);
    expect(sameLeft).toBe(true);
  });

  test('course grid renders as single column at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(200);
    // Check visually: all cards have same left offset (single column)
    const leftOffsets = await page.locator('.course-card').evaluateAll((cards) => {
      return cards.map(c => c.getBoundingClientRect().left);
    });
    expect(leftOffsets.length).toBeGreaterThan(0);
    const sameLeft = leftOffsets.every(l => Math.abs(l - leftOffsets[0]) < 2);
    expect(sameLeft).toBe(true);
  });

  test('course grid shows multiple columns at 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.waitForTimeout(200);
    const grid = page.locator('.courses-grid');
    const colCount = await grid.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.gridTemplateColumns;
    });
    // Should have multiple columns (not 1fr)
    const parts = colCount.split(' ').filter(s => s.trim());
    expect(parts.length).toBeGreaterThan(1);
  });

  test('course grid shows multiple columns at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(200);
    const grid = page.locator('.courses-grid');
    const colCount = await grid.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return style.gridTemplateColumns;
    });
    const parts = colCount.split(' ').filter(s => s.trim());
    expect(parts.length).toBeGreaterThan(1);
  });

  test('course cards are visible and have proper structure', async ({ page }) => {
    const cards = page.locator('.course-card');
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);

    // Each card has a heading with a link
    const firstCard = cards.first();
    await expect(firstCard.locator('h2 a')).toBeVisible();
    // Each card has a description
    await expect(firstCard.locator('p')).toBeVisible();
    // Each card has meta info
    await expect(firstCard.locator('.course-card-meta')).toBeVisible();
  });

  // AC3: Long course title and badge reflow
  test('long course titles and badges reflow without overflowing', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(200);

    // Check that no course card header overflows
    const headers = page.locator('.course-card-header');
    const count = await headers.count();
    for (let i = 0; i < count; i++) {
      const fits = await headers.nth(i).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.right <= document.documentElement.clientWidth + 1;
      });
      expect(fits).toBe(true);
    }
  });

  // AC5-6: Search functionality
  test('search input filters courses on typing', async ({ page }) => {
    const searchInput = page.locator('#search-input');
    await expect(searchInput).toBeVisible();

    // Type a search term
    await searchInput.fill('hydroponic');
    await page.waitForTimeout(100);

    // At least one card should remain visible
    const visibleCards = page.locator('.course-card:visible');
    const visibleCount = await visibleCards.count();
    expect(visibleCount).toBeGreaterThan(0);
  });

  test('search shows no-results for unmatched query', async ({ page }) => {
    const searchInput = page.locator('#search-input');
    await searchInput.fill('zzzzzzz_no_match');
    await page.waitForTimeout(100);

    const noResults = page.locator('.no-results');
    await expect(noResults).toBeVisible();
    await expect(noResults).toContainText('No courses match');
  });

  test('keyboard shortcut ⌘K focuses search', async ({ page }) => {
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(50);
    const activeEl = page.locator('#search-input');
    await expect(activeEl).toBeFocused();
  });

  // AC7: Touch targets
  for (const vp of VIEWPORTS) {
    test(`touch targets meet minimum at ${vp.label}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(200);

      const navBtns = page.locator('.nav-icon-btn');
      const btnCount = await navBtns.count();
      for (let i = 0; i < btnCount; i++) {
        const btn = navBtns.nth(i);
        const box = await btn.boundingBox();
        expect(box).not.toBeNull();
        // At 320px we allow 40px minimum for very narrow
        // At other sizes, 44px minimum
        const minTarget = vp.width <= 380 ? 40 : 44;
        expect(box.width).toBeGreaterThanOrEqual(minTarget);
        expect(box.height).toBeGreaterThanOrEqual(minTarget);
      }
    });
  }

  // AC8: Recently Updated
  test('Recently Updated section renders without overflow', async ({ page }) => {
    const section = page.locator('.recently-updated');
    const exists = (await section.count()) > 0;
    if (!exists) {
      test.skip();
      return;
    }

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.waitForTimeout(200);

      // Each recently updated card should fit the viewport
      const cards = section.locator('.recently-updated-card');
      const cardCount = await cards.count();
      for (let i = 0; i < cardCount; i++) {
        const fits = await cards.nth(i).evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.left >= 0 && rect.right <= document.documentElement.clientWidth + 1;
        });
        expect(fits).toBe(true);
      }
    }
  });

  // AC9: Footer stacks at narrow widths
  test('footer stacks vertically at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.waitForTimeout(200);

    const footerContainer = page.locator('.site-footer .container');
    const flexDir = await footerContainer.evaluate((el) => {
      return window.getComputedStyle(el).flexDirection;
    });
    expect(flexDir).toBe('column');
  });

  // Tags wrap without overflow
  test('tags wrap within card width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(200);

    const tagContainers = page.locator('.course-card-tags');
    const count = await tagContainers.count();
    for (let i = 0; i < count; i++) {
      const fits = await tagContainers.nth(i).evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.right <= document.documentElement.clientWidth + 1;
      });
      expect(fits).toBe(true);
    }
  });

  // Desktop search hint visible at desktop
  test('search shortcut hint is visible at 1280px', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(200);

    const shortcut = page.locator('.search-shortcut');
    await expect(shortcut).toBeVisible();
  });

  test('search shortcut hint is hidden at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.waitForTimeout(200);

    const shortcut = page.locator('.search-shortcut');
    await expect(shortcut).not.toBeVisible();
  });
});
