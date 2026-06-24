import React, { useEffect, useState } from 'react';
import { api } from '../api';
import type { Article } from '../api';

interface BreakingNewsTickerProps {
  onSelectArticle: (article: Article) => void;
}

export const BreakingNewsTicker: React.FC<BreakingNewsTickerProps> = ({ onSelectArticle }) => {
  const [headlines, setHeadlines] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchLatestHeadlines = async () => {
    try {
      const data = await api.getArticles({
        limit: 10,
        skip: 0,
      });
      setHeadlines(data);
    } catch (err) {
      console.error('Failed to fetch breaking news headlines:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestHeadlines();
    // Poll every 5 minutes (300,000 ms)
    const interval = setInterval(fetchLatestHeadlines, 300000);
    return () => clearInterval(interval);
  }, []);

  const getSourceInitials = (id: number) => {
    const map: Record<number, string> = {
      1: 'MINT',
      2: 'ET',
      3: 'BS',
      4: 'MC',
      5: 'CM',
      6: 'VR',
      7: 'FF',
      8: 'SEBI',
      9: 'RBI',
      10: 'IRDAI',
      11: 'AMFI',
    };
    return map[id] || `SRC ${id}`;
  };

  if (loading) {
    return (
      <div className="w-full bg-[#0A2540] h-[40px] flex items-center px-4 font-mono text-[10px] text-slate-400 select-none border-b border-slate-800">
        <span className="animate-pulse">CONNECTING TO LIVE INTEL REGISTER...</span>
      </div>
    );
  }

  if (headlines.length === 0) {
    return (
      <div className="w-full bg-[#0A2540] h-[40px] flex items-center px-4 font-mono text-[11px] text-slate-350 select-none border-b border-slate-800">
        <span className="text-red-500 font-extrabold mr-2 flex items-center">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
          LIVE
        </span>
        Latest financial news will appear here.
      </div>
    );
  }

  // Duplicate items to ensure smooth infinite loop scroll
  const scrollItems = [...headlines, ...headlines, ...headlines, ...headlines];

  return (
    <div className="w-full bg-[#0A2540] h-[40px] flex items-center relative overflow-hidden select-none border-b border-slate-900 z-20">
      {/* 🔴 BREAKING Label */}
      <div className="bg-[#0A2540] flex items-center px-4 h-full shrink-0 border-r border-slate-800 select-none z-30 font-sans font-extrabold text-[10px] tracking-widest text-red-500 shadow-lg">
        <span className="inline-block w-2 h-2 rounded-full bg-red-600 mr-2 animate-ping shrink-0"></span>
        <span className="absolute inline-block w-2 h-2 rounded-full bg-red-600 mr-2 shrink-0"></span>
        <span className="ml-2">BREAKING</span>
      </div>

      {/* Auto-scrolling headlines area */}
      <div className="flex-grow overflow-hidden flex items-center h-full relative">
        <div className="animate-ticker flex items-center gap-12 whitespace-nowrap pl-4">
          {scrollItems.map((article, index) => (
            <span
              key={`${article.id}-${index}`}
              onClick={() => onSelectArticle(article)}
              className="inline-flex items-center text-slate-300 hover:text-emerald-400 transition-colors duration-150 cursor-pointer font-mono text-[11.5px] font-bold tracking-tight select-none py-1.5"
            >
              <span className="text-slate-300 bg-white/10 px-1 py-0.5 rounded-xs text-[9px] font-black mr-2 tracking-wide uppercase border border-white/5 select-none shrink-0 font-sans">
                {getSourceInitials(article.source_id)}
              </span>
              <span>{article.title}</span>
              <span className="mx-6 text-slate-600 font-sans">•</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
