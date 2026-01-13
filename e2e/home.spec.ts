import { test, expect } from '@playwright/test';

/**
 * Home Page Feature Tests
 * Tests the main landing page functionality
 */

test.describe('Home Page - Hero Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('displays app branding correctly', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Ocean PULSE');
    await expect(page.locator('text=Marine Protected Area Monitor')).toBeVisible();
  });

  test('displays quick stats', async ({ page }) => {
    // Wait for stats to load
    await page.waitForSelector('text=MPAs');

    // Check all three stat cards
    const stats = page.locator('text=/\\d+.*MPAs|\\d+.*Species|\\d+.*Countries/i');
    await expect(stats.first()).toBeVisible();
  });

  test('quick stats show numeric values', async ({ page }) => {
    // MPAs count should be a number
    const mpaCount = page.locator('text=/^\\d+$/').first();
    await expect(mpaCount).toBeVisible();
  });
});

test.describe('Home Page - Featured MPA Card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('displays featured MPA with details', async ({ page }) => {
    // Wait for MPA data to load
    await page.waitForTimeout(2000);

    // Check for MPA card content
    const mpaCard = page.locator('text=/area|species|est\\./i').first();
    await expect(mpaCard).toBeVisible();
  });

  test('Explore This MPA button navigates to detail page', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Click explore button
    const exploreButton = page.locator('text=/explore.*mpa/i').first();
    if (await exploreButton.count() > 0) {
      await exploreButton.click();
      await expect(page).toHaveURL(/\/mpa\//);
    }
  });

  test('displays health score indicator', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for circular progress or health score display
    const healthScore = page.locator('[class*="circular"]').or(page.locator('text=/\\d+%?.*health/i')).first();
    // Health score might be displayed as a number or progress indicator
    const scoreExists = await healthScore.count() > 0;
    expect(scoreExists || await page.locator('text=/health/i').count() > 0).toBeTruthy();
  });
});

test.describe('Home Page - Quick Action Cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Interactive Map card is clickable', async ({ page }) => {
    const mapCard = page.locator('text=Interactive Map').first();
    await expect(mapCard).toBeVisible();

    // Click should show map
    await mapCard.click();
    await page.waitForTimeout(1000);

    // Map should be visible or page should change
    const mapVisible = await page.locator('[class*="leaflet"], canvas').or(page.locator('text=/back.*home/i')).count() > 0;
    expect(mapVisible).toBeTruthy();
  });

  test('Find Nearby card navigates to nearby page', async ({ page }) => {
    const nearbyCard = page.locator('text=Find Nearby');
    await expect(nearbyCard).toBeVisible();

    await nearbyCard.click();
    await expect(page).toHaveURL(/nearby/);
  });

  test('Species card navigates to species page', async ({ page }) => {
    const speciesCard = page.locator('a[href="/species"]').or(page.locator('text=Species')).first();
    await speciesCard.click();
    await expect(page).toHaveURL(/species/);
  });

  test('Observe card navigates to observe page', async ({ page }) => {
    const observeCard = page.locator('a[href="/observe"]').or(page.locator('text=Observe')).first();
    await observeCard.click();

    // Should navigate to observe or show login requirement
    const url = page.url();
    expect(url.includes('observe') || url.includes('login')).toBeTruthy();
  });
});

test.describe('Home Page - Featured MPAs List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('displays Featured MPAs section', async ({ page }) => {
    await expect(page.locator('text=Featured MPAs')).toBeVisible();
  });

  test('shows multiple MPAs in the list', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Count MPA list items
    const mpaItems = page.locator('a[href*="/mpa/"]');
    const count = await mpaItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('MPA list items show country information', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Look for country names in list items
    const countries = page.locator('text=/australia|spain|ecuador|indonesia|philippines/i');
    const count = await countries.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking MPA in list navigates to detail page', async ({ page }) => {
    await page.waitForTimeout(2000);

    const firstMpa = page.locator('a[href*="/mpa/"]').first();
    const href = await firstMpa.getAttribute('href');

    await firstMpa.click();
    await expect(page).toHaveURL(new RegExp(href || '/mpa/'));
  });

  test('View All button shows map with all MPAs', async ({ page }) => {
    const viewAllButton = page.locator('text=View All').first();

    if (await viewAllButton.count() > 0) {
      await viewAllButton.click();
      await page.waitForTimeout(1000);

      // Should show map or navigate
      const mapVisible = await page.locator('[class*="leaflet"], canvas').count() > 0;
      expect(mapVisible).toBeTruthy();
    }
  });
});

test.describe('Home Page - Map View', () => {
  test('Interactive Map shows Leaflet map', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click to show map
    await page.click('text=Interactive Map');
    await page.waitForTimeout(2000);

    // Check Leaflet is loaded
    const leafletMap = page.locator('.leaflet-container');
    await expect(leafletMap).toBeVisible();

    await expect(page).toHaveScreenshot('home-map-view.png');
  });

  test('Map shows MPA markers', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(3000);

    // Look for markers
    const markers = page.locator('.leaflet-marker-icon, .custom-marker');
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Back to Home button returns to main view', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(1000);

    // Click back button
    const backButton = page.locator('text=/back.*home/i');
    await backButton.click();

    // Should return to home view
    await expect(page.locator('h1')).toContainText('Ocean PULSE');
  });

  test('Map marker click shows popup', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(3000);

    // Click first marker
    const firstMarker = page.locator('.leaflet-marker-icon, .custom-marker').first();
    if (await firstMarker.count() > 0) {
      await firstMarker.click();
      await page.waitForTimeout(500);

      // Popup should appear
      const popup = page.locator('.leaflet-popup');
      await expect(popup).toBeVisible();
    }
  });
});

test.describe('Home Page - User Menu', () => {
  test('User menu is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for user menu or avatar in top right
    const userMenu = page.locator('[class*="user"], [class*="avatar"], [class*="menu"]').first();
    const menuExists = await userMenu.count() > 0;

    // If not logged in, might show login button instead
    const loginButton = page.locator('text=/sign in|log in/i');
    expect(menuExists || await loginButton.count() > 0).toBeTruthy();
  });
});

test.describe('Home Page - Responsive Design', () => {
  test('renders correctly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // All main elements should be visible
    await expect(page.locator('h1')).toContainText('Ocean PULSE');
    await expect(page.locator('text=Featured MPAs')).toBeVisible();

    await expect(page).toHaveScreenshot('home-mobile.png', { fullPage: true });
  });

  test('renders correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('home-tablet.png', { fullPage: true });
  });

  test('renders correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('home-desktop.png', { fullPage: true });
  });
});
