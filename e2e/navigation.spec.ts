import { test, expect } from '@playwright/test';

/**
 * Navigation and Page Load Tests
 * Tests that all routes are accessible and load correctly
 */

test.describe('Navigation - Public Routes', () => {
  test('Home page loads successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title and key elements
    await expect(page.locator('h1')).toContainText('Ocean PULSE');
    await expect(page.locator('text=Marine Protected Area Monitor')).toBeVisible();

    // Take visual snapshot
    await expect(page).toHaveScreenshot('home-page.png', { fullPage: true });
  });

  test('Home page shows MPA stats', async ({ page }) => {
    await page.goto('/');

    // Wait for data to load
    await page.waitForSelector('text=MPAs');

    // Check stats are displayed
    await expect(page.locator('text=MPAs')).toBeVisible();
    await expect(page.locator('text=Species')).toBeVisible();
    await expect(page.locator('text=Countries')).toBeVisible();
  });

  test('Species search page loads', async ({ page }) => {
    await page.goto('/species');

    // Check search input is present
    await expect(page.locator('input[type="search"], input[placeholder*="Search"]')).toBeVisible();

    // Check OBIS attribution
    await expect(page.locator('text=OBIS')).toBeVisible();

    await expect(page).toHaveScreenshot('species-page.png', { fullPage: true });
  });

  test('Nearby page loads and requests location', async ({ page }) => {
    await page.goto('/nearby');

    // Page should show location-related content
    await expect(page.locator('text=/nearby|location|GPS/i')).toBeVisible();

    await expect(page).toHaveScreenshot('nearby-page.png', { fullPage: true });
  });

  test('Indicator species page loads', async ({ page }) => {
    await page.goto('/indicator-species');

    // Check page header
    await expect(page.locator('text=/indicator species/i')).toBeVisible();

    // Check filters are present
    await expect(page.locator('text=/filter|category/i')).toBeVisible();

    await expect(page).toHaveScreenshot('indicator-species-page.png', { fullPage: true });
  });

  test('Offline page loads', async ({ page }) => {
    await page.goto('/offline');

    // Check storage info is displayed
    await expect(page.locator('text=/storage|cache|offline/i')).toBeVisible();

    await expect(page).toHaveScreenshot('offline-page.png', { fullPage: true });
  });
});

test.describe('Navigation - MPA Detail Pages', () => {
  const mpas = [
    { id: 'gbr-australia', name: 'Great Barrier Reef' },
    { id: 'mediterranean-sea', name: 'Mediterranean' },
    { id: 'galapagos-ecuador', name: 'Galápagos' },
  ];

  for (const mpa of mpas) {
    test(`MPA detail page loads: ${mpa.name}`, async ({ page }) => {
      await page.goto(`/mpa/${mpa.id}`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check MPA name is displayed (case-insensitive partial match)
      const namePattern = new RegExp(mpa.name.split(' ')[0], 'i');
      await expect(page.locator(`text=${namePattern}`).first()).toBeVisible({ timeout: 15000 });

      // Check health score is displayed
      await expect(page.locator('text=/health|score/i').first()).toBeVisible();

      await expect(page).toHaveScreenshot(`mpa-${mpa.id}.png`, { fullPage: true });
    });
  }
});

test.describe('Navigation - Auth-Required Routes', () => {
  test('Login page loads', async ({ page }) => {
    await page.goto('/login');

    // Check OAuth buttons are present
    await expect(page.locator('text=/sign in|log in|google|github/i').first()).toBeVisible();

    await expect(page).toHaveScreenshot('login-page.png', { fullPage: true });
  });

  test('Observe page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/observe');

    // Should either show login prompt or redirect
    const url = page.url();
    const hasLoginPrompt = await page.locator('text=/sign in|log in/i').count() > 0;

    expect(url.includes('login') || hasLoginPrompt).toBeTruthy();
  });

  test('Profile page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/profile');

    // Should either show login prompt or redirect
    const url = page.url();
    const hasLoginPrompt = await page.locator('text=/sign in|log in/i').count() > 0;

    expect(url.includes('login') || hasLoginPrompt).toBeTruthy();
  });

  test('Saved page redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/saved');

    // Should either show login prompt or redirect
    const url = page.url();
    const hasLoginPrompt = await page.locator('text=/sign in|log in/i').count() > 0;

    expect(url.includes('login') || hasLoginPrompt).toBeTruthy();
  });
});

test.describe('Navigation - Bottom Navigation Bar', () => {
  test('Bottom navigation is visible on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check navigation items
    await expect(page.locator('text=Map')).toBeVisible();
    await expect(page.locator('text=Nearby')).toBeVisible();
    await expect(page.locator('text=Species')).toBeVisible();
    await expect(page.locator('text=Observe')).toBeVisible();
    await expect(page.locator('text=Profile')).toBeVisible();
  });

  test('Navigation links work correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Click Nearby
    await page.click('text=Nearby');
    await expect(page).toHaveURL(/nearby/);

    // Click Species
    await page.click('text=Species');
    await expect(page).toHaveURL(/species/);

    // Click Map (should show map view or navigate)
    await page.click('text=Map');
    // Map might open in same page, so just verify no error
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Navigation - Back Button and History', () => {
  test('Back button works from MPA detail to home', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on an MPA
    const mpaLink = page.locator('a[href*="/mpa/"]').first();
    if (await mpaLink.count() > 0) {
      await mpaLink.click();
      await page.waitForLoadState('networkidle');

      // Go back
      await page.goBack();
      await expect(page).toHaveURL('/');
    }
  });

  test('Back to Home button on MPA detail page', async ({ page }) => {
    await page.goto('/mpa/gbr-australia');
    await page.waitForLoadState('networkidle');

    // Look for back button/link
    const backButton = page.locator('text=/back|home/i').or(page.locator('a[href="/"]')).first();
    if (await backButton.count() > 0) {
      await backButton.click();
      await expect(page).toHaveURL('/');
    }
  });
});
