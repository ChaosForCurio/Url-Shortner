import { useState } from 'react';
import { Link2, Wand2, Clock, Sparkles, AlertCircle, Check, RotateCcw, Globe, ShieldCheck, Lock } from 'lucide-react';
import type { ShortenedUrl } from '../types';
import { useToast } from '../hooks/useToast';
import {
  generateShortCode,
  isValidUrl,
  isValidAlias,
  normalizeUrl,
  isSelfReferencing,
  ensureProtocol,
  extractDomain,
} from '../utils/urlShortener';
import {
  addUrl,
  isShortCodeUnique,
  findDuplicateUrl,
  generateUniqueShortCode,
  checkRateLimit,
  recordRateLimitHit,
  RATE_LIMIT_MAX,
} from '../utils/storage';
import { UrlResultCard } from './UrlResultCard';

interface ShortenFormProps {
  onUrlCreated: (urls: ShortenedUrl[]) => void;
  toast: ReturnType<typeof useToast>;
}

export function ShortenForm({ onUrlCreated, toast }: ShortenFormProps) {
  const [url, setUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [useCustomAlias, setUseCustomAlias] = useState(false);
  const [expiration, setExpiration] = useState('never');
  const [error, setError] = useState('');
  const [result, setResult] = useState<ShortenedUrl | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [duplicate, setDuplicate] = useState<ShortenedUrl | null>(null);
  const [urlPreview, setUrlPreview] = useState<{ domain: string; protocol: string } | null>(null);
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const getExpirationTime = (): number | null => {
    const now = Date.now();
    switch (expiration) {
      case '1h': return now + 3600000;
      case '24h': return now + 86400000;
      case '7d': return now + 604800000;
      case '30d': return now + 2592000000;
      default: return null;
    }
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError('');
    setDuplicate(null);

    // Live URL preview
    const withProtocol = ensureProtocol(value.trim());
    if (value.trim().length > 4 && isValidUrl(withProtocol)) {
      try {
        const parsed = new URL(withProtocol);
        setUrlPreview({
          domain: extractDomain(withProtocol),
          protocol: parsed.protocol.replace(':', '').toUpperCase(),
        });
      } catch {
        setUrlPreview(null);
      }
    } else {
      setUrlPreview(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDuplicate(null);

    // Rate limit check
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      const nextAvailableMsg = rateLimit.nextAvailable
        ? ` Next slot available in ${Math.ceil((rateLimit.nextAvailable - Date.now()) / 1000)}s`
        : '';
      setError(`Rate limit exceeded (${RATE_LIMIT_MAX} per minute). ${rateLimit.remaining} slots remaining.${nextAvailableMsg}`);
      toast.warning(`Rate limited — wait ${rateLimit.resetIn}s before creating more URLs`);
      return;
    }

    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
      setError('Please enter a URL');
      return;
    }

    const finalUrl = ensureProtocol(trimmedUrl);

    if (!isValidUrl(finalUrl)) {
      setError('Please enter a valid URL (e.g., https://example.com)');
      return;
    }

    // Self-reference check
    if (isSelfReferencing(finalUrl)) {
      setError('Cannot shorten a URL that points to this app — that would create a redirect loop!');
      return;
    }

    const normalized = normalizeUrl(finalUrl);

    // Duplicate detection
    const existingUrl = findDuplicateUrl(normalized);
    if (existingUrl && !duplicate) {
      setDuplicate(existingUrl);
      return; // Show duplicate warning, user can proceed by clicking again
    }

    // Custom alias validation
    let shortCode: string;
    if (useCustomAlias && customAlias.trim()) {
      const alias = customAlias.trim();
      if (!isValidAlias(alias)) {
        setError('Alias must be 3-30 characters (letters, numbers, - and _)');
        return;
      }
      if (!isShortCodeUnique(alias)) {
        setError('This alias is already taken. Please choose another.');
        return;
      }
      shortCode = alias;
    } else {
      // Generate with collision retry
      const generated = generateUniqueShortCode(generateShortCode);
      if (!generated) {
        setError('Failed to generate a unique short code. Please try again.');
        toast.error('Short code generation failed after multiple retries');
        return;
      }
      shortCode = generated;
    }

    setIsCreating(true);

    // Simulate slight processing delay for UX
    setTimeout(() => {
      const newUrl: ShortenedUrl = {
        id: crypto.randomUUID(),
        originalUrl: finalUrl,
        normalizedUrl: normalized,
        shortCode,
        customAlias: useCustomAlias ? customAlias.trim() : undefined,
        createdAt: Date.now(),
        expiresAt: getExpirationTime(),
        clicks: 0,
        clickHistory: [],
        password: usePassword && password.trim() ? password.trim() : undefined,
      };

      const updatedUrls = addUrl(newUrl);
      recordRateLimitHit();
      setResult(newUrl);
      setDuplicate(null);
      onUrlCreated(updatedUrls);
      setIsCreating(false);
      toast.success('URL shortened successfully!');
    }, 400);
  };

  const handleUseDuplicate = () => {
    if (duplicate) {
      setResult(duplicate);
      setDuplicate(null);
      toast.info('Showing your existing short URL for this link');
    }
  };

  const handleReset = () => {
    setUrl('');
    setCustomAlias('');
    setUseCustomAlias(false);
    setExpiration('never');
    setError('');
    setResult(null);
    setDuplicate(null);
    setUrlPreview(null);
    setPassword('');
    setUsePassword(false);
  };

  if (result) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
            <Check size={32} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">URL Shortened Successfully!</h2>
          <p className="text-slate-500 mt-1">Your short link is ready to use</p>
        </div>
        <UrlResultCard url={result} />
        <div className="text-center mt-6">
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <RotateCcw size={16} />
            Shorten Another URL
          </button>
        </div>
      </div>
    );
  }

  // Rate limit display
  const rateLimit = checkRateLimit();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-xl shadow-indigo-200 mb-4">
          <Sparkles size={28} className="text-white" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Shorten Your URL</h2>
        <p className="text-slate-500 mt-2 max-w-md mx-auto">
          Transform long, unwieldy URLs into short, memorable links powered by Base62 encoding
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* URL Input */}
        <div className="space-y-2">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Link2 size={20} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="Paste your long URL here..."
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 text-base transition-all"
              autoFocus
            />
          </div>
          {/* URL Preview */}
          {urlPreview && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm animate-[slideIn_0.2s_ease-out]">
              <Globe size={14} />
              <span className="font-medium">{urlPreview.domain}</span>
              <span className="text-emerald-500 text-xs px-1.5 py-0.5 bg-emerald-100 rounded-md font-mono">
                {urlPreview.protocol}
              </span>
              <ShieldCheck size={14} className="text-emerald-500 ml-auto" />
              <span className="text-xs text-emerald-500">Valid URL</span>
            </div>
          )}
        </div>

        {/* Duplicate Warning */}
        {duplicate && (
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-2xl animate-[slideIn_0.2s_ease-out]">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-800">
                  This URL has already been shortened
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  Short code: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">{duplicate.shortCode}</code>
                  <span className="mx-1">•</span>
                  {duplicate.clicks} click{duplicate.clicks !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleUseDuplicate}
                    className="px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg text-xs font-medium hover:bg-amber-300 transition-colors"
                  >
                    Use Existing Link
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-200 transition-colors"
                  >
                    Create New Anyway
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Options Row */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Custom Alias */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setUseCustomAlias(!useCustomAlias)}
                className={`relative w-10 h-6 rounded-full transition-colors ${useCustomAlias ? 'bg-indigo-500' : 'bg-slate-300'
                  }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${useCustomAlias ? 'left-5' : 'left-1'
                    }`}
                />
              </button>
              <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <Wand2 size={14} />
                Custom Alias
              </label>
            </div>
            {useCustomAlias && (
              <div className="space-y-1">
                <div className="relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-sm text-slate-400">
                    #/s/
                  </span>
                  <input
                    type="text"
                    value={customAlias}
                    onChange={(e) => {
                      setCustomAlias(e.target.value);
                      setError('');
                    }}
                    placeholder="my-brand-link"
                    maxLength={30}
                    className="w-full pl-[50px] pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 text-sm transition-all"
                  />
                </div>
                <div className="flex items-center justify-between px-1">
                  <p className="text-[11px] text-slate-400">Letters, numbers, dashes, underscores</p>
                  <p className={`text-[11px] ${customAlias.length > 25 ? 'text-amber-500' : 'text-slate-400'}`}>
                    {customAlias.length}/30
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Expiration */}
          <div className="sm:w-48">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-2">
              <Clock size={14} />
              Expiration
            </label>
            <select
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 text-sm transition-all"
            >
              <option value="never">Never</option>
              <option value="1h">1 Hour</option>
              <option value="24h">24 Hours</option>
              <option value="7d">7 Days</option>
              <option value="30d">30 Days</option>
            </select>
          </div>
        </div>

        {/* Password Protection */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${usePassword ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                <Lock size={16} />
              </div>
              <label className="text-sm font-semibold text-slate-700">Password Protection</label>
            </div>
            <button
              type="button"
              onClick={() => setUsePassword(!usePassword)}
              className={`relative w-10 h-6 rounded-full transition-colors ${usePassword ? 'bg-indigo-500' : 'bg-slate-300'
                }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${usePassword ? 'left-5' : 'left-1'
                  }`}
              />
            </button>
          </div>
          <p className="text-[11px] text-slate-400 mb-3">Add an extra layer of security. Visitors must enter this password to be redirected.</p>

          {usePassword && (
            <div className="relative animate-[slideIn_0.2s_ease-out]">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a secure password..."
                className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 text-sm transition-all"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-[10px] font-bold uppercase tracking-wider"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-[slideIn_0.2s_ease-out]">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isCreating}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-semibold text-base hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isCreating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={20} />
              Shorten URL
            </>
          )}
        </button>

        {/* Rate limit indicator */}
        <div className="flex items-center justify-center gap-3 text-xs text-slate-400">
          <span>
            {rateLimit.remaining}/{10} requests remaining
          </span>
          <span>•</span>
          <span>Base62 · 7-char codes · 3.5T combinations</span>
        </div>
      </form>

      {/* How it works */}
      <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { step: '1', title: 'Paste URL', desc: 'Enter your long URL with validation & dedup detection' },
          { step: '2', title: 'Generate', desc: 'Crypto-random Base62 code with collision retry' },
          { step: '3', title: 'Share', desc: 'Copy, QR code, or share anywhere' },
        ].map((item) => (
          <div key={item.step} className="text-center p-4 bg-white rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold text-sm flex items-center justify-center mx-auto mb-2">
              {item.step}
            </div>
            <h4 className="font-semibold text-slate-800 text-sm">{item.title}</h4>
            <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
