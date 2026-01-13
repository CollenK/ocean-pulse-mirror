import { test as base, expect, Page } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'test@oceanpulse.test';
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestUser123!Ocean';

/**
 * Custom test fixture that provides an authenticated page
 * Usage: import { test } from './fixtures/auth.fixture';
 */
export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login page
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Click "Continue with Email" button to show email form
    const emailLoginButton = page.locator('button:has-text("Continue with Email"), button:has-text("Email")');
    if (await emailLoginButton.count() > 0) {
      await emailLoginButton.first().click();
      await page.waitForTimeout(500);
    }

    // Now fill in the email/password form
    const emailInput = page.locator('input[type="email"], input#email, input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input#password, input[name="password"]');

    // Wait for form to be visible
    await expect(emailInput.first()).toBeVisible({ timeout: 5000 });
    await expect(passwordInput.first()).toBeVisible({ timeout: 5000 });

    // Fill in credentials
    await emailInput.first().fill(TEST_USER_EMAIL);
    await passwordInput.first().fill(TEST_USER_PASSWORD);

    // Submit the form
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")');
    await submitButton.first().click();

    // Wait for authentication to complete (redirect to home or profile)
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
    await page.waitForLoadState('networkidle');

    // Verify we're logged in
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Check for error messages
      const errorMessage = await page.locator('.bg-red-50, [class*="error"]').textContent();
      console.error('Login failed:', errorMessage);
      throw new Error(`Login failed: ${errorMessage || 'Unknown error'}`);
    }

    // Provide the authenticated page to the test
    await use(page);
  },
});

export { expect };

/**
 * Helper function to check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  // Check for common auth indicators
  const profileLink = page.locator('a[href*="/profile"], [data-testid="profile"], text=/profile/i');
  const signOutButton = page.locator('button:has-text("Sign out"), button:has-text("Logout")');
  const userAvatar = page.locator('[class*="avatar"], img[alt*="user" i], img[alt*="profile" i]');

  return (
    (await profileLink.count() > 0) ||
    (await signOutButton.count() > 0) ||
    (await userAvatar.count() > 0)
  );
}

/**
 * Helper function to logout
 */
export async function logout(page: Page): Promise<void> {
  await page.goto('/profile');
  await page.waitForLoadState('networkidle');

  const signOutButton = page.locator('button:has-text("Sign out"), button:has-text("Logout")');
  if (await signOutButton.count() > 0) {
    await signOutButton.first().click();
    await page.waitForTimeout(1000);
  }
}
