import { useState } from 'react';
import { Copy, Check, ExternalLink, QrCode, X, Download, Globe, Clock, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ShortenedUrl } from '../types';
import { getFullShortUrl, formatUrl, formatDate, extractDomain, getTimeRemaining } from '../utils/urlShortener';

interface UrlResultCardProps {
  url: ShortenedUrl;
}

export function UrlResultCard({ url }: UrlResultCardProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const shortUrl = getFullShortUrl(url.shortCode);

  const handleCopy = async () => {
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector('#result-qr svg') as SVGElement;
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
      a.download = `sniplink-${url.shortCode}.png`;
      a.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="bg-white border-2 border-indigo-100 rounded-2xl p-6 shadow-lg shadow-indigo-50">
      {/* Short URL */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-indigo-50 rounded-xl px-4 py-3">
          <p className="text-xs text-indigo-400 font-medium mb-0.5">Short URL</p>
          <p className="text-lg font-bold text-indigo-600 break-all">{shortUrl}</p>
        </div>
        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium text-sm transition-all ${
            copied
              ? 'bg-green-500 text-white'
              : 'bg-indigo-600 text-white hover:bg-indigo-700'
          }`}
        >
          {copied ? <Check size={18} /> : <Copy size={18} />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Original URL */}
      <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4">
        <p className="text-xs text-slate-400 font-medium mb-0.5">Original URL</p>
        <p className="text-sm text-slate-600 break-all">{formatUrl(url.originalUrl, 120)}</p>
      </div>

      {/* Meta info */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1">
          <Globe size={12} className="text-slate-400" />
          {extractDomain(url.originalUrl)}
        </span>
        <span>Created: {formatDate(url.createdAt)}</span>
        {url.expiresAt && (
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-amber-500" />
            {getTimeRemaining(url.expiresAt)}
          </span>
        )}
        {url.customAlias && (
          <span className="text-purple-500 font-medium">Custom alias</span>
        )}
        <span className="flex items-center gap-1 text-emerald-500">
          <ShieldCheck size={12} />
          Secured
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setShowQR(!showQR)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            showQR
              ? 'bg-indigo-100 text-indigo-600'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <QrCode size={16} />
          QR Code
        </button>
        <a
          href={url.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <ExternalLink size={16} />
          Visit Original
        </a>
      </div>

      {/* QR Code */}
      {showQR && (
        <div className="mt-4 p-6 bg-white border border-slate-200 rounded-xl flex flex-col items-center relative animate-[slideIn_0.2s_ease-out]">
          <button
            onClick={() => setShowQR(false)}
            className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
          <div id="result-qr">
            <QRCodeSVG value={shortUrl} size={200} level="H" includeMargin />
          </div>
          <p className="text-xs text-slate-400 mt-3">Scan to visit {shortUrl}</p>
          <button
            onClick={handleDownloadQR}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors"
          >
            <Download size={14} />
            Download PNG
          </button>
        </div>
      )}
    </div>
  );
}
