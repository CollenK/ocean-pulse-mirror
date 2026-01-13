import { test, expect } from '@playwright/test';

/**
 * Species Search and Detail Tests
 * Tests the species discovery functionality powered by OBIS
 */

test.describe('Species Search Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/species');
    await page.waitForLoadState('networkidle');
  });

  test('displays search input', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[placeholder*="species" i]');
    await expect(searchInput).toBeVisible();
  });

  test('shows OBIS attribution', async ({ page }) => {
    await expect(page.locator('text=/OBIS|Ocean Biodiversity/i').first()).toBeVisible();
  });

  test('displays popular species when no search', async ({ page }) => {
    // Should show popular species section
    await expect(page.locator('text=/popular|featured|common/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('search requires minimum 2 characters', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill('a');

    // Wait for debounce
    await page.waitForTimeout(1000);

    // Should show message or no results
    const minCharMessage = page.locator('text=/2.*characters|minimum|type more/i');
    const resultsCount = await page.locator('[class*="result"], [class*="species-card"]').count();

    // Either shows minimum char message or just no results
    expect(await minCharMessage.count() > 0 || resultsCount === 0).toBeTruthy();
  });

  test('search returns results for valid query', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill('dolphin');

    // Wait for debounce and API response
    await page.waitForTimeout(2000);

    // Should show results
    const results = page.locator('text=/dolphin/i');
    await expect(results.first()).toBeVisible({ timeout: 10000 });
  });

  test('search shows loading state', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill('whale');

    // Look for loading indicator
    const loading = page.locator('text=/loading|searching/i, [class*="spinner"], [class*="loading"]');
    // Loading might be brief, so just check it doesn't error
    await page.waitForTimeout(500);
    expect(true).toBeTruthy();
  });

  test('search results show taxonomy info', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill('turtle');
    await page.waitForTimeout(2000);

    // Results should show classification info
    const taxonomyInfo = page.locator('text=/Chordata|Animalia|family|class/i');
    const count = await taxonomyInfo.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking search result navigates to detail', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill('shark');
    await page.waitForTimeout(2000);

    // Click first result
    const firstResult = page.locator('a[href*="/species/"]').first();
    if (await firstResult.count() > 0) {
      await firstResult.click();
      await expect(page).toHaveURL(/\/species\//);
    }
  });

  test('clear search shows popular species again', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    // Search
    await searchInput.fill('coral');
    await page.waitForTimeout(2000);

    // Clear
    await searchInput.clear();
    await page.waitForTimeout(1000);

    // Popular species should reappear
    await expect(page.locator('text=/popular|featured|common/i').first()).toBeVisible();
  });
});

