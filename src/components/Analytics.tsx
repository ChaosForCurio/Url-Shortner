import { BarChart3, Link2, MousePointerClick, TrendingUp, Clock, Award, Zap, Activity } from 'lucide-react';
import type { ShortenedUrl } from '../types';
import { getFullShortUrl, formatDate, isExpired, extractDomain } from '../utils/urlShortener';
import { getUrlStats } from '../utils/storage';

interface AnalyticsProps {
  urls: ShortenedUrl[];
}

export function Analytics({ urls }: AnalyticsProps) {
  const stats = getUrlStats(urls);
  const topUrls = [...urls].sort((a, b) => b.clicks - a.clicks).slice(0, 5);

  // Click distribution over last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  });

  const clicksByDay = last7Days.map((dayStart) => {
    const dayEnd = dayStart + 86400000;
    const count = urls.reduce((sum, u) => {
      return sum + u.clickHistory.filter((c) => c.timestamp >= dayStart && c.timestamp < dayEnd).length;
    }, 0);
    return {
      day: new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' }),
      date: new Date(dayStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count,
    };
  });

  const maxClicksPerDay = Math.max(...clicksByDay.map((d) => d.count), 1);

  // Hourly distribution (for all time)
  const hourlyClicks = Array.from({ length: 24 }, (_, hour) => {
    const count = urls.reduce((sum, u) => {
      return sum + u.clickHistory.filter((c) => new Date(c.timestamp).getHours() === hour).length;
    }, 0);
    return { hour, count };
  });
  const maxHourlyClicks = Math.max(...hourlyClicks.map((h) => h.count), 1);

  // URLs created per day (last 7 days)
  const urlsCreatedByDay = last7Days.map((dayStart) => {
    const dayEnd = dayStart + 86400000;
    const count = urls.filter((u) => u.createdAt >= dayStart && u.createdAt < dayEnd).length;
    return {
      day: new Date(dayStart).toLocaleDateString('en-US', { weekday: 'short' }),
      count,
    };
  });
  const maxUrlsPerDay = Math.max(...urlsCreatedByDay.map((d) => d.count), 1);

  // Top domains
  const domainMap = new Map<string, number>();
  urls.forEach((u) => {
    const domain = extractDomain(u.originalUrl);
    domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
  });
  const topDomains = [...domainMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Click-through rate (clicks per URL per day since creation)
  const ctr = urls.length > 0
    ? urls.reduce((sum, u) => {
        const daysSinceCreation = Math.max(1, (Date.now() - u.createdAt) / 86400000);
        return sum + u.clicks / daysSinceCreation;
      }, 0) / urls.length
    : 0;

  if (urls.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <BarChart3 size={32} className="text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700">No analytics yet</h3>
        <p className="text-slate-400 mt-1">Start shortening URLs to see analytics</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Analytics Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">Real-time overview of your URL shortening activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: 'Total URLs',
            value: stats.total,
            sub: `${stats.recentUrls} today`,
            icon: <Link2 size={20} />,
            bgColor: 'bg-indigo-50',
            textColor: 'text-indigo-600',
          },
          {
            label: 'Total Clicks',
            value: stats.totalClicks,
            sub: `${stats.recentClicks} today`,
            icon: <MousePointerClick size={20} />,
            bgColor: 'bg-emerald-50',
            textColor: 'text-emerald-600',
          },
          {
            label: 'Avg Clicks/URL',
            value: stats.avgClicks,
            sub: `${ctr.toFixed(2)} clicks/day/url`,
            icon: <TrendingUp size={20} />,
            bgColor: 'bg-amber-50',
            textColor: 'text-amber-600',
          },
          {
            label: 'Active URLs',
            value: stats.activeCount,
            sub: `${stats.expiredCount} expired`,
            icon: <Activity size={20} />,
            bgColor: 'bg-purple-50',
            textColor: 'text-purple-600',
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5">
            <div className={`w-10 h-10 rounded-xl ${stat.bgColor} ${stat.textColor} flex items-center justify-center mb-3`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            <p className="text-[11px] text-slate-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Click Chart — Last 7 Days */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-1">Click Activity</h3>
        <p className="text-xs text-slate-400 mb-5">Last 7 days</p>
        <div className="flex items-end gap-2 sm:gap-4 h-44">
          {clicksByDay.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">{day.count}</span>
              <div className="w-full relative bg-slate-100 rounded-t-lg" style={{ height: '100%' }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg transition-all duration-700 ease-out"
                  style={{
                    height: `${(day.count / maxClicksPerDay) * 100}%`,
                    minHeight: day.count > 0 ? '8px' : '0',
                  }}
                />
              </div>
              <div className="text-center">
                <span className="text-[11px] font-medium text-slate-500">{day.day}</span>
                <br />
                <span className="text-[9px] text-slate-400">{day.date}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Hourly Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <Clock size={18} className="text-slate-400" />
            Hourly Distribution
          </h3>
          <p className="text-xs text-slate-400 mb-4">When your links get clicked</p>
          <div className="flex items-end gap-[2px] h-24">
            {hourlyClicks.map((h) => (
              <div
                key={h.hour}
                className="flex-1 rounded-t transition-all duration-500"
                style={{
                  height: `${Math.max((h.count / maxHourlyClicks) * 100, h.count > 0 ? 8 : 2)}%`,
                  backgroundColor: h.count > 0
                    ? `rgba(99, 102, 241, ${0.3 + (h.count / maxHourlyClicks) * 0.7})`
                    : '#f1f5f9',
                }}
                title={`${h.hour}:00 — ${h.count} clicks`}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>11pm</span>
          </div>
        </div>

        {/* URLs Created Trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" />
            URLs Created
          </h3>
          <p className="text-xs text-slate-400 mb-4">Last 7 days</p>
          <div className="flex items-end gap-2 sm:gap-4 h-24">
            {urlsCreatedByDay.map((day, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-medium text-slate-500">{day.count}</span>
                <div className="w-full relative bg-slate-100 rounded-t-lg" style={{ height: '100%' }}>
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600 to-purple-400 rounded-t-lg transition-all duration-700"
                    style={{
                      height: `${(day.count / maxUrlsPerDay) * 100}%`,
                      minHeight: day.count > 0 ? '6px' : '0',
                    }}
                  />
                </div>
                <span className="text-[10px] text-slate-400">{day.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top URLs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Award size={18} className="text-amber-500" />
            Top Performing URLs
          </h3>
          {topUrls.length === 0 ? (
            <p className="text-sm text-slate-400">No data yet</p>
          ) : (
            <div className="space-y-3">
              {topUrls.map((url, idx) => {
                const barWidth = topUrls[0].clicks > 0 ? (url.clicks / topUrls[0].clicks) * 100 : 0;
                return (
                  <div key={url.id}>
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0
                            ? 'bg-amber-100 text-amber-600'
                            : idx === 1
                            ? 'bg-slate-200 text-slate-600'
                            : idx === 2
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-indigo-600 truncate">
                          {getFullShortUrl(url.shortCode)}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{url.originalUrl}</p>
                      </div>
                      <span className="text-sm font-semibold text-slate-700 shrink-0">
                        {url.clicks}
                      </span>
                    </div>
                    <div className="ml-10 mt-1.5 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-700"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Status & Domains */}
        <div className="space-y-6">
          {/* URL Status */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">URL Status</h3>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex mb-3">
              {stats.activeCount > 0 && (
                <div
                  className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-full transition-all duration-500"
                  style={{ width: `${(stats.activeCount / stats.total) * 100}%` }}
                />
              )}
              {stats.expiredCount > 0 && (
                <div
                  className="bg-gradient-to-r from-red-400 to-red-500 h-full transition-all duration-500"
                  style={{ width: `${(stats.expiredCount / stats.total) * 100}%` }}
                />
              )}
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-sm text-slate-600">
                  Active ({stats.activeCount})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-sm text-slate-600">
                  Expired ({stats.expiredCount})
                </span>
              </div>
            </div>
          </div>

          {/* Top Domains */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Domains</h3>
            {topDomains.length === 0 ? (
              <p className="text-sm text-slate-400">No data yet</p>
            ) : (
              <div className="space-y-2">
                {topDomains.map(([domain, count]) => (
                  <div key={domain} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0">
                        {domain.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-700 truncate">{domain}</span>
                    </div>
                    <span className="text-xs font-medium text-slate-500 shrink-0 ml-2">
                      {count} URL{count > 1 ? 's' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Best URL Highlight */}
          {stats.bestUrl && stats.bestUrl.clicks > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Award size={18} className="text-amber-500" />
                <h4 className="text-sm font-semibold text-amber-800">Best Performer</h4>
              </div>
              <p className="text-lg font-bold text-amber-900">{stats.bestUrl.clicks} clicks</p>
              <p className="text-xs text-amber-600 truncate mt-1">{stats.bestUrl.originalUrl}</p>
              <p className="text-[11px] text-amber-500 mt-0.5">
                Created {formatDate(stats.bestUrl.createdAt)}
                {isExpired(stats.bestUrl.expiresAt) && ' · Expired'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
