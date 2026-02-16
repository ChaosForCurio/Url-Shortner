import { Server, Database, Globe, Users, Zap, Shield, ArrowRight, Layers, HardDrive, RefreshCw } from 'lucide-react';

export function Architecture() {
  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">System Design: URL Shortener</h2>

      </div>

      {/* High-Level Architecture */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-6">High-Level Architecture</h3>
        <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-2 justify-center">
          {[
            { icon: <Users size={28} />, label: 'Clients', desc: 'Web / Mobile / API', color: 'bg-blue-50 text-blue-600 border-blue-200' },
            { icon: <Globe size={28} />, label: 'Load Balancer', desc: 'Distribute traffic', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
            { icon: <Server size={28} />, label: 'API Servers', desc: 'Stateless, horizontally scaled', color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
            { icon: <Zap size={28} />, label: 'Cache (Redis)', desc: 'Hot URLs, low latency', color: 'bg-amber-50 text-amber-600 border-amber-200' },
            { icon: <Database size={28} />, label: 'Database', desc: 'URL mappings, metadata', color: 'bg-purple-50 text-purple-600 border-purple-200' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className={`border-2 rounded-2xl p-4 text-center min-w-[140px] ${item.color}`}>
                <div className="flex justify-center mb-2">{item.icon}</div>
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-[11px] opacity-70 mt-0.5">{item.desc}</p>
              </div>
              {idx < 4 && (
                <ArrowRight size={20} className="text-slate-300 shrink-0 hidden lg:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Key Components Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* URL Shortening Algorithm */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Zap size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">URL Shortening Algorithm</h4>
              <p className="text-xs text-slate-400">Base62 Encoding</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-600">
            <p>We use <strong>Base62 encoding</strong> (a-z, A-Z, 0-9) to generate short codes.</p>
            <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs">
              <p className="text-slate-400 mb-1">// Character set (62 chars)</p>
              <p className="text-indigo-600">a-z A-Z 0-9</p>
              <p className="text-slate-400 mt-2 mb-1">// 7-char code possibilities</p>
              <p className="text-emerald-600">62^7 = 3.5 trillion URLs</p>
            </div>
            <p className="text-xs text-slate-500">
              A 7-character Base62 string provides ~3.5 trillion unique combinations, sufficient for most use cases.
            </p>
          </div>
        </div>

        {/* Database Design */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Database size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Database Schema</h4>
              <p className="text-xs text-slate-400">NoSQL / SQL</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 font-mono text-xs space-y-1">
            <p className="text-purple-600 font-bold">URL_TABLE</p>
            <p className="text-slate-600">├── id: <span className="text-amber-600">UUID (PK)</span></p>
            <p className="text-slate-600">├── short_code: <span className="text-amber-600">VARCHAR(7) UNIQUE</span></p>
            <p className="text-slate-600">├── original_url: <span className="text-amber-600">TEXT</span></p>
            <p className="text-slate-600">├── created_at: <span className="text-amber-600">TIMESTAMP</span></p>
            <p className="text-slate-600">├── expires_at: <span className="text-amber-600">TIMESTAMP NULL</span></p>
            <p className="text-slate-600">├── click_count: <span className="text-amber-600">INTEGER</span></p>
            <p className="text-slate-600">└── user_id: <span className="text-amber-600">UUID (FK)</span></p>
          </div>
        </div>

        {/* Caching Strategy */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <RefreshCw size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Caching Strategy</h4>
              <p className="text-xs text-slate-400">Redis / Memcached</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <p><strong>Cache-aside pattern:</strong> Check cache first, then DB</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <p><strong>80/20 Rule:</strong> 20% of URLs generate 80% of traffic</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <p><strong>TTL:</strong> Cache entries expire based on popularity</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <p><strong>LRU eviction:</strong> Least recently used entries removed</p>
            </div>
          </div>
        </div>

        {/* Scalability */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-800">Scalability</h4>
              <p className="text-xs text-slate-400">Handling billions of URLs</p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <p><strong>Database Sharding:</strong> Partition by hash of short code</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <p><strong>Read replicas:</strong> Separate read/write for performance</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <p><strong>CDN:</strong> Edge caching for popular redirects</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
              <p><strong>Rate Limiting:</strong> Prevent abuse with token bucket</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Design */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <Server size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">REST API Design</h4>
            <p className="text-xs text-slate-400">Core endpoints</p>
          </div>
        </div>
        <div className="space-y-3">
          {[
            { method: 'POST', path: '/api/v1/shorten', desc: 'Create a short URL', color: 'bg-emerald-100 text-emerald-700' },
            { method: 'GET', path: '/{short_code}', desc: '301 redirect to original URL', color: 'bg-blue-100 text-blue-700' },
            { method: 'GET', path: '/api/v1/stats/{short_code}', desc: 'Get URL analytics', color: 'bg-blue-100 text-blue-700' },
            { method: 'DELETE', path: '/api/v1/url/{short_code}', desc: 'Delete a short URL', color: 'bg-red-100 text-red-700' },
          ].map((api, idx) => (
            <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              <span className={`px-2 py-1 rounded-md text-xs font-bold ${api.color}`}>{api.method}</span>
              <code className="text-sm font-mono text-slate-700 flex-1">{api.path}</code>
              <span className="text-xs text-slate-400 hidden sm:block">{api.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Estimation */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <HardDrive size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">Capacity Estimation</h4>
            <p className="text-xs text-slate-400">Back-of-the-envelope calculations</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="font-medium text-slate-700 mb-2">Traffic Estimates</p>
            <div className="space-y-1 text-slate-600 text-xs">
              <p>• Write: 100M new URLs/month</p>
              <p>• Read:Write ratio → 100:1</p>
              <p>• Reads: 10B redirects/month</p>
              <p>• ~3,800 reads/second</p>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="font-medium text-slate-700 mb-2">Storage Estimates</p>
            <div className="space-y-1 text-slate-600 text-xs">
              <p>• Avg URL size: ~500 bytes</p>
              <p>• 100M URLs/month × 500B = 50GB/month</p>
              <p>• 5-year storage: ~3TB</p>
              <p>• Cache: 20% of daily = ~35GB RAM</p>
            </div>
          </div>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800">Security Considerations</h4>
            <p className="text-xs text-slate-400">Protecting the service</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          {[
            { title: 'Rate Limiting', desc: 'Prevent abuse — token bucket or sliding window algorithms' },
            { title: 'URL Validation', desc: 'Block malicious URLs, phishing domains, and spam' },
            { title: 'HTTPS Only', desc: 'Encrypt all traffic between clients and servers' },
            { title: 'API Keys', desc: 'Authenticate users and track usage per account' },
            { title: 'Collision Handling', desc: 'Retry with new seed or append counter on hash collision' },
            { title: 'URL Expiration', desc: 'Auto-delete expired URLs via background cleanup job' },
          ].map((item, idx) => (
            <div key={idx} className="bg-slate-50 rounded-xl p-3">
              <p className="font-semibold text-slate-700 text-sm">{item.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
