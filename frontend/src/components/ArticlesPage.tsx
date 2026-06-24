import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Article, Category, Source } from '../api';
import { 
  Search, 
  Calendar,
  Cpu,
  RefreshCw,
  Info,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ArticlesPageProps {
  onSelectArticle: (article: Article) => void;
  categories: Category[];
  sources: Source[];
  selectedCategoryFilter: number | null;
  setSelectedCategoryFilter: (catId: number | null) => void;
  selectedSourceGroupFilter: 'regulations' | null;
  setSelectedSourceGroupFilter: (filter: 'regulations' | null) => void;
}

const ITEMS_PER_PAGE = 10;

const SOURCE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  'Mint': { bar: 'bg-cyan-500', text: 'text-cyan-800', bg: 'bg-cyan-50 border-cyan-200' },
  'Economic Times': { bar: 'bg-orange-500', text: 'text-[#9A1C1F]', bg: 'bg-[#FFF5F6] border-[#FAF0F1]' },
  'Business Standard': { bar: 'bg-blue-600', text: 'text-blue-800', bg: 'bg-blue-50 border-blue-200' },
  'Moneycontrol': { bar: 'bg-indigo-600', text: 'text-indigo-800', bg: 'bg-indigo-50 border-indigo-200' },
  'Cafemutual': { bar: 'bg-rose-500', text: 'text-rose-800', bg: 'bg-rose-50 border-rose-200' },
  'Value Research': { bar: 'bg-emerald-600', text: 'text-emerald-800', bg: 'bg-emerald-50 border-emerald-200' },
  'Freefincal': { bar: 'bg-violet-500', text: 'text-violet-850', bg: 'bg-violet-50 border-violet-200' },
  'SEBI': { bar: 'bg-blue-900', text: 'text-blue-900', bg: 'bg-blue-50 border-blue-300' },
  'RBI': { bar: 'bg-amber-700', text: 'text-amber-800', bg: 'bg-amber-50 border-amber-300' },
  'IRDAI': { bar: 'bg-orange-750', text: 'text-orange-900', bg: 'bg-orange-50 border-orange-300' },
  'AMFI': { bar: 'bg-slate-600', text: 'text-slate-805', bg: 'bg-slate-50 border-slate-300' },
};

