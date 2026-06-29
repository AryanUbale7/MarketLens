import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Globe, RefreshCw, Sparkles, Sun, Moon, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'articles' | 'ai-search' | 'admin-verification';
  setActiveTab: (tab: 'dashboard' | 'articles' | 'ai-search' | 'admin-verification') => void;
  selectedCategoryFilter: number | null;
  setSelectedCategoryFilter: (catId: number | null) => void;
  selectedSourceGroupFilter: 'regulations' | null;
  setSelectedSourceGroupFilter: (filter: 'regulations' | null) => void;
  onSync: () => void;
  isSyncing: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  selectedCategoryFilter,
  setSelectedCategoryFilter,
  selectedSourceGroupFilter,
  setSelectedSourceGroupFilter,
  onSync,
  isSyncing,
  theme,
  onToggleTheme,
}) => {
  const [time, setTime] = useState<string>('');
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);
  const [sourceHealthSummary, setSourceHealthSummary] = useState<{ online: number; total: number }>({ online: 0, total: 0 });

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleString('en-US', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Backend connection & Source Health
  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await api.checkBackendHealth();
      setBackendHealthy(healthy);

      if (healthy) {
        try {
          const healthData = await api.getSourceHealth();
          const sources = Object.values(healthData);
          const online = sources.filter((s) => s.status === 'online').length;
          setSourceHealthSummary({ online, total: sources.length });
        } catch (err) {
          console.error("Failed to fetch source health in header", err);
        }
      } else {
        setSourceHealthSummary({ online: 0, total: 0 });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (
    tab: 'dashboard' | 'articles' | 'ai-search' | 'admin-verification',
    categoryId: number | null = null,
    sourceGroup: 'regulations' | null = null
  ) => {
    setActiveTab(tab);
    setSelectedCategoryFilter(categoryId);
    setSelectedSourceGroupFilter(sourceGroup);
  };

  return (
    <header className="w-full bg-white z-30 sticky top-0 shadow-xs border-b border-slate-205">
      
      {/* 1. TOP SUB-HEADER BAR */}
      <div className="bg-slate-50 border-b border-slate-200 py-1.5 px-4 text-[10px] font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-1.5 font-bold">
          
          <div className="flex items-center space-x-2">
            <span>ENGLISH EDITION</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-650 font-extrabold uppercase">MARKETLENS INTELLIGENCE</span>
          </div>

          <div className="uppercase tracking-wider text-slate-700">
            {time}
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {(() => {
                const { online, total } = sourceHealthSummary;
                if (total === 0 || backendHealthy === false) {
                  return <span className="text-[#9A1C1F] uppercase font-bold">FEEDS: OFFLINE</span>;
                }
                if (online === total) {
                  return <span className="text-emerald-700 uppercase font-bold">FEEDS: ALL ONLINE ({online}/{total})</span>;
                }
                if (online <= total / 2) {
                  return <span className="text-[#9A1C1F] uppercase font-bold">FEEDS: {online}/{total} DEGRADED</span>;
                }
                return <span className="text-amber-700 uppercase font-bold">FEEDS: {online}/{total} ACTIVE</span>;
              })()}
            </div>

            <div className="flex items-center space-x-1">
              <span className="relative flex h-1.5 w-1.5">
                {backendHealthy && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                  backendHealthy === null ? 'bg-slate-300' : backendHealthy ? 'bg-emerald-600' : 'bg-[#9A1C1F]'
                }`}></span>
              </span>
              <span className="text-[9px] font-bold text-slate-600">
                {backendHealthy === null ? 'SYNC' : backendHealthy ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. THE MARKETLENS BRAND MASTHEAD */}
      <div className="py-5 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="cursor-pointer select-none animate-fade-in text-center md:text-left" onClick={() => handleNavClick('dashboard', null, null)}>
            <h1 className="font-serif-lens text-4xl md:text-5xl font-black tracking-tight text-slate-900 leading-none uppercase">
              MarketLens
            </h1>
            <div className="flex items-center justify-center md:justify-start gap-1.5 mt-1.5">
              <span className="text-[10px] uppercase font-bold tracking-widest bg-[#9a1c1f] text-white px-2.5 py-0.5 rounded-xs font-sans">
                Financial Intelligence for Modern Investors
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="flex items-center justify-center p-2.5 rounded-sm border border-slate-200 bg-white text-slate-550 hover:text-[#9A1C1F] hover:bg-slate-50 cursor-pointer shadow-xs transition-all duration-150 shrink-0"
              aria-label="Toggle Theme"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-550" />
              ) : (
                <Moon className="w-4 h-4 text-slate-650" />
              )}
            </button>

            {backendHealthy && (
              <button 
                onClick={onSync} 
                disabled={isSyncing}
                className="flex items-center gap-2 bg-[#9A1C1F] hover:bg-[#801719] disabled:bg-slate-400 text-white font-bold py-2.5 px-5 rounded-sm text-[11px] uppercase tracking-widest cursor-pointer shadow-sm select-none transition-all duration-150 border-none shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'SYNCING WIRE FEEDS...' : 'SYNC WIRE FEEDS'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. MAIN NAVIGATION MENU */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex flex-nowrap overflow-x-auto no-scrollbar md:flex-wrap md:justify-center border-b border-slate-200 w-full" aria-label="Tabs">
            
            {/* Market Intelligence Dashboard */}
            <button
              onClick={() => handleNavClick('dashboard', null, null)}
              className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition-all border-b-3 cursor-pointer shrink-0 ${
                activeTab === 'dashboard' && selectedCategoryFilter === null && selectedSourceGroupFilter === null
                  ? 'border-[#9A1C1F] text-[#9A1C1F]'
                  : 'border-transparent text-slate-600 hover:text-[#9A1C1F] hover:border-slate-300'
              }`}
            >
              Market Intelligence Dashboard
            </button>

            {/* Wealth Creation */}
            <button
              onClick={() => handleNavClick('dashboard', 1, null)}
              className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition-all border-b-3 cursor-pointer shrink-0 ${
                activeTab === 'dashboard' && selectedCategoryFilter === 1 && selectedSourceGroupFilter === null
                  ? 'border-[#9A1C1F] text-[#9A1C1F]'
                  : 'border-transparent text-slate-600 hover:text-[#9A1C1F] hover:border-slate-300'
              }`}
            >
              Wealth Creation
            </button>

            {/* Wealth Protection */}
            <button
              onClick={() => handleNavClick('dashboard', 2, null)}
              className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition-all border-b-3 cursor-pointer shrink-0 ${
                activeTab === 'dashboard' && selectedCategoryFilter === 2 && selectedSourceGroupFilter === null
                  ? 'border-[#9A1C1F] text-[#9A1C1F]'
                  : 'border-transparent text-slate-600 hover:text-[#9A1C1F] hover:border-slate-300'
              }`}
            >
              Wealth Protection
            </button>

            {/* Wealth Legacy */}
            <button
              onClick={() => handleNavClick('dashboard', 3, null)}
              className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition-all border-b-3 cursor-pointer shrink-0 ${
                activeTab === 'dashboard' && selectedCategoryFilter === 3 && selectedSourceGroupFilter === null
                  ? 'border-[#9A1C1F] text-[#9A1C1F]'
                  : 'border-transparent text-slate-600 hover:text-[#9A1C1F] hover:border-slate-300'
              }`}
            >
              Wealth Legacy
            </button>

            {/* Regulations */}
            <button
              onClick={() => handleNavClick('dashboard', null, 'regulations')}
              className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition-all border-b-3 cursor-pointer shrink-0 ${
                activeTab === 'dashboard' && selectedSourceGroupFilter === 'regulations'
                  ? 'border-[#9A1C1F] text-[#9A1C1F]'
                  : 'border-transparent text-slate-600 hover:text-[#9A1C1F] hover:border-slate-300'
              }`}
            >
              Regulations
            </button>

            {/* News Wires */}
            <button
              onClick={() => handleNavClick('articles', null, null)}
              className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition-all border-b-3 cursor-pointer shrink-0 ${
                activeTab === 'articles'
                  ? 'border-[#9A1C1F] text-[#9A1C1F]'
                  : 'border-transparent text-slate-600 hover:text-[#9A1C1F] hover:border-slate-300'
              }`}
            >
              News Wires
            </button>

            {/* Ask MarketLens (AI) */}
            <button
              onClick={() => handleNavClick('ai-search', null, null)}
              className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition-all border-b-3 cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'ai-search'
                  ? 'border-[#059669] text-[#059669]'
                  : 'border-transparent text-slate-650 hover:text-[#059669] hover:border-slate-350'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse shrink-0" />
              <span>Ask MarketLens (AI)</span>
            </button>

            {/* Verification Center */}
            <button
              onClick={() => handleNavClick('admin-verification', null, null)}
              className={`px-4 py-3 text-[11px] font-extrabold uppercase tracking-wider transition-all border-b-3 cursor-pointer shrink-0 flex items-center gap-1.5 ${
                activeTab === 'admin-verification'
                  ? 'border-[#0C1E36] text-[#0C1E36]'
                  : 'border-transparent text-slate-600 hover:text-[#0C1E36] hover:border-slate-300'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Verification Center</span>
            </button>

          </nav>
        </div>
      </div>

    </header>
  );
};
