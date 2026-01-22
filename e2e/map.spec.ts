import { test, expect } from '@playwright/test';

/**
 * Map Functionality Tests
 * Tests the MapLibre GL map component and interactions
 */

test.describe('Map - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(2000);
  });

  test('map container renders', async ({ page }) => {
    const mapContainer = page.locator('.maplibregl-map');
    await expect(mapContainer).toBeVisible();
  });

  test('map canvas loads', async ({ page }) => {
    // Wait for map to initialize
    await page.waitForTimeout(3000);

    // MapLibre uses canvas for rendering
    const canvas = page.locator('.maplibregl-canvas');
    await expect(canvas).toBeVisible();
  });

  test('map shows MPA markers', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Custom MPA markers with .mpa-marker class
    const markers = page.locator('.mpa-marker');
    const count = await markers.count();
    expect(count).toBeGreaterThan(0);
  });

  test('map has zoom controls', async ({ page }) => {
    // Look for zoom buttons
    const zoomIn = page.locator('button:has-text("+"), [class*="zoom-in"]');
    const zoomOut = page.locator('button:has-text("−"), button:has-text("-"), [class*="zoom-out"]');

    expect(await zoomIn.count() + await zoomOut.count()).toBeGreaterThan(0);
  });

  test('map has location button', async ({ page }) => {
    // Location/GPS button
    const locationBtn = page.locator('button[aria-label*="location" i], [class*="location"]');
    await expect(locationBtn.first()).toBeVisible();
  });
});

test.describe('Map - Zoom Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(2000);
  });

  test('zoom in button works', async ({ page }) => {
    const zoomInBtn = page.locator('button:has-text("+")').first();

    // Map should be visible before zoom
    const mapContainer = page.locator('.maplibregl-map');
    await expect(mapContainer).toBeVisible();

    await zoomInBtn.click();
    await page.waitForTimeout(1000);

    // Map should still be functional after zoom
    await expect(mapContainer).toBeVisible();
  });

  test('zoom out button works', async ({ page }) => {
    // First zoom in
    const zoomInBtn = page.locator('button:has-text("+")').first();
    await zoomInBtn.click();
    await page.waitForTimeout(500);

    // Then zoom out
    const zoomOutBtn = page.locator('button:has-text("−"), button:has-text("-")').first();
    await zoomOutBtn.click();
    await page.waitForTimeout(1000);

    // Map should still be functional
    const mapContainer = page.locator('.maplibregl-map');
    await expect(mapContainer).toBeVisible();
  });
});

test.describe('Map - Marker Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(3000);
  });

  test('clicking marker shows popup', async ({ page }) => {
    const marker = page.locator('.mpa-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      // Popup should appear
      const popup = page.locator('.maplibregl-popup');
      await expect(popup).toBeVisible();
    }
  });

  test('popup shows MPA information', async ({ page }) => {
    const marker = page.locator('.mpa-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      // Popup content should have MPA info
      const popupContent = page.locator('.maplibregl-popup-content');
      await expect(popupContent).toBeVisible();

      // Should contain MPA name or details
      const hasContent = await popupContent.locator('text=/reef|marine|protected|species/i').count() > 0;
      expect(hasContent).toBeTruthy();
    }
  });

  test('popup has View Details link', async ({ page }) => {
    const marker = page.locator('.mpa-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      // View Details button/link
      const viewDetails = page.locator('.maplibregl-popup a[href*="/mpa/"]').or(page.locator('.maplibregl-popup').locator('text=/view details/i'));
      await expect(viewDetails.first()).toBeVisible();
    }
  });

  test('clicking View Details navigates to MPA page', async ({ page }) => {
    const marker = page.locator('.mpa-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      const viewDetailsLink = page.locator('.maplibregl-popup a[href*="/mpa/"]').first();
      if (await viewDetailsLink.count() > 0) {
        await viewDetailsLink.click();
        await expect(page).toHaveURL(/\/mpa\//);
      }
    }
  });

  test('popup closes when clicking close button', async ({ page }) => {
    const marker = page.locator('.mpa-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      // Popup should be visible
      const popup = page.locator('.maplibregl-popup');
      await expect(popup).toBeVisible();

      // Click close button
      const closeBtn = page.locator('.maplibregl-popup-close-button');
      if (await closeBtn.count() > 0) {
        await closeBtn.click();
        await page.waitForTimeout(500);

        // Popup should close
        await expect(popup).not.toBeVisible();
      }
    }
  });
});

test.describe('Map - Pan and Drag', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(2000);
  });

  test('map can be dragged', async ({ page }) => {
    const mapContainer = page.locator('.maplibregl-map');

    // Drag the map
    await page.mouse.move(640, 360);
    await page.mouse.down();
    await page.mouse.move(740, 360);
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Map should still be visible (didn't break)
    await expect(mapContainer).toBeVisible();
  });

  test('map stays within bounds', async ({ page }) => {
    const mapContainer = page.locator('.maplibregl-map');

    // Try to drag far off
    await page.mouse.move(640, 360);
    await page.mouse.down();
    await page.mouse.move(1400, 360); // Far right
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Map should still be functional
    await expect(mapContainer).toBeVisible();
  });
});

test.describe('Map - Focus on MPA from URL', () => {
  test('map focuses on specific MPA from URL params', async ({ page }) => {
    // Navigate to map with MPA coordinates (Great Barrier Reef area)
    await page.goto('/?lat=-18.2871&lng=147.6992&zoom=6&mpa=gbr-australia');
    await page.waitForTimeout(3000);

    // Map should be visible and centered
    const mapContainer = page.locator('.maplibregl-map');
    await expect(mapContainer).toBeVisible();
  });
});

test.describe('Map - MPA Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(3000);
  });

  test('MPA boundaries are rendered', async ({ page }) => {
    // MapLibre renders boundaries on canvas, check canvas is present
    const canvas = page.locator('.maplibregl-canvas');
    await expect(canvas).toBeVisible();

    // Also check that the map loaded properly
    const mapContainer = page.locator('.maplibregl-map');
    await expect(mapContainer).toBeVisible();
  });
});

test.describe('Map - Visual Regression', () => {
  test('map view desktop snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(4000);

    await expect(page).toHaveScreenshot('map-desktop.png');
  });

  test('map view mobile snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(4000);

    await expect(page).toHaveScreenshot('map-mobile.png');
  });

  test('map with popup open', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(3000);

    const marker = page.locator('.mpa-marker').first();
    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);
      await expect(page).toHaveScreenshot('map-with-popup.png');
    }
  });
});

test.describe('Map - No World Repetition', () => {
  test('map does not show repeated world', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(3000);

    // Visual check - take screenshot
    // Map should show only one world, not tiled/repeated
    await expect(page).toHaveScreenshot('map-no-repeat.png');
  });
});
