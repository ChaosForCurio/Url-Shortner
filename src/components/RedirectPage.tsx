import { useState } from 'react';
import { Link2, AlertTriangle, Clock, ExternalLink, ArrowLeft, Loader2, ShieldAlert, Lock, ShieldCheck, Eye, EyeOff, Globe } from 'lucide-react';
import type { ShortenedUrl } from '../types';
import { formatUrl, extractDomain } from '../utils/urlShortener';

interface RedirectPageProps {
  type: 'redirecting' | 'not-found' | 'expired' | 'password-protected';
  url?: ShortenedUrl;
  shortCode?: string;
  onBackToHome: () => void;
  onPasswordVerified?: (url: ShortenedUrl) => void;
}

export function RedirectPage({ type, url, shortCode, onBackToHome, onPasswordVerified }: RedirectPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleVerifyPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!url) return;

    if (password === url.password) {
      onPasswordVerified?.(url);
    } else {
      setError('Incorrect password. Please try again.');
    }
  };

  if (type === 'redirecting' && url) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
              <Link2 size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">SnipLink</span>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-100">
            <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-6">
              <Loader2 size={36} className="text-indigo-600 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Redirecting you...</h1>
            <p className="text-slate-500 text-sm mb-6">You're being redirected to your destination</p>
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-400 font-medium mb-1">Destination</p>
              <p className="text-sm text-indigo-600 font-medium break-all">{formatUrl(url.originalUrl)}</p>
            </div>
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <ShieldAlert size={12} />
              <span>Verified safe redirect</span>
            </div>
          </div>

          <button onClick={onBackToHome} className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 mx-auto">
            <ArrowLeft size={14} />
            Cancel and go back
          </button>
        </div>
      </div>
    );
  }

  if (type === 'expired' && url) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/30 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
              <Link2 size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">SnipLink</span>
          </div>

          <div className="bg-white border-2 border-amber-200 rounded-3xl p-8 shadow-xl shadow-amber-50">
            <div className="w-20 h-20 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
              <Clock size={36} className="text-amber-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Link Expired</h1>
            <p className="text-slate-500 text-sm mb-6">This shortened URL has passed its expiration date and is no longer active.</p>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-left">
              <div className="flex items-start gap-2">
                <Clock size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Expired on {new Date(url.expiresAt!).toLocaleDateString('en-US', {
                      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">The creator set a time limit on this link.</p>
                </div>
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-slate-400 font-medium mb-1">Original destination</p>
              <p className="text-sm text-slate-600 break-all">{formatUrl(url.originalUrl)}</p>
            </div>
            <a href={url.originalUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl font-medium text-sm hover:bg-amber-600 transition-colors mb-3">
              <ExternalLink size={16} />
              Visit Original URL Anyway
            </a>
          </div>

          <button onClick={onBackToHome} className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 mx-auto">
            <ArrowLeft size={14} />
            Go to SnipLink Home
          </button>
        </div>
      </div>
    );
  }

  if (type === 'password-protected' && url) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="flex items-center justify-center gap-3 mb-10">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
              <Link2 size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900 tracking-tight">SnipLink</span>
          </div>

          <div className="bg-white border-2 border-indigo-100 rounded-3xl p-8 shadow-xl shadow-indigo-50">
            <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-6">
              <Lock size={36} className="text-indigo-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Password Protected</h1>
            <p className="text-slate-500 text-sm mb-6">This link is secured with a password. Please enter it to continue.</p>

            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div className="relative text-left">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="Enter link password..."
                  className={`w-full px-4 py-4 pr-12 bg-slate-50 border-2 rounded-2xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 transition-all ${error ? 'border-red-200 focus:border-red-500 focus:ring-red-50' : 'border-slate-100 focus:border-indigo-500 focus:ring-indigo-50'
                    }`}
                  autoFocus
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-medium px-2">
                  <AlertTriangle size={14} />
                  {error}
                </div>
              )}

              <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-base hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2">
                <ShieldCheck size={20} />
                Access Link
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="bg-slate-50 rounded-xl p-3 flex items-center gap-3 text-left">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                  <Globe size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Destination</p>
                  <p className="text-xs text-slate-600 truncate">{extractDomain(url.originalUrl)}</p>
                </div>
              </div>
            </div>
          </div>

          <button onClick={onBackToHome} className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 mx-auto">
            <ArrowLeft size={14} />
            Go back safely
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50/30 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
            <Link2 size={20} className="text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">SnipLink</span>
        </div>

        <div className="bg-white border-2 border-red-200 rounded-3xl p-8 shadow-xl shadow-red-50">
          <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={36} className="text-red-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">404</h1>
          <h2 className="text-xl font-bold text-slate-800 mb-3">Link Not Found</h2>
          <p className="text-slate-500 text-sm mb-6">The short URL you're trying to access doesn't exist or has been removed.</p>
          {shortCode && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-start gap-2">
                <ShieldAlert size={16} className="text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Code: <code className="bg-red-100 px-1.5 py-0.5 rounded text-xs font-mono">{shortCode}</code></p>
                  <p className="text-xs text-red-600 mt-1">This short code is not registered in our system.</p>
                </div>
              </div>
            </div>
          )}
          <button onClick={onBackToHome} className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-sm hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg shadow-indigo-200">
            <Link2 size={16} />
            Create a New Short URL
          </button>
        </div>

        <button onClick={onBackToHome} className="mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 mx-auto">
          <ArrowLeft size={14} />
          Go to SnipLink Home
        </button>
      </div>
    </div>
  );
}