export const ArticlesPage: React.FC<ArticlesPageProps> = ({ 
  onSelectArticle,
  categories,
  sources,
  selectedCategoryFilter,
  setSelectedCategoryFilter,
  selectedSourceGroupFilter,
  setSelectedSourceGroupFilter
}) => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Single article AI processing loading state (article_id -> loading_boolean)
  const [analyzingIds, setAnalyzingIds] = useState<Record<number, boolean>>({});

  const renderSourceBadge = (name: string) => {
    const initials = name === 'Economic Times' ? 'ET' : name === 'Business Standard' ? 'BS' : name === 'Value Research' ? 'VR' : name === 'Freefincal' ? 'FF' : name;
    const config = SOURCE_COLORS[name] || { bar: 'bg-slate-400', text: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' };
    
    return (
      <span className={`text-[8.5px] font-mono font-black border ${config.bg} ${config.text} px-1.5 py-0.5 rounded-sm shrink-0 select-none`}>
        {initials.toUpperCase()}
      </span>
    );
  };

  const fetchArticles = async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      
      const skip = (page - 1) * ITEMS_PER_PAGE;
      const data = await api.getArticles({
        q: searchQuery || undefined,
        category_id: selectedCategoryFilter || undefined,
        source_id: selectedSource || undefined,
        source_group: selectedSourceGroupFilter || undefined,
        skip,
        limit: ITEMS_PER_PAGE
      });

      setArticles(data);
    } catch (err) {
      console.error(err);
      setError('Unable to query the article database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles(currentPage);
  }, [currentPage, selectedCategoryFilter, selectedSource, selectedSourceGroupFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchArticles(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategoryFilter(null);
    setSelectedSource(null);
    setSelectedSourceGroupFilter(null);
    setCurrentPage(1);
  };

  const handleAnalyzeArticle = async (id: number) => {
    try {
      setAnalyzingIds(prev => ({ ...prev, [id]: true }));
      await api.processSingleArticleWithAI(id);
      await fetchArticles(currentPage);
    } catch (err) {
      console.error(err);
      alert('AI compilation failed. Check backend console.');
    } finally {
      setAnalyzingIds(prev => ({ ...prev, [id]: false }));
    }
  };

  const getCategoryName = (id: number) => {
    return categories.find(c => c.id === id)?.name || `Category ${id}`;
  };

  const getSourceName = (id: number) => {
    return sources.find(s => s.id === id)?.name || `Source ${id}`;
  };

  const formatPublishDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).toUpperCase();
  };

  return (
    <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full bg-white space-y-4">
      
      {/* HEADER SECTION */}
      <div className="border-b border-slate-200 pb-2">
        <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase font-serif-lens">
          Syndicated News Wires Index
        </h2>
        <p className="text-xs text-slate-500 font-mono">
          Query system records, filter feeds, and review AI compiled intelligence.
        </p>
      </div>

      {/* FILTER & SEARCH PANEL (ET style) */}
      <div className="bg-[#FAF8F5] border border-slate-200 rounded-sm p-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* Search Input */}
          <div className="lg:col-span-5 relative">
            <input 
              type="text" 
              placeholder="Search by keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-250 rounded-xs text-xs bg-white focus:outline-none focus:border-[#9A1C1F] font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>

          {/* Category Dropdown */}
          <div className="lg:col-span-3">
            <select
              value={selectedCategoryFilter || ''}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value ? Number(e.target.value) : null);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1.5 border border-slate-250 rounded-xs text-xs bg-white focus:outline-none focus:border-[#9A1C1F] font-sans font-bold text-slate-650 cursor-pointer"
            >
              <option value="">All Category Allocations</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Source Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={selectedSource || ''}
              onChange={(e) => {
                setSelectedSource(e.target.value ? Number(e.target.value) : null);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-1.5 border border-slate-250 rounded-xs text-xs bg-white focus:outline-none focus:border-[#9A1C1F] font-sans font-bold text-slate-650 cursor-pointer"
            >
              <option value="">All Sources</option>
              {sources.map((src) => (
                <option key={src.id} value={src.id}>{src.name}</option>
              ))}
            </select>
          </div>

          {/* Buttons */}
          <div className="lg:col-span-2 flex gap-2">
            <button
              type="submit"
              className="flex-grow bg-[#9A1C1F] hover:bg-[#801719] text-white font-bold py-1.5 px-3 rounded-xs text-xs shadow-sm cursor-pointer select-none"
            >
              SEARCH
            </button>
            {(searchQuery || selectedCategoryFilter || selectedSource) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="bg-white border border-slate-350 text-slate-700 hover:bg-slate-50 font-bold py-1.5 px-3 rounded-xs text-xs shadow-sm cursor-pointer select-none"
                title="Reset Filters"
              >
                RESET
              </button>
            )}
          </div>
        </form>
      </div>

      {/* ARTICLES CONTAINER */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-sm p-5 animate-pulse space-y-4">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-12 bg-slate-200 rounded"></div>
                <div className="h-3 w-16 bg-slate-100 rounded"></div>
              </div>
              <div className="h-6 w-3/4 bg-slate-200 rounded"></div>
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-slate-100 rounded"></div>
                <div className="h-3 w-5/6 bg-slate-100 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-4 border border-slate-200 bg-red-50 text-red-800 rounded-sm text-xs font-mono text-center">
          {error}
        </div>
      ) : articles.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-sm">
          <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 font-mono text-xs uppercase mb-3">No matching index records</p>
          <button
            onClick={handleClearFilters}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-1.5 px-3.5 rounded-sm text-xs shadow-sm cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {articles.map((article) => {
            const hasAI = !!article.summary;
            const isAnalyzing = !!analyzingIds[article.id];
            const sourceName = getSourceName(article.source_id);

            return (
              <div 
                key={article.id} 
                className={`bg-white border border-slate-200 rounded-sm p-4 hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between relative ${
                  hasAI ? 'border-l-3 border-l-[#9A1C1F]' : ''
                }`}
              >
                <div>
                  {/* Top line metadata */}
                  <div className="flex flex-wrap items-center gap-2 text-[9px] font-mono font-bold text-slate-400 mb-2 uppercase">
                    {renderSourceBadge(sourceName)}
                    <span className="text-slate-655">{sourceName}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-655 bg-slate-50 border border-slate-100 px-1 py-0.2 rounded-xs">{getCategoryName(article.category_id)}</span>
                    <span className="text-slate-300">|</span>
                    <span className="flex items-center text-slate-500 mono-num">
                      <Calendar className="w-3.5 h-3.5 mr-0.5" />
                      {formatPublishDate(article.published_date || article.created_at)}
                    </span>
                  </div>

                  {/* Headline */}
                  <h3 
                    onClick={() => onSelectArticle(article)}
                    className="font-serif-lens font-bold text-base md:text-lg text-slate-905 hover:text-[#9A1C1F] transition cursor-pointer mb-2.5 leading-snug"
                  >
                    {article.title}
                  </h3>

                  {/* AI insights panel */}
                  {hasAI && article.why_it_matters ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 bg-[#FAF8F5] p-3 border border-[#E5E7EB] rounded-xs font-sans">
                      <div>
                        <span className="text-[8px] font-mono font-black uppercase text-[#9A1C1F] block mb-0.5 tracking-wider">EXECUTIVE SUMMARY</span>
                        <p className="text-[11px] text-slate-750 leading-relaxed font-body-lens">
                          {article.summary}
                        </p>
                      </div>
                      <div className="border-t md:border-t-0 md:border-l border-slate-200 pt-2.5 md:pt-0 md:pl-3">
                        <span className="text-[8px] font-mono font-black uppercase text-amber-850 block mb-0.5 tracking-wider">INVESTMENT IMPLICATIONS</span>
                        <p className="text-[11px] text-slate-750 leading-relaxed font-bold font-body-lens">
                          {article.why_it_matters}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-400 font-mono mt-1 italic">
                      [ Raw wire feed. AI insights compilation available. ]
                    </p>
                  )}
                </div>

                {/* Action footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
                  <div>
                    {hasAI && (
                      <span className="bg-[#FFF5F6] text-[#9A1C1F] border border-[#FAF0F1] px-2 py-0.5 rounded-sm text-[9px] font-mono font-black flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI SCORE: <span className="mono-num">{article.priority_score}</span>/10
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-2 shrink-0">
                    {hasAI ? (
                      <button
                        onClick={() => onSelectArticle(article)}
                        className="bg-[#9A1C1F] hover:bg-[#801719] text-white font-bold text-[10px] py-1 px-3.5 rounded-xs shadow-xs cursor-pointer select-none"
                      >
                        VIEW DOSSIER
                      </button>
                    ) : (
                      <button
                        disabled={isAnalyzing}
                        onClick={() => handleAnalyzeArticle(article.id)}
                        className="bg-[#9A1C1F] hover:bg-[#801719] text-white font-bold text-[10px] py-1 px-3.5 rounded-xs shadow-xs cursor-pointer select-none flex items-center gap-1"
                      >
                        {isAnalyzing ? (
                          <>
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            <span>PROCESSING...</span>
                          </>
                        ) : (
                          <>
                            <Cpu className="w-2.5 h-2.5" />
                            <span>ANALYZE</span>
                          </>
                        )}
                      </button>
                    )}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-1 px-2.5 rounded-xs flex items-center justify-center shadow-xs cursor-pointer"
                      title="Open source article"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION PANEL */}
      {!loading && articles.length > 0 && (
        <div className="mt-6 border-t border-slate-200 pt-4 flex justify-between items-center text-xs font-mono">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-1 px-2.5 rounded-xs shadow-xs cursor-pointer flex items-center space-x-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>PREV</span>
          </button>
          
          <span className="font-extrabold text-slate-800">
            PAGE {currentPage}
          </span>

          <button
            disabled={articles.length < ITEMS_PER_PAGE}
            onClick={() => setCurrentPage(prev => prev + 1)}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold py-1 px-2.5 rounded-xs shadow-xs cursor-pointer flex items-center space-x-1"
          >
            <span>NEXT</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </main>
  );
};
