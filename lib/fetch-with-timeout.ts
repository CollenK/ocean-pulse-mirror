/**
 * Fetch wrapper with AbortController timeout
 * Prevents external API calls from hanging indefinitely
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = 30_000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url.toString(), {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms: ${url.toString().substring(0, 100)}`, { cause: error });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
