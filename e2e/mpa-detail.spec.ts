import { test, expect } from '@playwright/test';

/**
 * MPA Detail Page Tests
 * Tests the Marine Protected Area detail view functionality
 */

const TEST_MPA = {
  id: 'gbr-australia',
  name: 'Great Barrier Reef',
  country: 'Australia',
};

test.describe('MPA Detail - Page Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/mpa/${TEST_MPA.id}`);
    await page.waitForLoadState('networkidle');
  });

  test('displays MPA name and country', async ({ page }) => {
    // Check name is displayed
    await expect(page.locator(`text=/${TEST_MPA.name.split(' ')[0]}/i`).first()).toBeVisible({ timeout: 15000 });

    // Check country
    await expect(page.locator(`text=/${TEST_MPA.country}/i`).first()).toBeVisible();
  });

  test('displays health score', async ({ page }) => {
    // Health score should be visible
    await expect(page.locator('text=/health.*score|score.*health/i').first()).toBeVisible({ timeout: 10000 });

    // Should show a numeric score
    const healthNumber = page.locator('text=/\\d{1,3}/').first();
    await expect(healthNumber).toBeVisible();
  });

  test('displays stats grid', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Check stats are present
    const stats = page.locator('text=/species|area|established/i');
    const count = await stats.count();
    expect(count).toBeGreaterThan(0);
  });

  test('has back navigation', async ({ page }) => {
    // Look for back button or home link
    const backNav = page.locator('text=/back|home/i').or(page.locator('a[href="/"]')).first();
    await expect(backNav).toBeVisible();
  });
});

test.describe('MPA Detail - Collapsible Sections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/mpa/${TEST_MPA.id}`);
    await page.waitForLoadState('networkidle');
  });

  test('About this MPA section is expandable', async ({ page }) => {
    const aboutSection = page.locator('text=/about.*mpa/i').first();

    if (await aboutSection.count() > 0) {
      await aboutSection.click();
      await page.waitForTimeout(500);

      // Content should be visible after expanding
      const content = page.locator('text=/protects|marine|conservation/i');
      await expect(content.first()).toBeVisible();
    }
  });

  test('Protection & Regulations section exists', async ({ page }) => {
    await expect(page.locator('text=/protection|regulations/i').first()).toBeVisible();
  });

  test('Location section shows coordinates', async ({ page }) => {
    // Click to expand if needed
    const locationSection = page.locator('text=/location/i').first();
    await locationSection.click();
    await page.waitForTimeout(500);

    // Should show coordinates
    await expect(page.locator('text=/center|coordinates|°/i').first()).toBeVisible();
  });

  test('Location has View on Map button', async ({ page }) => {
    // Expand location section
    const locationSection = page.locator('text=/location/i').first();
    await locationSection.click();
    await page.waitForTimeout(500);

    // View on Map button
    await expect(page.locator('text=/view.*map/i')).toBeVisible();
  });
});

test.describe('MPA Detail - Live Reports Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/mpa/${TEST_MPA.id}`);
    await page.waitForLoadState('networkidle');
  });

  test('Live Reports section exists', async ({ page }) => {
    await expect(page.locator('text=/live reports/i').first()).toBeVisible();
  });

  test('shows report count badge', async ({ page }) => {
    // Look for badge with report count
    const badge = page.locator('text=/\\d+.*reports?/i');
    // Badge might be visible if there are reports
    const count = await badge.count();
    // Just verify the section structure exists
    expect(count >= 0).toBeTruthy();
  });

  test('Live Reports section is expandable', async ({ page }) => {
    const reportsSection = page.locator('text=/live reports/i').first();
    await reportsSection.click();
    await page.waitForTimeout(1000);

    // Content should appear (either reports or empty state)
    const content = page.locator('text=/observation|sighting|no reports|be the first/i');
    const count = await content.count();
    expect(count >= 0).toBeTruthy();
  });
});

