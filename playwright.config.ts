import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Ocean PULSE E2E testing
 * Set PLAYWRIGHT_BASE_URL to test against a specific environment,
 * otherwise defaults to http://localhost:3000 with auto-started dev server.
 */
export default defineConfig({
  testDir: './e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Take screenshot on failure */
    screenshot: 'only-on-failure',

    /* Record video on failure */
    video: 'on-first-retry',

    /* Viewport size for consistent visual tests */
    viewport: { width: 1280, height: 720 },
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    /* Mobile viewport for PWA testing */
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* Directory for storing visual regression snapshots */
  snapshotDir: './e2e/snapshots',

  /* Expect settings for visual comparisons */
  expect: {
    /* Maximum time expect() should wait for condition to be met */
    timeout: 10000,

    /* Threshold for visual comparison (0-1, lower = stricter) */
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.05,
      threshold: 0.2,
    },

    toMatchSnapshot: {
      maxDiffPixelRatio: 0.05,
    },
  },

  /* Global timeout for each test */
  timeout: 60000,

  /* Run local dev server before starting tests (only when not in CI) */
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
