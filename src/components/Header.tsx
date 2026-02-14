import { Link2, BarChart3, List, Cpu } from 'lucide-react';
import type { TabType } from '../types';

interface HeaderProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  totalUrls: number;
}

const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
  { id: 'shorten', label: 'Shorten', icon: <Link2 size={18} /> },
  { id: 'urls', label: 'My URLs', icon: <List size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={18} /> },
  { id: 'architecture', label: 'Architecture', icon: <Cpu size={18} /> },
];

export function Header({ activeTab, onTabChange, totalUrls }: HeaderProps) {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-200">
              <Link2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">SnipLink</h1>
              <p className="text-[11px] text-slate-400 -mt-0.5">URL Shortener Service</p>
            </div>
          </div>

          <nav className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'urls' && totalUrls > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-100 text-indigo-600 rounded-full">
                    {totalUrls}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile tabs */}
        <div className="sm:hidden flex items-center gap-1 pb-3 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
