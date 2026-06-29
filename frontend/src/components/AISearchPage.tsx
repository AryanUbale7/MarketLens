import React, { useState } from 'react';
import { api } from '../api';
import type { Article, Category, Source } from '../api';
import { Search, Sparkles, AlertCircle, Calendar, ArrowRight, CornerDownRight } from 'lucide-react';

interface AISearchPageProps {
  onSelectArticle: (article: Article) => void;
  categories: Category[];
  sources: Source[];
}

export const AISearchPage: React.FC<AISearchPageProps> = ({
  onSelectArticle,
  categories,
  sources,
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Article[]>([]);
  const [filters, setFilters] = useState<Record<string, any> | null>(null);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCategoryName = (id: number) => {
    return categories.find(c => c.id === id)?.name || `Category ${id}`;
  };

  const getSourceName = (id: number) => {
    return sources.find(s => s.id === id)?.name || `Source ${id}`;
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setQuery(searchQuery);
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const data = await api.aiSearch(searchQuery);
      setResults(data.articles);
      setFilters(data.filters);
    } catch (err) {
      console.error(err);
      setError('AI search request failed. Verify the backend and Groq configurations.');
    } finally {
      setLoading(false);
    }
  };

  const exampleQueries = [
    "SEBI circulars and regulations",
    "Show me RBI announcements",
    "Is there any mutual fund news from Cafemutual?",
    "Insurance updates from IRDAI",
    "Latest stock market and equity investment updates",
    "Wills and legacy planning guidelines"
  ];

  return (
    <div className="flex-grow max-w-4xl mx-auto px-4 sm:px-6 py-6 w-full bg-white animate-fade-in">
      
      {/* Page Header */}
      <div className="text-center mb-8">
        <span className="text-[10px] font-mono tracking-widest uppercase font-bold text-emerald-700 flex items-center justify-center gap-1.5 mb-2">
          <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
          NATURAL LANGUAGE AI COGNITIVE SEARCH
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-none uppercase font-serif-lens tracking-tight">
          Ask MarketLens
        </h1>
        <p className="text-xs text-slate-550 max-w-md mx-auto mt-2 leading-relaxed">
          Ask questions in plain English. Groq Llama 3 will translate your intent into optimal database filters instantly.
        </p>
      </div>

      {/* Main Search Input */}
      <form 
        onSubmit={(e) => { e.preventDefault(); handleSearch(query); }}
        className="mb-8"
      >
        <div className="relative border border-slate-300 rounded shadow-sm focus-within:border-emerald-600 focus-within:ring-1 focus-within:ring-emerald-600 overflow-hidden bg-[#FAFDFB]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. show me SEBI circulars about mutual funds..."
            className="w-full pl-10 pr-24 py-3 bg-transparent text-xs text-slate-805 placeholder-slate-400 focus:outline-none font-sans font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 top-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-bold py-1.5 px-4 rounded text-[10px] uppercase tracking-wider cursor-pointer select-none transition duration-150 border-none"
          >
            {loading ? 'Searching...' : 'Ask AI'}
          </button>
        </div>
      </form>

      {/* Suggestions / Prompt helpers */}
      {!searched && (
        <div className="border border-slate-205 bg-[#FAF8F5] p-5 rounded-sm">
          <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <CornerDownRight className="w-3.5 h-3.5 text-emerald-600" />
            Try asking one of these:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-medium">
            {exampleQueries.map((ex, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(ex)}
                className="text-left py-2 px-3 bg-white border border-slate-200 hover:border-emerald-500 rounded-sm hover:bg-emerald-50/20 text-slate-650 hover:text-emerald-750 transition duration-100 cursor-pointer flex items-center justify-between"
              >
                <span>"{ex}"</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search results loading / content */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">
            AI is analyzing query & filtering wires...
          </p>
        </div>
      )}

      {/* Filters parsed by LLM display banner */}
      {!loading && searched && filters && (
        <div className="border border-emerald-100 bg-[#E8F5E9]/20 p-3 rounded-sm mb-6 text-[10px] font-mono text-slate-600 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-extrabold text-emerald-750 uppercase flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            AI EXTRAPOLATION:
          </span>
          {filters.q && (
            <span>Keyword: <strong className="text-slate-805">"{filters.q}"</strong></span>
          )}
          {filters.category_id && (
            <span>Category: <strong className="text-slate-805">{getCategoryName(filters.category_id)}</strong></span>
          )}
          {filters.source_id && (
            <span>Source: <strong className="text-slate-805">{getSourceName(filters.source_id)}</strong></span>
          )}
          {filters.source_group && (
            <span>Filter Group: <strong className="text-slate-805">{filters.source_group.toUpperCase()}</strong></span>
          )}
          {!filters.q && !filters.category_id && !filters.source_id && !filters.source_group && (
            <span className="text-slate-400">Broad Search (All Records)</span>
          )}
        </div>
      )}

      {/* Error alert banner */}
      {!loading && error && (
        <div className="border border-red-200 bg-red-50 p-4 rounded-sm mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#9A1C1F] shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-[#9A1C1F] uppercase mb-1">
              AI Query Failed
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-mono">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Query Results listing */}
      {!loading && searched && !error && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-805 uppercase tracking-wider border-b border-slate-200 pb-2">
            AI Search Results ({results.length})
          </h3>

          {results.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-250 rounded">
              <p className="text-xs text-slate-500 font-sans mb-1">
                No matching financial wire records found.
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                Try shortening your query or using simpler terms.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((article) => (
                <div 
                  key={article.id}
                  onClick={() => onSelectArticle(article)}
                  className="p-4 border border-slate-200 hover:border-slate-350 rounded-sm bg-white hover:bg-slate-50/30 transition duration-100 cursor-pointer flex flex-col gap-2 relative overflow-hidden"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                    <span className="font-bold text-[#9A1C1F] uppercase">
                      {getSourceName(article.source_id)}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 uppercase">
                      {getCategoryName(article.category_id)}
                    </span>
                    <span className="text-slate-400 flex items-center ml-auto font-bold">
                      <Calendar className="w-3.5 h-3.5 mr-1" />
                      {new Date(article.published_date || article.created_at).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric' 
                      }).toUpperCase()}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-bold text-slate-900 leading-snug font-serif-lens">
                    {article.title}
                  </h4>
                  
                  {article.summary && (
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
