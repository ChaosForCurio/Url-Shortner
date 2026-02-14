import { useState, useMemo } from 'react';
import {
  Copy, Check, Trash2, ExternalLink, QrCode, X, MousePointerClick,
  Search, Filter, CheckSquare, Square, Download, FileJson, FileText,
  AlertTriangle, Clock, Sparkles, RotateCcw,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ShortenedUrl, SortOption, ExportFormat } from '../types';
import { useToast } from '../hooks/useToast';
import {
  getFullShortUrl, formatUrl, getTimeAgo,
  isExpired, isExpiringSoon, getTimeRemaining, extractDomain,
} from '../utils/urlShortener';
import {
  deleteUrl, bulkDeleteUrls, incrementClicks,
  exportUrls, downloadFile, cleanupExpiredUrls,
} from '../utils/storage';

interface UrlListProps {
  urls: ShortenedUrl[];
  onUrlsChange: (urls: ShortenedUrl[]) => void;
  toast: ReturnType<typeof useToast>;
}

export function UrlList({ urls, onUrlsChange, toast }: UrlListProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleCopy = async (url: ShortenedUrl) => {
    const shortUrl = getFullShortUrl(url.shortCode);
    try {
      await navigator.clipboard.writeText(shortUrl);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = shortUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedId(url.id);
    toast.success('Short URL copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    const updated = deleteUrl(id);
    onUrlsChange(updated);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setShowDeleteConfirm(null);
    toast.success('URL deleted');
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    const updated = bulkDeleteUrls(selectedIds);
    onUrlsChange(updated);
    toast.success(`${selectedIds.size} URL${selectedIds.size > 1 ? 's' : ''} deleted`);
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  const handleCleanupExpired = () => {
    const result = cleanupExpiredUrls();
    onUrlsChange(result.urls);
    if (result.removed > 0) {
      toast.success(`Cleaned up ${result.removed} expired URL${result.removed > 1 ? 's' : ''}`);
    } else {
      toast.info('No expired URLs to clean up');
    }
  };

  const handleClick = (url: ShortenedUrl) => {
    if (isExpired(url.expiresAt)) {
      toast.warning('This URL has expired');
      return;
    }
    const updated = incrementClicks(url.id);
    onUrlsChange(updated);
    window.open(url.originalUrl, '_blank');
  };

  const handleExport = (format: ExportFormat) => {
    const dataUrls = filteredUrls.length > 0 ? filteredUrls : urls;
    const content = exportUrls(dataUrls, format);
    const ext = format === 'json' ? 'json' : 'csv';
    const mime = format === 'json' ? 'application/json' : 'text/csv';
    downloadFile(content, `sniplink-urls.${ext}`, mime);
    setShowExportMenu(false);
    toast.success(`Exported ${dataUrls.length} URLs as ${format.toUpperCase()}`);
  };

  const handleDownloadQR = (shortCode: string) => {
    const svg = document.querySelector(`#qr-${shortCode} svg`) as SVGElement;
    if (!svg) return;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `sniplink-${shortCode}.png`;
      a.click();
      toast.success('QR code downloaded');
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUrls.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredUrls.map((u) => u.id)));
    }
  };

  const filteredUrls = useMemo(() => {
    return urls
      .filter((u) => {
        const q = searchQuery.toLowerCase();
        return (
          u.originalUrl.toLowerCase().includes(q) ||
          u.shortCode.toLowerCase().includes(q) ||
          (u.customAlias?.toLowerCase().includes(q) ?? false) ||
          extractDomain(u.originalUrl).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') return a.createdAt - b.createdAt;
        if (sortBy === 'clicks') return b.clicks - a.clicks;
        if (sortBy === 'alpha') return a.shortCode.localeCompare(b.shortCode);
        return b.createdAt - a.createdAt;
      });
  }, [urls, searchQuery, sortBy]);

  const expiredCount = urls.filter((u) => isExpired(u.expiresAt)).length;

  if (urls.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <Sparkles size={32} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700">No URLs yet</h3>
        <p className="text-slate-400 mt-1">Shorten your first URL to see it here</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My URLs</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {urls.length} total
            {expiredCount > 0 && <span className="text-red-400"> · {expiredCount} expired</span>}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          {expiredCount > 0 && (
            <button
              onClick={handleCleanupExpired}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
              title="Remove all expired URLs"
            >
              <RotateCcw size={13} />
              Cleanup Expired
            </button>
          )}

          {/* Export */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Export</span>
            </button>
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 min-w-[140px]">
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FileJson size={14} className="text-amber-500" />
                    Export JSON
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <FileText size={14} className="text-emerald-500" />
                    Export CSV
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search URLs, codes, domains..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="pl-8 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 appearance-none"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="clicks">Most Clicks</option>
            <option value="alpha">Alphabetical</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {filteredUrls.length > 0 && (
        <div className="flex items-center gap-3 mb-4 px-2">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 transition-colors"
          >
            {selectedIds.size === filteredUrls.length && selectedIds.size > 0 ? (
              <CheckSquare size={16} className="text-indigo-600" />
            ) : (
              <Square size={16} />
            )}
            {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select all'}
          </button>

          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors"
            >
              <Trash2 size={13} />
              Delete Selected ({selectedIds.size})
            </button>
          )}
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl animate-[slideIn_0.2s_ease-out]">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">
                Delete {selectedIds.size} URL{selectedIds.size > 1 ? 's' : ''}?
              </p>
              <p className="text-xs text-red-600 mt-1">This action cannot be undone.</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                >
                  Yes, Delete All
                </button>
                <button
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-white text-slate-600 border border-slate-200 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* URL Cards */}
      <div className="space-y-3">
        {filteredUrls.map((url) => {
          const expired = isExpired(url.expiresAt);
          const expiringSoon = isExpiringSoon(url.expiresAt);
          const shortUrl = getFullShortUrl(url.shortCode);
          const isSelected = selectedIds.has(url.id);

          return (
            <div
              key={url.id}
              className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md ${
                expired
                  ? 'border-red-200 bg-red-50/30'
                  : expiringSoon
                  ? 'border-amber-200 bg-amber-50/20'
                  : isSelected
                  ? 'border-indigo-300 bg-indigo-50/30 ring-2 ring-indigo-100'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(url.id)}
                  className="shrink-0 self-start mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare size={18} className="text-indigo-600" />
                  ) : (
                    <Square size={18} />
                  )}
                </button>

                {/* URLs */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-base font-semibold text-indigo-600 truncate max-w-[280px] sm:max-w-none">
                      {shortUrl}
                    </p>
                    {expired && (
                      <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
                        Expired
                      </span>
                    )}
                    {expiringSoon && !expired && (
                      <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full flex items-center gap-1">
                        <Clock size={10} />
                        Expiring Soon
                      </span>
                    )}
                    {url.customAlias && (
                      <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 bg-purple-100 text-purple-600 rounded-full">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{formatUrl(url.originalUrl)}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 flex-wrap">
                    <span>{getTimeAgo(url.createdAt)}</span>
                    <span className="flex items-center gap-1">
                      <MousePointerClick size={12} />
                      {url.clicks} click{url.clicks !== 1 ? 's' : ''}
                    </span>
                    {url.expiresAt && !expired && (
                      <span className={`flex items-center gap-1 ${expiringSoon ? 'text-amber-500 font-medium' : ''}`}>
                        <Clock size={12} />
                        {getTimeRemaining(url.expiresAt)}
                      </span>
                    )}
                    <span className="text-slate-300">
                      {extractDomain(url.originalUrl)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(url)}
                    className={`p-2 rounded-lg transition-colors ${
                      copiedId === url.id
                        ? 'bg-green-100 text-green-600'
                        : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                    title="Copy short URL"
                  >
                    {copiedId === url.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={() => setQrId(qrId === url.id ? null : url.id)}
                    className={`p-2 rounded-lg transition-colors ${
                      qrId === url.id
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                    title="QR Code"
                  >
                    <QrCode size={16} />
                  </button>
                  <button
                    onClick={() => handleClick(url)}
                    className={`p-2 rounded-lg transition-colors ${
                      expired
                        ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        : 'bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                    title={expired ? 'URL expired' : 'Visit URL'}
                    disabled={expired}
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(showDeleteConfirm === url.id ? null : url.id)}
                    className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Delete Confirmation */}
              {showDeleteConfirm === url.id && (
                <div className="mt-3 pt-3 border-t border-red-100 flex items-center gap-3 animate-[slideIn_0.15s_ease-out]">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-600 flex-1">Delete this URL permanently?</p>
                  <button
                    onClick={() => handleDelete(url.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* QR Code */}
              {qrId === url.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-center relative animate-[slideIn_0.2s_ease-out]">
                  <button
                    onClick={() => setQrId(null)}
                    className="absolute top-2 right-0 p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                  <div className="text-center" id={`qr-${url.shortCode}`}>
                    <QRCodeSVG value={shortUrl} size={160} level="H" includeMargin />
                    <p className="text-[11px] text-slate-400 mt-2">Scan to visit</p>
                    <button
                      onClick={() => handleDownloadQR(url.shortCode)}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
                    >
                      <Download size={12} />
                      Download PNG
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredUrls.length === 0 && searchQuery && (
        <div className="text-center py-10">
          <Search size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No URLs match "{searchQuery}"</p>
          <p className="text-slate-400 text-sm mt-1">Try a different search term</p>
        </div>
      )}
    </div>
  );
}
