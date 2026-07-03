export class FetchTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}

const DEFAULT_TIMEOUT_MS = 35_000

/**
 * fetch() with an upper bound on wait time. Restaurant WiFi can accept a
 * connection and then hang indefinitely with no real internet behind it —
 * without this, a request just spins forever with no way for the UI to
 * offer a retry.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    if (controller.signal.aborted) {
      throw new FetchTimeoutError()
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
