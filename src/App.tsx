import { useState, useEffect, useRef, useCallback } from 'react';
import type { TabType, ShortenedUrl } from './types';
import { loadUrls, incrementClicks, cleanupExpiredUrls } from './utils/storage';
import { isExpired } from './utils/urlShortener';
import { useToast } from './hooks/useToast';
import { Header } from './components/Header';
import { ShortenForm } from './components/ShortenForm';
import { UrlList } from './components/UrlList';
import { Analytics } from './components/Analytics';
import { Architecture } from './components/Architecture';
import { RedirectPage } from './components/RedirectPage';
import { ToastContainer } from './components/Toast';

type RedirectState =
  | { type: 'none' }
  | { type: 'redirecting'; url: ShortenedUrl; shortCode: string }
  | { type: 'not-found'; shortCode: string }
  | { type: 'expired'; url: ShortenedUrl; shortCode: string };

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('shorten');
  const [urls, setUrls] = useState<ShortenedUrl[]>([]);
  const [redirectState, setRedirectState] = useState<RedirectState>({ type: 'none' });
  const toast = useToast();
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse the hash route for short code
  const parseShortCode = useCallback((): string | null => {
    const hash = window.location.hash;
    const match = hash.match(/^#\/s\/(.+)$/);
    return match ? match[1] : null;
  }, []);

  // Handle short URL redirect logic
  const handleHashRoute = useCallback(() => {
    const shortCode = parseShortCode();
    if (!shortCode) {
      // Only reset if we were in a redirect state
      setRedirectState((prev) => (prev.type !== 'none' ? { type: 'none' } : prev));
      return;
    }

    const allUrls = loadUrls();
    const found = allUrls.find(
      (u) => u.shortCode === shortCode || u.customAlias === shortCode
    );

    if (!found) {
      setRedirectState({ type: 'not-found', shortCode });
      return;
    }

    if (isExpired(found.expiresAt)) {
      setRedirectState({ type: 'expired', url: found, shortCode });
      return;
    }

    // Record the click and show redirecting page
    const updated = incrementClicks(found.id);
    setUrls(updated);
    setRedirectState({ type: 'redirecting', url: found, shortCode });

    // Clear any existing timer
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);

    redirectTimerRef.current = setTimeout(() => {
      window.open(found.originalUrl, '_blank');
      window.location.hash = '';
      setRedirectState({ type: 'none' });
    }, 1500);
  }, [parseShortCode]);

  useEffect(() => {
    setUrls(loadUrls());
    handleHashRoute();

    // Auto-cleanup expired URLs on mount (runs in background)
    setTimeout(() => {
      const cleanup = cleanupExpiredUrls();
      if (cleanup.removed > 0 || cleanup.trimmed > 0) {
        console.log(`🧹 Auto-cleanup: Removed ${cleanup.removed} expired URLs, trimmed ${cleanup.trimmed} histories`);
        setUrls(cleanup.urls);
      }
    }, 1000);

    const onHashChange = () => handleHashRoute();
    window.addEventListener('hashchange', onHashChange);
    return () => {
      window.removeEventListener('hashchange', onHashChange);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [handleHashRoute]);

  const handleUrlsChange = useCallback((updatedUrls: ShortenedUrl[]) => {
    setUrls(updatedUrls);
  }, []);

  const handleBackToHome = useCallback(() => {
    if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    window.location.hash = '';
    setRedirectState({ type: 'none' });
  }, []);

  // Redirect page
  if (redirectState.type !== 'none') {
    return (
      <RedirectPage
        type={redirectState.type}
        url={redirectState.type !== 'not-found' ? redirectState.url : undefined}
        shortCode={redirectState.shortCode}
        onBackToHome={handleBackToHome}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      <Header activeTab={activeTab} onTabChange={setActiveTab} totalUrls={urls.length} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {activeTab === 'shorten' && (
          <ShortenForm onUrlCreated={handleUrlsChange} toast={toast} />
        )}
        {activeTab === 'urls' && (
          <UrlList urls={urls} onUrlsChange={handleUrlsChange} toast={toast} />
        )}
        {activeTab === 'analytics' && <Analytics urls={urls} />}
        {activeTab === 'architecture' && <Architecture />}
      </main>

      <footer className="border-t border-slate-200 bg-white/50 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-semibold text-slate-700">SnipLink</span>
            <span>•</span>
            <span>URL Shortener Service</span>
          </div>
          <div className="text-xs text-slate-400">
            System Design inspired by{' '}
            <a
              href="https://www.geeksforgeeks.org/system-design/system-design-url-shortening-service/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-500 hover:underline"
            >
              GeeksforGeeks
            </a>
          </div>
        </div>
      </footer>

      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
    </div>
  );
}