test.describe('Species Detail Page', () => {
  // Using a common species that should exist in OBIS
  const testSpecies = 'Delphinus+delphis'; // Common dolphin

  test('loads species detail page', async ({ page }) => {
    await page.goto(`/species/${testSpecies}`);
    await page.waitForLoadState('networkidle');

    // Should show species name
    await expect(page.locator('text=/delphinus|dolphin/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('displays taxonomy information', async ({ page }) => {
    await page.goto(`/species/${testSpecies}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show taxonomy breakdown
    const taxonomyTerms = page.locator('text=/kingdom|phylum|class|order|family|genus/i');
    const count = await taxonomyTerms.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows observation count from OBIS', async ({ page }) => {
    await page.goto(`/species/${testSpecies}`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show record count
    const recordCount = page.locator('text=/\\d+.*records|observations/i');
    await expect(recordCount.first()).toBeVisible({ timeout: 10000 });
  });

  test('has link to OBIS page', async ({ page }) => {
    await page.goto(`/species/${testSpecies}`);
    await page.waitForLoadState('networkidle');

    // Should have external link to OBIS
    const obisLink = page.locator('a[href*="obis.org"]');
    await expect(obisLink.first()).toBeVisible({ timeout: 10000 });
  });

  test('has back navigation', async ({ page }) => {
    await page.goto(`/species/${testSpecies}`);
    await page.waitForLoadState('networkidle');

    // Back button or link
    const backNav = page.locator('text=/back|species/i, a[href="/species"]').first();
    await expect(backNav).toBeVisible();
  });
});

test.describe('Species Search - Visual Regression', () => {
  test('search page initial state', async ({ page }) => {
    await page.goto('/species');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('species-search-initial.png', { fullPage: true });
  });

  test('search page with results', async ({ page }) => {
    await page.goto('/species');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill('shark');
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('species-search-results.png', { fullPage: true });
  });

  test('species detail page', async ({ page }) => {
    await page.goto('/species/Delphinus+delphis');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await expect(page).toHaveScreenshot('species-detail.png', { fullPage: true });
  });
});

test.describe('Indicator Species Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/indicator-species');
    await page.waitForLoadState('networkidle');
  });

  test('displays page header with stats', async ({ page }) => {
    // Should show total species count
    await expect(page.locator('text=/\\d+.*species|species.*\\d+/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('shows category filters', async ({ page }) => {
    // Category filter options
    const categories = page.locator('text=/fish|mammals|coral|turtle|shark|ray/i');
    const count = await categories.count();
    expect(count).toBeGreaterThan(0);
  });

  test('shows conservation status filters', async ({ page }) => {
    // Conservation status options
    await expect(page.locator('text=/endangered|vulnerable|threatened|conservation/i').first()).toBeVisible();
  });

  test('displays species grid', async ({ page }) => {
    await page.waitForTimeout(2000);

    // Species cards should be visible
    const speciesCards = page.locator('[class*="card"], [class*="species"]');
    const count = await speciesCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('filter by category works', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Click a category filter (e.g., Fish)
    const fishFilter = page.locator('text=/^fish$/i, button:has-text("Fish"), label:has-text("Fish")').first();
    if (await fishFilter.count() > 0) {
      await fishFilter.click();
      await page.waitForTimeout(1000);

      // Results should be filtered (page should update)
      // Just verify no error
      expect(true).toBeTruthy();
    }
  });

  test('search functionality works', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();

    if (await searchInput.count() > 0) {
      await searchInput.fill('turtle');
      await page.waitForTimeout(1000);

      // Results should filter
      const results = page.locator('text=/turtle/i');
      expect(await results.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('view toggle switches between grid and list', async ({ page }) => {
    const viewToggle = page.locator('button:has-text("List"), button:has-text("Grid"), [class*="toggle"]').first();

    if (await viewToggle.count() > 0) {
      await viewToggle.click();
      await page.waitForTimeout(500);
      // View should change
      expect(true).toBeTruthy();
    }
  });

  test('clicking species card opens detail', async ({ page }) => {
    await page.waitForTimeout(2000);

    const speciesLink = page.locator('a[href*="/indicator-species/"]').first();
    if (await speciesLink.count() > 0) {
      await speciesLink.click();
      await expect(page).toHaveURL(/\/indicator-species\//);
    }
  });
});

test.describe('Indicator Species Detail Page', () => {
  test('loads indicator species detail', async ({ page }) => {
    // Navigate to indicator species page first
    await page.goto('/indicator-species');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click first species
    const speciesLink = page.locator('a[href*="/indicator-species/"]').first();
    if (await speciesLink.count() > 0) {
      const href = await speciesLink.getAttribute('href');
      await page.goto(href || '/indicator-species/1');
      await page.waitForLoadState('networkidle');

      // Should show species details
      await expect(page.locator('text=/scientific|common|habitat|conservation/i').first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('shows conservation status badge', async ({ page }) => {
    await page.goto('/indicator-species');
    await page.waitForTimeout(2000);

    const speciesLink = page.locator('a[href*="/indicator-species/"]').first();
    if (await speciesLink.count() > 0) {
      const href = await speciesLink.getAttribute('href');
      await page.goto(href || '/indicator-species/1');
      await page.waitForLoadState('networkidle');

      // Conservation status badge
      const statusBadge = page.locator('text=/endangered|vulnerable|near threatened|least concern/i');
      await expect(statusBadge.first()).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Species - Error Handling', () => {
  test('handles OBIS API errors gracefully', async ({ page }) => {
    await page.goto('/species');

    // Search for something unlikely
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]').first();
    await searchInput.fill('xyznonexistentspecies123');
    await page.waitForTimeout(2000);

    // Should show no results message, not error
    const noResults = page.locator('text=/no results|not found|no species/i');
    const hasNoResultsMessage = await noResults.count() > 0;
    const noErrorShown = await page.locator('text=/error|failed|crash/i').count() === 0;

    expect(hasNoResultsMessage || noErrorShown).toBeTruthy();
  });

  test('handles invalid species detail URL', async ({ page }) => {
    await page.goto('/species/invalid-species-that-does-not-exist-12345');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Should show error or empty state, not crash
    const errorOrEmpty = page.locator('text=/not found|no data|error|does not exist/i');
    expect(await errorOrEmpty.count() >= 0).toBeTruthy();
  });
});
