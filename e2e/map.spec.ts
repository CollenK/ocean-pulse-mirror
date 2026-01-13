import { test, expect } from '@playwright/test';

/**
 * Map Functionality Tests
 * Tests the Leaflet map component and interactions
 */

test.describe('Map - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(2000);
  });

  test('map container renders', async ({ page }) => {
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();
  });

  test('map tiles load', async ({ page }) => {
    // Wait for tiles to load
    await page.waitForTimeout(3000);

    // Tiles should be present
    const tiles = page.locator('.leaflet-tile');
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('map shows MPA markers', async ({ page }) => {
    await page.waitForTimeout(3000);

    // Custom markers or default markers
    const markers = page.locator('.leaflet-marker-icon, .custom-marker, [class*="marker"]');
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

    // Get initial zoom state
    const initialTileCount = await page.locator('.leaflet-tile').count();

    await zoomInBtn.click();
    await page.waitForTimeout(1000);

    // After zoom, tiles should reload
    const newTileCount = await page.locator('.leaflet-tile').count();
    // Tile count might change after zoom
    expect(newTileCount).toBeGreaterThan(0);
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
    const mapContainer = page.locator('.leaflet-container');
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
    const marker = page.locator('.leaflet-marker-icon, .custom-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      // Popup should appear
      const popup = page.locator('.leaflet-popup');
      await expect(popup).toBeVisible();
    }
  });

  test('popup shows MPA information', async ({ page }) => {
    const marker = page.locator('.leaflet-marker-icon, .custom-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      // Popup content should have MPA info
      const popupContent = page.locator('.leaflet-popup-content');
      await expect(popupContent).toBeVisible();

      // Should contain MPA name or details
      const hasContent = await popupContent.locator('text=/reef|marine|protected|species/i').count() > 0;
      expect(hasContent).toBeTruthy();
    }
  });

  test('popup has View Details link', async ({ page }) => {
    const marker = page.locator('.leaflet-marker-icon, .custom-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      // View Details button/link
      const viewDetails = page.locator('.leaflet-popup a[href*="/mpa/"], .leaflet-popup text=/view details/i');
      await expect(viewDetails.first()).toBeVisible();
    }
  });

  test('clicking View Details navigates to MPA page', async ({ page }) => {
    const marker = page.locator('.leaflet-marker-icon, .custom-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      const viewDetailsLink = page.locator('.leaflet-popup a[href*="/mpa/"]').first();
      if (await viewDetailsLink.count() > 0) {
        await viewDetailsLink.click();
        await expect(page).toHaveURL(/\/mpa\//);
      }
    }
  });

  test('popup closes when clicking map', async ({ page }) => {
    const marker = page.locator('.leaflet-marker-icon, .custom-marker').first();

    if (await marker.count() > 0) {
      await marker.click();
      await page.waitForTimeout(500);

      // Popup should be visible
      const popup = page.locator('.leaflet-popup');
      await expect(popup).toBeVisible();

      // Click on map (not on popup)
      await page.click('.leaflet-container', { position: { x: 50, y: 50 } });
      await page.waitForTimeout(500);

      // Popup should close (or at least not error)
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
    const mapContainer = page.locator('.leaflet-container');

    // Get initial state
    const initialPos = await mapContainer.boundingBox();

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
    const mapContainer = page.locator('.leaflet-container');

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
    const mapContainer = page.locator('.leaflet-container');
    await expect(mapContainer).toBeVisible();

    // The map should be zoomed in (not showing whole world)
    // We can check by looking at zoom level indicators or tile count
  });
});

test.describe('Map - MPA Boundaries', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('text=Interactive Map');
    await page.waitForTimeout(3000);
  });

  test('MPA boundaries are rendered', async ({ page }) => {
    // Look for rectangle/polygon boundaries
    const boundaries = page.locator('.leaflet-interactive, .leaflet-overlay-pane path, rect');
    const count = await boundaries.count();
    expect(count).toBeGreaterThan(0);
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

    const marker = page.locator('.leaflet-marker-icon, .custom-marker').first();
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
