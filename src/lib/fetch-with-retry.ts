import { delay } from './delay';

type FetchWithRetryOptions = RequestInit & {
  attempts?: number;
  retryDelayMs?: number;
  label?: string;
  rateLimitDelayMs?: number;
};

function getRetryDelay(
  response: Response | undefined,
  fallbackDelayMs: number,
  attempt: number,
  rateLimitDelayMs: number
) {
  const retryAfter = response?.headers.get('retry-after');

  if (retryAfter) {
    const retryAfterSeconds = Number.parseInt(retryAfter, 10);
    if (!Number.isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
      return retryAfterSeconds * 1000;
    }
  }

  if (response?.status === 429) {
    return rateLimitDelayMs;
  }

  return fallbackDelayMs * attempt;
}

export async function fetchWithRetry(input: string | URL, options: FetchWithRetryOptions = {}) {
  const {
    attempts = 4,
    retryDelayMs = 1500,
    rateLimitDelayMs = 60_000,
    label = typeof input === 'string' ? input : input.toString(),
    ...fetchOptions
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(input, fetchOptions);

      if (response.status === 429 || response.status >= 500) {
        const waitTime = getRetryDelay(response, retryDelayMs, attempt, rateLimitDelayMs);
        console.warn(
          `[fetch-with-retry] ${label} responded with ${response.status}. Retrying in ${waitTime}ms (${attempt}/${attempts}).`
        );

        if (attempt < attempts) {
          await delay(waitTime);
          continue;
        }
      }

      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(`${label} failed with status ${response.status}${message ? `: ${message}` : ''}`);
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt >= attempts) {
        break;
      }

      const waitTime = retryDelayMs * attempt;
      console.warn(
        `[fetch-with-retry] ${label} attempt ${attempt} failed. Retrying in ${waitTime}ms.`,
        error instanceof Error ? error.message : error
      );
      await delay(waitTime);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Request failed for ${label}`);
}
