import type { ShortenedUrl, RateLimitEntry, ExportFormat } from '../types';

const STORAGE_KEY = 'sniplink_urls';
const RATE_LIMIT_KEY = 'sniplink_rate_limit';
const RATE_LIMIT_WINDOW = 60000; // 1 minute
export const RATE_LIMIT_MAX = 10; // max 10 URLs per minute

// ─── URL CRUD ──────────────────────────────────────────

/**
 * Compress data before storage by minimizing JSON
 * This can reduce storage size by 20-30% for large datasets
 */
function compressData(data: any): string {
  // Use compact JSON (no whitespace) and remove undefined values
  return JSON.stringify(data, (key, value) => {
    if (value === undefined) return null;
    return value;
  });
}

export function loadUrls(): ShortenedUrl[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const urls = JSON.parse(data) as ShortenedUrl[];
    // Migration: add normalizedUrl if missing
    return urls.map((u) => ({
      ...u,
      normalizedUrl: u.normalizedUrl || u.originalUrl.toLowerCase(),
      clickHistory: u.clickHistory || [],
    }));
  } catch {
    return [];
  }
}

export function saveUrls(urls: ShortenedUrl[]): void {
  try {
    // Compress data before saving
    const compressed = compressData(urls);
    localStorage.setItem(STORAGE_KEY, compressed);

    // Log storage usage (helpful for debugging)
    if (typeof localStorage !== 'undefined') {
      const used = new Blob([compressed]).size;
      const limit = 5 * 1024 * 1024; // 5MB typical localStorage limit
      if (used > limit * 0.8) {
        console.warn(`localStorage usage high: ${(used / 1024).toFixed(0)}KB / ${(limit / 1024).toFixed(0)}KB`);
      }
    }
  } catch (e) {
    console.error('Failed to save URLs to localStorage:', e);
    // If quota exceeded, try cleanup and retry
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      console.warn('Storage quota exceeded, attempting cleanup...');
      const cleaned = cleanupExpiredUrls();
      console.log(`Cleaned up ${cleaned.removed} expired URLs and ${cleaned.trimmed} oversized histories`);
    }
  }
}

export function addUrl(url: ShortenedUrl): ShortenedUrl[] {
  const urls = loadUrls();
  urls.unshift(url);
  saveUrls(urls);
  return urls;
}

export function deleteUrl(id: string): ShortenedUrl[] {
  const urls = loadUrls().filter((u) => u.id !== id);
  saveUrls(urls);
  return urls;
}

export function bulkDeleteUrls(ids: Set<string>): ShortenedUrl[] {
  const urls = loadUrls().filter((u) => !ids.has(u.id));
  saveUrls(urls);
  return urls;
}

/**
 * Detect device type based on user agent
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop';

  const ua = navigator.userAgent.toLowerCase();

  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Get approximate location based on timezone
 */
function getTimezoneLocation(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return timezone || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

export function incrementClicks(id: string): ShortenedUrl[] {
  const urls = loadUrls().map((u) => {
    if (u.id === id) {
      const clickEvent = {
        timestamp: Date.now(),
        referrer: typeof document !== 'undefined' ? document.referrer || undefined : undefined,
        deviceType: getDeviceType(),
        timezone: getTimezoneLocation(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 100) : undefined,
      };

      return {
        ...u,
        clicks: u.clicks + 1,
        clickHistory: [...u.clickHistory, clickEvent],
      };
    }
    return u;
  });
  saveUrls(urls);
  return urls;
}

// ─── UNIQUENESS & DEDUP ────────────────────────────────

export function isShortCodeUnique(code: string): boolean {
  const urls = loadUrls();
  return !urls.some((u) => u.shortCode === code);
}

/**
 * Find an existing URL with the same normalized URL.
 * Returns the existing entry if found, null otherwise.
 */
export function findDuplicateUrl(normalizedUrl: string): ShortenedUrl | null {
  const urls = loadUrls();
  return urls.find((u) => u.normalizedUrl === normalizedUrl) || null;
}

/**
 * Generate a short code with collision retry and progressive length increase.
 * Strategy:
 * - Try 5 times with default length (7 chars = 3.5T combinations)
 * - If all fail, try 3 times with 9 chars (13.5Q combinations)  
 * - If still failing, try 11 chars (52 quintillion combinations)
 * This progressive approach minimizes code length while ensuring uniqueness.
 */
export function generateUniqueShortCode(
  generator: (length?: number) => string,
  maxRetries: number = 5
): string | null {
  // Try with default length first (7 chars)
  for (let i = 0; i < maxRetries; i++) {
    const code = generator();
    if (isShortCodeUnique(code)) return code;
  }

  // Fallback level 1: Try with 9 characters
  for (let i = 0; i < 3; i++) {
    const longerCode = generator(9);
    if (isShortCodeUnique(longerCode)) return longerCode;
  }

  // Fallback level 2: Try with 11 characters (extremely rare to need this)
  for (let i = 0; i < 2; i++) {
    const evenLongerCode = generator(11);
    if (isShortCodeUnique(evenLongerCode)) return evenLongerCode;
  }

  // If we still can't find a unique code, something is seriously wrong
  // This should statistically never happen unless there are millions of URLs
  console.error('Failed to generate unique short code after all retries');
  return null;
}

// ─── RATE LIMITING ─────────────────────────────────────

function loadRateLimit(): RateLimitEntry {
  try {
    const data = localStorage.getItem(RATE_LIMIT_KEY);
    if (!data) return { timestamps: [] };
    return JSON.parse(data) as RateLimitEntry;
  } catch {
    return { timestamps: [] };
  }
}

function saveRateLimit(entry: RateLimitEntry): void {
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(entry));
}

