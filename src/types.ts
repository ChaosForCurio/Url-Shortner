export interface ShortenedUrl {
  id: string;
  originalUrl: string;
  normalizedUrl: string;
  shortCode: string;
  customAlias?: string;
  createdAt: number;
  expiresAt: number | null;
  clicks: number;
  clickHistory: ClickEvent[];
}

export interface ClickEvent {
  timestamp: number;
  referrer?: string;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  timezone?: string;
  userAgent?: string;
}

export type TabType = 'shorten' | 'urls' | 'analytics' | 'architecture';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export type SortOption = 'newest' | 'oldest' | 'clicks' | 'alpha';

export type ExportFormat = 'json' | 'csv';

export interface RateLimitEntry {
  timestamps: number[];
}
