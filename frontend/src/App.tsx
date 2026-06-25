import { useState, useEffect } from 'react';
import { api } from './api';
import type { Article, Category, Source } from './api';
import { Ticker } from './components/Ticker';
import { Header } from './components/Header';
import { BreakingNewsTicker } from './components/BreakingNewsTicker';
import { Dashboard } from './components/Dashboard';
import { ArticlesPage } from './components/ArticlesPage';
import { AISearchPage } from './components/AISearchPage';
import { AdminVerification } from './components/AdminVerification';
import { X, ExternalLink, Sparkles, Cpu, Calendar, Globe, RefreshCw } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'articles' | 'ai-search' | 'admin-verification'>('dashboard');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<number | null>(null);
  const [selectedSourceGroupFilter, setSelectedSourceGroupFilter] = useState<'regulations' | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const storedTheme = localStorage.getItem('theme');
    if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      return 'dark';
    }
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };
  
  // Cache categories and sources globally
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [analyzingModal, setAnalyzingModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      await api.fetchNews();
      await fetchMetadata();
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error(err);
      alert('News sync failed. Verify backend configurations.');
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [cats, srcs] = await Promise.all([
        api.getCategories(),
        api.getSources()
      ]);
      setCategories(cats);
      setSources(srcs);
    } catch (err) {
      console.error('Failed to load initial metadata:', err);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  // Dynamic SEO page title updates
  useEffect(() => {
    if (activeTab === 'dashboard') {
      if (selectedCategoryFilter === 1) {
        document.title = 'Wealth Creation Insights & News - MarketLens';
      } else if (selectedCategoryFilter === 2) {
        document.title = 'Wealth Protection Compliance Wires - MarketLens';
      } else if (selectedCategoryFilter === 3) {
        document.title = 'Wealth Legacy & Estate Planning - MarketLens';
      } else if (selectedSourceGroupFilter === 'regulations') {
        document.title = 'Financial Regulations Tracker (SEBI, RBI, IRDAI) - MarketLens';
      } else {
        document.title = 'MarketLens - Premium Financial Intelligence Dashboard';
      }
    } else if (activeTab === 'articles') {
      document.title = 'Real-Time Financial News Wires Database - MarketLens';
    }
  }, [activeTab, selectedCategoryFilter, selectedSourceGroupFilter]);

  const getCategoryName = (id: number) => {
    return categories.find(c => c.id === id)?.name || `Category ${id}`;
  };

  const getSourceName = (id: number) => {
    return sources.find(s => s.id === id)?.name || `Source ${id}`;
  };

  const handleAnalyzeInModal = async (id: number) => {
    try {
      setAnalyzingModal(true);
      await api.processSingleArticleWithAI(id);
      const updatedArticle = await api.getArticle(id);
      setSelectedArticle(updatedArticle);
    } catch (err) {
      console.error(err);
      alert('AI analysis failed. Verify backend configurations.');
    } finally {
      setAnalyzingModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/40 flex flex-col">
      {/* 1. SCROLLING TICKER */}
      <Ticker />

      {/* 2. HEADER NAVBAR */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        selectedCategoryFilter={selectedCategoryFilter}
        setSelectedCategoryFilter={setSelectedCategoryFilter}
        selectedSourceGroupFilter={selectedSourceGroupFilter}
        setSelectedSourceGroupFilter={setSelectedSourceGroupFilter}
        onSync={handleSync}
        isSyncing={isSyncing}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Breaking News Ticker */}
      <BreakingNewsTicker key={refreshKey} onSelectArticle={setSelectedArticle} />

      {/* 3. MAIN CONTENT CONTAINER */}
      <div className="flex-grow flex flex-col">
        {activeTab === 'dashboard' && (
          <Dashboard 
            key={refreshKey}
            onNavigateToArticles={() => setActiveTab('articles')}
            onSelectArticle={setSelectedArticle}
            selectedCategoryFilter={selectedCategoryFilter}
            selectedSourceGroupFilter={selectedSourceGroupFilter}
          />
        )}
        
        {activeTab === 'articles' && (
          <ArticlesPage 
            key={refreshKey}
            onSelectArticle={setSelectedArticle}
            categories={categories}
            sources={sources}
            selectedCategoryFilter={selectedCategoryFilter}
            setSelectedCategoryFilter={setSelectedCategoryFilter}
            selectedSourceGroupFilter={selectedSourceGroupFilter}
            setSelectedSourceGroupFilter={setSelectedSourceGroupFilter}
          />
        )}

        {activeTab === 'ai-search' && (
          <AISearchPage 
            key={refreshKey}
            onSelectArticle={setSelectedArticle}
            categories={categories}
            sources={sources}
          />
        )}

        {activeTab === 'admin-verification' && (
          <AdminVerification 
            onSelectArticle={setSelectedArticle}
          />
        )}
      </div>

      {/* 4. FOOTER */}
      <footer className="w-full bg-[#0C1E36] border-t border-slate-800 text-slate-400 font-sans text-xs py-10 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1: About */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2.5">
              <span className="font-black text-white tracking-widest text-sm">MARKETLENS</span>
              <span className="text-[9px] font-mono text-slate-400 bg-[#050D19] border border-slate-700 px-2 py-0.5 rounded-sm">R1.2.0</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Premium financial intelligence and real-time news wire compliance tracking for modern investors, advisors, and wealth managers.
            </p>
          </div>

          {/* Col 2: Categories */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Asset Classes & Sectors</h4>
            <ul className="space-y-1.5 text-xs text-slate-450">
              <li><span className="hover:text-white transition duration-100 cursor-pointer" onClick={() => { setSelectedCategoryFilter(1); setSelectedSourceGroupFilter(null); }}>Wealth Creation</span></li>
              <li><span className="hover:text-white transition duration-100 cursor-pointer" onClick={() => { setSelectedCategoryFilter(2); setSelectedSourceGroupFilter(null); }}>Wealth Protection</span></li>
              <li><span className="hover:text-white transition duration-100 cursor-pointer" onClick={() => { setSelectedCategoryFilter(3); setSelectedSourceGroupFilter(null); }}>Wealth Legacy</span></li>
            </ul>
          </div>

          {/* Col 3: Sources */}
          <div className="space-y-3">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider">Syndicating Channels</h4>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-[11px]">
              <span>Livemint</span>
              <span>Economic Times</span>
              <span>Business Standard</span>
              <span>Moneycontrol</span>
              <span>SEBI Wires</span>
              <span>RBI Press Releases</span>
            </div>
          </div>

          {/* Col 4: Telemetry */}
          <div className="space-y-3 font-mono text-[11px]">
            <h4 className="text-white font-bold text-xs uppercase tracking-wider font-sans">Ingestion & Telemetry</h4>
            <div className="space-y-1">
              <div>Freshness: <span className="text-emerald-400 font-bold">5-MIN REFRESH</span></div>
              <div>Connection: <span className="text-emerald-400 font-bold">ACTIVE SECURED</span></div>
              <div>Database: <span className="text-slate-300">POSTGRESQL</span></div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-mono text-slate-500">
          <span>&copy; {new Date().getFullYear()} MarketLens Systems. All institutional rights reserved.</span>
          <div className="flex space-x-3 text-slate-400">
            <a href="https://bloomberg.com" target="_blank" className="hover:text-white underline">Bloomberg</a>
            <span>&bull;</span>
            <a href="https://livemint.com" target="_blank" className="hover:text-white underline">Mint</a>
            <span>&bull;</span>
            <a href="https://economictimes.indiatimes.com" target="_blank" className="hover:text-white underline">Economic Times</a>
          </div>
        </div>
      </footer>

      {/* 5. ARTICLE DETAIL DOSSIER OVERLAY (Sleek Terminal Modal) */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white border border-slate-300 rounded w-full max-w-2xl overflow-hidden shadow-xl relative">
            
            {/* Modal Header */}
            <div className="bg-[#9A1C1F] p-4 text-white flex justify-between items-center border-b border-[#9A1C1F]/20">
              <span className="text-[11px] font-sans tracking-wide text-white font-extrabold uppercase flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>MARKETLENS INTELLIGENCE DOSSIER</span>
              </span>
              <button 
                onClick={() => setSelectedArticle(null)}
                className="text-white/80 hover:text-white transition duration-150 cursor-pointer font-bold text-xs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
              
              {/* Meta Tags */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase bg-[#9A1C1F] text-white px-2 py-0.5 rounded-xs">
                  {getSourceName(selectedArticle.source_id)}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-600 border border-slate-200 px-2 py-0.5 rounded-xs bg-slate-50">
                  {getCategoryName(selectedArticle.category_id)}
                </span>
                <span className="text-[10px] font-mono text-slate-500 flex items-center ml-auto font-bold">
                  <Calendar className="w-3.5 h-3.5 mr-1" />
                  {new Date(selectedArticle.created_at).toLocaleDateString(undefined, { 
                    weekday: 'short', 
                    month: 'short', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }).toUpperCase()}
                </span>
              </div>

              {/* Title */}
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug font-serif-lens border-b border-slate-200 pb-3">
                {selectedArticle.title}
              </h2>

              {/* AI Analysis Section (Print Editorial styled box) */}
              <div className="border border-[#E5E7EB] bg-[#FAF8F5] p-4 rounded relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5">
                  <Sparkles className="w-20 h-20 text-[#9A1C1F]" />
                </div>

                <div className="flex items-center space-x-1.5 mb-3 border-b border-slate-200 pb-2 text-[#9A1C1F]">
                  <Cpu className="w-4 h-4" />
                  <h3 className="font-serif-lens font-bold text-xs uppercase tracking-wider">
                    MarketLens Analysis
                  </h3>
                </div>

                {selectedArticle.summary ? (
                  <div className="space-y-3">
                    {/* Summary */}
                    <div>
                      <span className="text-[9px] font-mono font-extrabold uppercase text-[#9A1C1F] block mb-0.5">EXECUTIVE SUMMARY</span>
                      <p className="text-xs text-slate-800 leading-relaxed font-body-lens">
                        {selectedArticle.summary}
                      </p>
                    </div>

                    {/* Why it matters */}
                    {selectedArticle.why_it_matters && (
                      <div className="bg-[#FFFDF9] p-3 border border-[#E5E7EB] rounded-sm">
                        <span className="text-[9px] font-mono font-extrabold uppercase text-amber-850 block mb-0.5">INVESTMENT IMPLICATIONS</span>
                        <p className="text-xs text-slate-800 font-bold leading-relaxed font-body-lens">
                          {selectedArticle.why_it_matters}
                        </p>
                      </div>
                    )}

                    {/* Priority score */}
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200 font-mono">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">MARKETLENS PRIORITY WEIGHTING:</span>
                      <div className="flex-1 bg-slate-200 h-2 rounded-sm overflow-hidden">
                        <div 
                          className="bg-[#9A1C1F] h-full rounded-sm" 
                          style={{ width: `${selectedArticle.priority_score * 10}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-black text-[#9A1C1F]">
                        {selectedArticle.priority_score}/10
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-slate-600 font-sans mb-3">
                      No automated insights exist for this wire record yet.
                    </p>
                    <button
                      disabled={analyzingModal}
                      onClick={() => handleAnalyzeInModal(selectedArticle.id)}
                      className="bg-[#9A1C1F] hover:bg-[#801719] text-white font-bold text-xs mx-auto flex items-center gap-1.5 py-1.5 px-3 rounded shadow-sm select-none cursor-pointer"
                    >
                      {analyzingModal ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>ANALYZING INDEX RECORD...</span>
                        </>
                      ) : (
                        <>
                          <Cpu className="w-3 h-3" />
                          <span>RUN AI ANALYSIS</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 bg-slate-50 p-3 flex justify-end gap-2 rounded-b">
              <button 
                onClick={() => setSelectedArticle(null)}
                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs py-1.5 px-3.5 rounded shadow-sm cursor-pointer"
              >
                CLOSE
              </button>
              
              <a 
                href={selectedArticle.url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#9A1C1F] hover:bg-[#801719] text-white font-bold text-xs flex items-center gap-1.5 py-1.5 px-3.5 rounded shadow-sm cursor-pointer"
              >
                <span>OPEN SOURCE</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default App;
