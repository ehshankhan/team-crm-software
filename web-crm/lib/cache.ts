/**
 * Client-side cache utility using localStorage
 * Implements stale-while-revalidate pattern for fast page loads
 */

const CACHE_PREFIX = 'indosense_cache_';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

export const cache = {
  /**
   * Get cached data if available and not expired
   */
  get: <T>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + key);
      if (!cached) return null;

      const item: CacheItem<T> = JSON.parse(cached);

      // Return cached data regardless of age (stale-while-revalidate)
      return item.data;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Check if cached data is stale (needs refresh)
   */
  isStale: (key: string): boolean => {
    try {
      const cached = localStorage.getItem(CACHE_PREFIX + key);
      if (!cached) return true;

      const item: CacheItem<any> = JSON.parse(cached);
      return Date.now() - item.timestamp > CACHE_DURATION;
    } catch (error) {
      return true;
    }
  },

  /**
   * Set cached data with current timestamp
   */
  set: <T>(key: string, data: T): void => {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  },

  /**
   * Clear specific cache key
   */
  clear: (key: string): void => {
    try {
      localStorage.removeItem(CACHE_PREFIX + key);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  },

  /**
   * Clear all cache
   */
  clearAll: (): void => {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('Cache clear all error:', error);
    }
  },
};
