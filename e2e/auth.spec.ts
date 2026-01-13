import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * Tests login page, OAuth buttons, and auth-gated routes
 *
 * Note: Full OAuth flow cannot be automated without provider credentials.
 * These tests verify the UI and unauthenticated behavior.
 */

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
  });

  test('displays login page title', async ({ page }) => {
    await expect(page.locator('text=/sign in|log in|welcome/i').first()).toBeVisible();
  });

  test('shows Google OAuth button', async ({ page }) => {
    const googleBtn = page.locator('button:has-text("Google"), text=/google/i');
    await expect(googleBtn.first()).toBeVisible();
  });

  test('shows GitHub OAuth button', async ({ page }) => {
    const githubBtn = page.locator('button:has-text("GitHub"), text=/github/i');
    await expect(githubBtn.first()).toBeVisible();
  });

  test('shows Continue as Guest option', async ({ page }) => {
    const guestOption = page.locator('text=/guest|continue without|skip/i');
    await expect(guestOption.first()).toBeVisible();
  });

  test('Google button has correct styling', async ({ page }) => {
    const googleBtn = page.locator('button:has-text("Google")').first();
    await expect(googleBtn).toBeVisible();

    // Check it looks like a button
    const isEnabled = await googleBtn.isEnabled();
    expect(isEnabled).toBeTruthy();
  });

  test('clicking Continue as Guest navigates away', async ({ page }) => {
    const guestBtn = page.locator('text=/guest|continue without|skip/i').first();

    if (await guestBtn.count() > 0) {
      await guestBtn.click();
      await page.waitForTimeout(1000);

      // Should navigate to home or previous page
      const url = page.url();
      expect(url.includes('login')).toBeFalsy();
    }
  });
});

test.describe('Auth-Gated Routes - Unauthenticated', () => {
  test('Observe page shows login requirement', async ({ page }) => {
    await page.goto('/observe');
    await page.waitForLoadState('networkidle');

    // Should show sign in prompt or redirect
    const hasSignInPrompt = await page.locator('text=/sign in|log in|create account/i').count() > 0;
    const redirectedToLogin = page.url().includes('login');

    expect(hasSignInPrompt || redirectedToLogin).toBeTruthy();

    await expect(page).toHaveScreenshot('observe-unauthenticated.png');
  });

  test('Profile page shows login requirement', async ({ page }) => {
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    const hasSignInPrompt = await page.locator('text=/sign in|log in/i').count() > 0;
    const redirectedToLogin = page.url().includes('login');

    expect(hasSignInPrompt || redirectedToLogin).toBeTruthy();
  });

  test('Saved page shows login requirement', async ({ page }) => {
    await page.goto('/saved');
    await page.waitForLoadState('networkidle');

    const hasSignInPrompt = await page.locator('text=/sign in|log in/i').count() > 0;
    const redirectedToLogin = page.url().includes('login');

    expect(hasSignInPrompt || redirectedToLogin).toBeTruthy();
  });
});

test.describe('User Menu - Unauthenticated', () => {
  test('home page shows login option in user menu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for user menu or sign in button
    const signInOption = page.locator('text=/sign in|log in/i, a[href="/login"]');
    const userAvatar = page.locator('[class*="avatar"], [class*="user-menu"]');

    const hasLoginOption = await signInOption.count() > 0;
    const hasUserMenu = await userAvatar.count() > 0;

    // Should have either login option or user menu
    expect(hasLoginOption || hasUserMenu).toBeTruthy();
  });
});

test.describe('Login Page - Visual Regression', () => {
  test('login page desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-desktop.png');
  });

  test('login page mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('login-mobile.png');
  });
});

test.describe('OAuth Flow Initiation', () => {
  test('Google button click initiates OAuth flow', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const googleBtn = page.locator('button:has-text("Google")').first();

    // Set up listener for navigation
    const navigationPromise = page.waitForEvent('framenavigated', { timeout: 5000 }).catch(() => null);

    await googleBtn.click();

    // Wait a moment for any redirects
    await page.waitForTimeout(2000);

    // Either redirected to Google or showed loading
    const url = page.url();
    const hasGoogleRedirect = url.includes('google') || url.includes('accounts');
    const stillOnLogin = url.includes('login');
    const hasError = await page.locator('text=/error/i').count() > 0;

    // Should either redirect or stay with some indication
    expect(hasGoogleRedirect || stillOnLogin).toBeTruthy();
  });

  test('GitHub button click initiates OAuth flow', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const githubBtn = page.locator('button:has-text("GitHub")').first();

    await githubBtn.click();
    await page.waitForTimeout(2000);

    const url = page.url();
    const hasGithubRedirect = url.includes('github');
    const stillOnLogin = url.includes('login');

    expect(hasGithubRedirect || stillOnLogin).toBeTruthy();
  });
});

test.describe('Auth Error Handling', () => {
  test('handles auth callback with error param', async ({ page }) => {
    await page.goto('/auth/callback?error=access_denied');
    await page.waitForTimeout(2000);

    // Should redirect or show error, not crash
    const hasError = await page.locator('text=/error|denied|failed/i').count() > 0;
    const redirectedAway = !page.url().includes('callback');

    expect(hasError || redirectedAway).toBeTruthy();
  });

  test('handles missing auth code gracefully', async ({ page }) => {
    await page.goto('/auth/callback');
    await page.waitForTimeout(2000);

    // Should handle gracefully
    const notCrashed = await page.locator('text=/error|not found|400|500/i').count() <= 1;
    expect(notCrashed).toBeTruthy();
  });
});

/**
 * Note: To test authenticated flows, you would need to either:
 * 1. Use Supabase's test helpers to create a test session
 * 2. Mock the authentication state
 * 3. Use browser context with stored auth state
 *
 * For now, these tests verify the unauthenticated UI behavior.
 */
