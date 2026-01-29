/**
 * Auth Redirect Utility
 *
 * Stores and retrieves the post-login redirect path using sessionStorage.
 * This is classified as "strictly necessary" under GDPR/ePrivacy since it
 * supports core authentication functionality, stores no personal data,
 * and is cleared automatically when the browser tab closes.
 */

const STORAGE_KEY = 'ocean_pulse_auth_redirect';

/**
 * Store the current path so the user can be redirected back after login.
 */
export function storeAuthRedirect(path: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    // sessionStorage unavailable (e.g. private browsing in some browsers)
  }
}

/**
 * Retrieve and clear the stored redirect path.
 * Returns null if no redirect is pending.
 */
export function consumeAuthRedirect(): string | null {
  try {
    const path = sessionStorage.getItem(STORAGE_KEY);
    if (path) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    return path;
  } catch {
    return null;
  }
}

/**
 * Clear any stored redirect without reading it.
 */
export function clearAuthRedirect(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