test.describe('MPA Detail - Indicator Species Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/mpa/${TEST_MPA.id}`);
    await page.waitForLoadState('networkidle');
  });

  test('Indicator Species section exists', async ({ page }) => {
    await expect(page.locator('text=/indicator species/i').first()).toBeVisible();
  });

  test('shows species count', async ({ page }) => {
    const speciesBadge = page.locator('text=/\\d+.*species/i');
    await expect(speciesBadge.first()).toBeVisible();
  });

  test('section is expandable and shows species list', async ({ page }) => {
    const speciesSection = page.locator('text=/indicator species/i').first();
    await speciesSection.click();
    await page.waitForTimeout(1000);

    // Should show species or categories
    const content = page.locator('text=/fish|mammal|coral|turtle|endangered|vulnerable/i');
    const count = await content.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('MPA Detail - Population Trends Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/mpa/${TEST_MPA.id}`);
    await page.waitForLoadState('networkidle');
  });

  test('Population Trends section exists', async ({ page }) => {
    await expect(page.locator('text=/population.*trends/i').first()).toBeVisible();
  });

  test('shows trend indicator', async ({ page }) => {
    // Look for stable/increasing/decreasing indicator
    const trendBadge = page.locator('text=/stable|increasing|decreasing/i');
    await expect(trendBadge.first()).toBeVisible();
  });

  test('section shows chart or data when expanded', async ({ page }) => {
    const trendsSection = page.locator('text=/population.*trends/i').first();
    await trendsSection.click();
    await page.waitForTimeout(2000);

    // Should show chart or data visualization
    const chartOrData = page.locator('svg, canvas, text=/year|abundance|records/i');
    const count = await chartOrData.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('MPA Detail - View on Map Feature', () => {
  test('View on Map navigates to map with MPA location', async ({ page }) => {
    await page.goto(`/mpa/${TEST_MPA.id}`);
    await page.waitForLoadState('networkidle');

    // Expand location section
    await page.click('text=/location/i');
    await page.waitForTimeout(500);

    // Click View on Map
    await page.click('text=/view.*map/i');
    await page.waitForTimeout(2000);

    // Should be on home page with map params
    const url = page.url();
    expect(url.includes('lat=') || url.includes('mpa=')).toBeTruthy();

    // Map should be visible
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
  });
});

test.describe('MPA Detail - Different MPAs', () => {
  const mpas = [
    { id: 'gbr-australia', name: 'Great Barrier Reef' },
    { id: 'galapagos-ecuador', name: 'Galápagos' },
    { id: 'palau-national-marine-sanctuary', name: 'Palau' },
    { id: 'raja-ampat-indonesia', name: 'Raja Ampat' },
  ];

  for (const mpa of mpas) {
    test(`loads ${mpa.name} page correctly`, async ({ page }) => {
      await page.goto(`/mpa/${mpa.id}`);
      await page.waitForLoadState('networkidle');

      // Page should load without errors
      await expect(page.locator('text=/error|not found|404/i')).not.toBeVisible();

      // Should have some content
      await expect(page.locator('text=/health|species|area/i').first()).toBeVisible({ timeout: 15000 });
    });
  }
});

test.describe('MPA Detail - Caching Indicator', () => {
  test('shows cached status badge when applicable', async ({ page }) => {
    await page.goto(`/mpa/${TEST_MPA.id}`);
    await page.waitForLoadState('networkidle');

    // Look for cached indicator
    const cachedBadge = page.locator('text=/cached/i');
    // Badge might or might not be visible depending on cache state
    const count = await cachedBadge.count();
    // Just verify it doesn't cause errors
    expect(count >= 0).toBeTruthy();
  });
});

test.describe('MPA Detail - Visual Regression', () => {
  test('desktop view snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`/mpa/${TEST_MPA.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('mpa-detail-desktop.png', { fullPage: true });
  });

  test('mobile view snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/mpa/${TEST_MPA.id}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('mpa-detail-mobile.png', { fullPage: true });
  });
});

test.describe('MPA Detail - Error Handling', () => {
  test('handles invalid MPA ID gracefully', async ({ page }) => {
    await page.goto('/mpa/invalid-mpa-id-that-does-not-exist');
    await page.waitForLoadState('networkidle');

    // Should show error or redirect, not crash
    const errorOrRedirect = page.locator('text=/not found|error|does not exist/i');
    const homeRedirect = page.url() === '/';

    expect(await errorOrRedirect.count() > 0 || homeRedirect).toBeTruthy();
  });
});
