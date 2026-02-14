const BASE62_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a cryptographically strong random short code using Base62.
 * Uses crypto.getRandomValues for better randomness than Math.random.
 * Adds timing-based entropy for better distribution.
 */
export function generateShortCode(length: number = 7): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  // Add timing entropy by using microsecond timestamp for first character
  const timingEntropy = (performance.now() * 1000) % 62;

  let result = '';
  for (let i = 0; i < length; i++) {
    let index;
    if (i === 0) {
      // Use timing entropy for first character to ensure better distribution
      index = Math.floor((array[i] + timingEntropy) % 62);
    } else {
      index = array[i] % 62;
    }
    result += BASE62_CHARS[index];
  }
  return result;
}

/**
 * Validate that a string is a proper HTTP(S) URL with enhanced security checks.
 */
export function isValidUrl(url: string): boolean {
  try {
    // Check URL length (prevent abuse)
    if (url.length > 2000) return false;

    const parsed = new URL(url);

    // Allow http, https, and ftp protocols
    const allowedProtocols = ['http:', 'https:', 'ftp:'];
    if (!allowedProtocols.includes(parsed.protocol)) return false;

    // Must have a valid hostname with at least one dot (or localhost for dev)
    if (!parsed.hostname.includes('.') && parsed.hostname !== 'localhost') return false;

    // Check for suspicious patterns (basic phishing detection)
    if (containsSuspiciousPatterns(url)) return false;

    // Validate hostname is not IP address with suspicious TLD
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipPattern.test(parsed.hostname)) {
      // Allow localhost IPs for development
      if (!parsed.hostname.startsWith('127.') && !parsed.hostname.startsWith('192.168.')) {
        return false;
      }
    }

    // Check for proper domain structure
    const domainParts = parsed.hostname.split('.');
    if (domainParts.some(part => part.length === 0 || part.length > 63)) return false;

    return true;
  } catch {
    return false;
  }
}

/**
 * Check for suspicious URL patterns (basic malicious URL detection)
 */
function containsSuspiciousPatterns(url: string): boolean {
  const suspiciousKeywords = [
    'phishing', 'malware', 'virus', 'hack', 'crack',
    'keygen', 'warez', 'torrent-illegal'
  ];

  const lowerUrl = url.toLowerCase();

  // Check for suspicious keywords in path
  if (suspiciousKeywords.some(keyword => lowerUrl.includes(keyword))) {
    return true;
  }

  // Check for excessive subdomains (common in phishing)
  try {
    const hostname = new URL(url).hostname;
    const subdomains = hostname.split('.');
    if (subdomains.length > 5) return true;
  } catch {
    return false;
  }

  // Check for homograph attacks (mixed scripts)
  const punycode = url.includes('xn--');
  if (punycode) {
    // Allow international domains but flag suspicious ones
    const suspiciousPunycode = /xn--[a-z0-9]{20,}/i.test(url);
    if (suspiciousPunycode) return true;
  }

  return false;
}

/**
 * Validate custom alias: 3-30 chars, alphanumeric + dash + underscore.
 */
export function isValidAlias(alias: string): boolean {
  return /^[a-zA-Z0-9_-]{3,30}$/.test(alias);
}

/**
 * Normalize a URL for deduplication:
 * - Lowercase protocol and hostname
 * - Remove default ports
 * - Remove trailing slash on path
 * - Sort query params
 * - Remove fragment
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Lowercase hostname
    parsed.hostname = parsed.hostname.toLowerCase();
    // Remove default ports
    if (
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443')
    ) {
      parsed.port = '';
    }
    // Remove fragment
    parsed.hash = '';
    // Sort query params for consistency
    const params = new URLSearchParams(parsed.searchParams);
    const sortedParams = new URLSearchParams([...params.entries()].sort());
    parsed.search = sortedParams.toString() ? `?${sortedParams.toString()}` : '';
    // Remove trailing slash (but keep root /)
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    parsed.pathname = path;
    return parsed.toString();
  } catch {
    return url.toLowerCase().trim();
  }
}

/**
 * Check if a URL is self-referencing (pointing to our own app).
 */
export function isSelfReferencing(url: string): boolean {
  try {
    const parsed = new URL(url);
    const current = new URL(getBaseUrl());
    return parsed.origin === current.origin;
  } catch {
    return false;
  }
}

/**
 * Add https:// prefix if no protocol is present.
 */
export function ensureProtocol(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (!/^https?:\/\//i.test(trimmed)) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

/**
 * Get the base URL of the current app.
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin + window.location.pathname.replace(/\/$/, '');
  }
  return 'https://sniplink.app';
}

/**
 * Build the full short URL with hash-based routing.
 */
export function getFullShortUrl(shortCode: string): string {
  return `${getBaseUrl()}#/s/${shortCode}`;
}

/**
 * Truncate a URL for display.
 */
export function formatUrl(url: string, maxLength: number = 60): string {
  if (url.length > maxLength) {
    return url.substring(0, maxLength - 3) + '...';
  }
  return url;
}

/**
 * Human-readable time-ago string.
 */
export function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

/**
 * Format a timestamp to a readable date string.
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Extract domain from a URL for display.
 */
export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Check if a URL will expire within the next hour.
 */
export function isExpiringSoon(expiresAt: number | null): boolean {
  if (!expiresAt) return false;
  const oneHour = 3600000;
  return expiresAt > Date.now() && expiresAt - Date.now() < oneHour;
}

/**
 * Check if a URL has expired.
 */
export function isExpired(expiresAt: number | null): boolean {
  if (!expiresAt) return false;
  return expiresAt < Date.now();
}

/**
 * Get the remaining time until expiration as a human-readable string.
 */
export function getTimeRemaining(expiresAt: number | null): string {
  if (!expiresAt) return 'Never';
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'Expired';
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m left`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d left`;
}