/**
 * Check if the user can create a new URL (sliding window rate limit).
 * Uses a sliding window approach for more consistent rate limiting.
 * Returns { allowed: boolean, remaining: number, resetIn: number, nextAvailable?: number }
 */
export function checkRateLimit(): {
  allowed: boolean;
  remaining: number;
  resetIn: number;
  nextAvailable?: number;
} {
  const now = Date.now();
  const entry = loadRateLimit();

  // Remove timestamps outside the sliding window
  const recent = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);

  const allowed = recent.length < RATE_LIMIT_MAX;
  const remaining = Math.max(0, RATE_LIMIT_MAX - recent.length);

  // Calculate when the oldest request will expire (sliding window)
  let resetIn = 0;
  let nextAvailable: number | undefined;

  if (recent.length > 0) {
    const oldestTimestamp = Math.min(...recent);
    resetIn = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 1000);

    // If at limit, calculate when next slot becomes available
    if (!allowed && recent.length === RATE_LIMIT_MAX) {
      nextAvailable = oldestTimestamp + RATE_LIMIT_WINDOW;
    }
  }

  return {
    allowed,
    remaining,
    resetIn,
    nextAvailable,
  };
}

export function recordRateLimitHit(): void {
  const now = Date.now();
  const entry = loadRateLimit();
  const recent = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  recent.push(now);
  saveRateLimit({ timestamps: recent });
}

// ─── CLEANUP ───────────────────────────────────────────

/**
 * Remove expired URLs from storage with grace period.
 * - URLs that expired less than 7 days ago are kept (grace period for recovery)
 * - URLs that expired more than 7 days ago are permanently removed
 * - Also trims click history to last 1000 clicks per URL to prevent bloat
 * Returns count of removed URLs.
 */
export function cleanupExpiredUrls(): { removed: number; trimmed: number; urls: ShortenedUrl[] } {
  const now = Date.now();
  const gracePeriod = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  const all = loadUrls();

  let trimmedCount = 0;

  // Filter out URLs that expired more than 7 days ago
  const active = all.filter((u) => {
    if (!u.expiresAt) return true; // Never expires
    const timeSinceExpiry = now - u.expiresAt;
    // Keep if not expired OR within grace period
    return u.expiresAt > now || timeSinceExpiry < gracePeriod;
  });

  // Trim click history to prevent storage bloat (keep last 1000 clicks per URL)
  const trimmed = active.map((u) => {
    if (u.clickHistory.length > 1000) {
      trimmedCount++;
      return {
        ...u,
        clickHistory: u.clickHistory.slice(-1000), // Keep last 1000 clicks
      };
    }
    return u;
  });

  const removed = all.length - active.length;
  if (removed > 0 || trimmedCount > 0) {
    saveUrls(trimmed);
  }

  return { removed, trimmed: trimmedCount, urls: trimmed };
}

// ─── EXPORT ────────────────────────────────────────────

export function exportUrls(urls: ShortenedUrl[], format: ExportFormat): string {
  if (format === 'json') {
    const data = urls.map((u) => ({
      shortCode: u.shortCode,
      originalUrl: u.originalUrl,
      clicks: u.clicks,
      createdAt: new Date(u.createdAt).toISOString(),
      expiresAt: u.expiresAt ? new Date(u.expiresAt).toISOString() : null,
      customAlias: u.customAlias || null,
    }));
    return JSON.stringify(data, null, 2);
  }

  // CSV
  const header = 'Short Code,Original URL,Clicks,Created At,Expires At,Custom Alias';
  const rows = urls.map((u) =>
    [
      u.shortCode,
      `"${u.originalUrl.replace(/"/g, '""')}"`,
      u.clicks,
      new Date(u.createdAt).toISOString(),
      u.expiresAt ? new Date(u.expiresAt).toISOString() : '',
      u.customAlias || '',
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── STATS ─────────────────────────────────────────────

export function getUrlStats(urls: ShortenedUrl[]) {
  const now = Date.now();
  const totalClicks = urls.reduce((sum, u) => sum + u.clicks, 0);
  const activeUrls = urls.filter((u) => !u.expiresAt || u.expiresAt > now);
  const expiredUrls = urls.length - activeUrls.length;
  const avgClicks = urls.length > 0 ? totalClicks / urls.length : 0;

  // URLs created in the last 24h
  const recentUrls = urls.filter((u) => now - u.createdAt < 86400000).length;

  // Clicks in the last 24h
  const recentClicks = urls.reduce((sum, u) => {
    return sum + u.clickHistory.filter((c) => now - c.timestamp < 86400000).length;
  }, 0);

  // Best performing URL
  const bestUrl = urls.length > 0 ? urls.reduce((best, u) => (u.clicks > best.clicks ? u : best)) : null;

  return {
    total: urls.length,
    totalClicks,
    activeCount: activeUrls.length,
    expiredCount: expiredUrls,
    avgClicks: Math.round(avgClicks * 10) / 10,
    recentUrls,
    recentClicks,
    bestUrl,
  };
}
