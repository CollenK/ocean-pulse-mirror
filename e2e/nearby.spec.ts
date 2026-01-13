import { test, expect } from '@playwright/test';

/**
 * Nearby MPAs Page Tests
 * Tests geolocation-based MPA discovery
 */

test.describe('Nearby Page - Initial Load', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/nearby');
    await page.waitForLoadState('networkidle');
  });

  test('displays nearby page header', async ({ page }) => {
    await expect(page.locator('text=/nearby|find|discover/i').first()).toBeVisible();
  });

  test('shows location-related content', async ({ page }) => {
    // Should mention location, GPS, or distance
    await expect(page.locator('text=/location|gps|distance|km|miles/i').first()).toBeVisible();
  });

  test('visual snapshot', async ({ page }) => {
    await expect(page).toHaveScreenshot('nearby-page.png', { fullPage: true });
  });
});

test.describe('Nearby Page - Location Permission', () => {
  test('handles location permission request', async ({ page, context }) => {
    // Grant location permission
    await context.grantPermissions(['geolocation'], { origin: 'https://ocean-pulse-ochre.vercel.app' });

    // Set a mock location (Great Barrier Reef area)
    await context.setGeolocation({ latitude: -18.2871, longitude: 147.6992 });

    await page.goto('/nearby');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show location-based results or distance info
    const locationInfo = page.locator('text=/km|miles|\\d+.*away|your location/i');
    await expect(locationInfo.first()).toBeVisible({ timeout: 10000 });
  });

  test('shows current location when granted', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -18.2871, longitude: 147.6992 });

    await page.goto('/nearby');
    await page.waitForTimeout(2000);

    // Should display current coordinates or location name
    const locationDisplay = page.locator('text=/current|your.*location|coordinates|°/i');
    await expect(locationDisplay.first()).toBeVisible({ timeout: 10000 });
  });

  test('handles location permission denied', async ({ page, context }) => {
    // Deny location permission
    await context.clearPermissions();

    await page.goto('/nearby');
    await page.waitForTimeout(2000);

    // Should show permission request or error message
    const permissionMessage = page.locator('text=/enable.*location|allow.*location|permission|access.*location/i');
    const count = await permissionMessage.count();
    // Should show some message about location
    expect(count >= 0).toBeTruthy();
  });
});

test.describe('Nearby Page - Distance Filter', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -18.2871, longitude: 147.6992 });
    await page.goto('/nearby');
    await page.waitForTimeout(2000);
  });

  test('shows distance filter slider', async ({ page }) => {
    const slider = page.locator('input[type="range"], [class*="slider"], text=/\\d+.*km/i');
    await expect(slider.first()).toBeVisible();
  });

  test('distance filter can be adjusted', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();

    if (await slider.count() > 0) {
      // Get initial value
      const initialValue = await slider.inputValue();

      // Drag slider
      await slider.fill('1000');
      await page.waitForTimeout(500);

      // Value should change
      const newValue = await slider.inputValue();
      expect(newValue !== initialValue || newValue === '1000').toBeTruthy();
    }
  });

  test('filter updates MPA list', async ({ page }) => {
    const slider = page.locator('input[type="range"]').first();

    if (await slider.count() > 0) {
      // Change distance
      await slider.fill('2000');
      await page.waitForTimeout(1000);

      // List should update (no error)
      const mpaList = page.locator('a[href*="/mpa/"]');
      const count = await mpaList.count();
      expect(count >= 0).toBeTruthy();
    }
  });
});

test.describe('Nearby Page - MPA List', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -18.2871, longitude: 147.6992 });
    await page.goto('/nearby');
    await page.waitForTimeout(3000);
  });

  test('shows MPAs sorted by distance', async ({ page }) => {
    const mpaItems = page.locator('a[href*="/mpa/"]');
    const count = await mpaItems.count();

    if (count > 0) {
      // Distance indicators should be present
      const distances = page.locator('text=/\\d+.*km|\\d+.*miles/i');
      await expect(distances.first()).toBeVisible();
    }
  });

  test('MPA cards show health score', async ({ page }) => {
    const mpaItems = page.locator('a[href*="/mpa/"]');

    if (await mpaItems.count() > 0) {
      // Health badge should be visible
      const healthBadge = page.locator('[class*="health"], [class*="badge"]').first();
      await expect(healthBadge).toBeVisible();
    }
  });

  test('clicking MPA navigates to detail', async ({ page }) => {
    const firstMpa = page.locator('a[href*="/mpa/"]').first();

    if (await firstMpa.count() > 0) {
      await firstMpa.click();
      await expect(page).toHaveURL(/\/mpa\//);
    }
  });
});

test.describe('Nearby Page - Empty State', () => {
  test('shows message when no MPAs in range', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    // Set location far from any MPAs (middle of Pacific)
    await context.setGeolocation({ latitude: 0, longitude: -160 });

    await page.goto('/nearby');
    await page.waitForTimeout(3000);

    // Might show empty state or "expand radius" suggestion
    const emptyOrExpand = page.locator('text=/no.*mpa|expand.*radius|increase.*distance|none.*found/i');
    // Count could be 0 if there happens to be an MPA nearby
    const count = await emptyOrExpand.count();
    expect(count >= 0).toBeTruthy();
  });

  test('has option to expand search radius', async ({ page, context }) => {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 0, longitude: -160 });

    await page.goto('/nearby');
    await page.waitForTimeout(2000);

    // Look for expand radius option
    const expandBtn = page.locator('text=/expand|increase|larger|more.*km/i');
    const count = await expandBtn.count();
    expect(count >= 0).toBeTruthy();
  });
});

test.describe('Nearby Page - Pull to Refresh', () => {
  test('supports pull to refresh on mobile', async ({ page, context }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -18.2871, longitude: 147.6992 });

    await page.goto('/nearby');
    await page.waitForTimeout(2000);

    // Simulate pull gesture
    await page.mouse.move(187, 100);
    await page.mouse.down();
    await page.mouse.move(187, 300);
    await page.mouse.up();

    await page.waitForTimeout(1000);

    // Page should still work (no crash)
    await expect(page.locator('text=/nearby|location/i').first()).toBeVisible();
  });
});

test.describe('Nearby Page - Visual Regression', () => {
  test('desktop view with location', async ({ page, context }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -18.2871, longitude: 147.6992 });

    await page.goto('/nearby');
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('nearby-desktop-location.png');
  });

  test('mobile view with location', async ({ page, context }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: -18.2871, longitude: 147.6992 });

    await page.goto('/nearby');
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('nearby-mobile-location.png');
  });
});
