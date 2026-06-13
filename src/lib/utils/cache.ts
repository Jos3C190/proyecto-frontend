// Simple in-memory cache for Stale-While-Revalidate (SWR) patterns in Svelte 5 frontend.
const memoryCache: Record<string, { data: any; timestamp: number }> = {};

/**
 * Gets data from the cache if it exists and is not older than maxAgeMs.
 * Defaults to 2 minutes (120000ms).
 */
export function getFromCache<T>(key: string, maxAgeMs = 120000): T | null {
	const entry = memoryCache[key];
	if (!entry) return null;
	if (Date.now() - entry.timestamp > maxAgeMs) {
		delete memoryCache[key];
		return null;
	}
	return entry.data as T;
}

/**
 * Saves data into the in-memory cache with current timestamp.
 */
export function saveToCache(key: string, data: any): void {
	memoryCache[key] = { data, timestamp: Date.now() };
}

/**
 * Invalidates specific cache keys by prefix, or clears all cache if no prefix is given.
 */
export function invalidateCache(keyPrefix?: string): void {
	if (!keyPrefix) {
		for (const k in memoryCache) {
			delete memoryCache[k];
		}
	} else {
		for (const k in memoryCache) {
			if (k.startsWith(keyPrefix)) {
				delete memoryCache[k];
			}
		}
	}
}
