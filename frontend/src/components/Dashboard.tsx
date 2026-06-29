import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import type { Article, Category, Source, DashboardStats, SourceHealthResponse } from '../api';
import { 
  ChevronRight,
  Search,
  Scale,
  Signal
} from 'lucide-react';

interface DashboardProps {
  onNavigateToArticles: () => void;
  onSelectArticle: (article: Article) => void;
  selectedCategoryFilter: number | null;
  selectedSourceGroupFilter: 'regulations' | null;
}

interface IndexHistory {
  name: string;
  symbol: string;
  prices: number[];
  dates: string[];
  currentPrice: number;
  changePercent: number;
  color: string;
}

const HISTORICAL_DATA: Record<string, IndexHistory> = {
  SPX: {
    name: 'S&P 500 Index',
    symbol: 'SPX',
    prices: [5390, 5410, 5405, 5435, 5420, 5450, 5445, 5473.17],
    dates: ['22 Jun', '23 Jun', '24 Jun', '25 Jun', '26 Jun', '27 Jun', '28 Jun', '29 Jun'],
    currentPrice: 5473.17,
    changePercent: 0.45,
    color: '#9A1C1F',
  },
  IXIC: {
    name: 'NASDAQ Composite',
    symbol: 'IXIC',
    prices: [17450, 17580, 17520, 17610, 17690, 17630, 17710, 17722.66],
    dates: ['22 Jun', '23 Jun', '24 Jun', '25 Jun', '26 Jun', '27 Jun', '28 Jun', '29 Jun'],
    currentPrice: 17722.66,
    changePercent: 0.67,
    color: '#9A1C1F',
  },
  BTC: {
    name: 'Bitcoin / USD',
    symbol: 'BTCUSD',
    prices: [63800, 63200, 62900, 62650, 62800, 62200, 62150, 61850.50],
    dates: ['22 Jun', '23 Jun', '24 Jun', '25 Jun', '26 Jun', '27 Jun', '28 Jun', '29 Jun'],
    currentPrice: 61850.50,
    changePercent: -1.31,
    color: '#B91C1C',
  },
  BRENT: {
    name: 'Brent Crude Oil',
    symbol: 'BRENT',
    prices: [83.40, 83.90, 84.10, 83.75, 84.30, 84.80, 84.95, 85.24],
    dates: ['22 Jun', '23 Jun', '24 Jun', '25 Jun', '26 Jun', '27 Jun', '28 Jun', '29 Jun'],
    currentPrice: 85.24,
    changePercent: 1.04,
    color: '#15803D',
  }
};

const getStatusDot = (status: string) => {
  switch (status) {
    case 'online': return 'bg-emerald-600';
    case 'blocked': return 'bg-red-650';
    case 'unavailable': return 'bg-amber-600';
    case 'no_rss_feed': return 'bg-slate-400';
    default: return 'bg-slate-350';
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'online': return 'ONLINE';
    case 'blocked': return 'BLOCKED';
    case 'unavailable': return 'UNAVAIL';
    case 'no_rss_feed': return 'NO FEED';
    default: return 'UNKNOWN';
  }
};

export const Dashboard: React.FC<DashboardProps> = ({ 
  onNavigateToArticles, 
  onSelectArticle,
  selectedCategoryFilter,
  selectedSourceGroupFilter
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allNews, setAllNews] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [sourceDist, setSourceDist] = useState<Record<string, number>>({});
  const [sourceHealth, setSourceHealth] = useState<SourceHealthResponse>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chart state
  const [selectedChartIndex, setSelectedChartIndex] = useState<string>('SPX');
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{ index: number; x: number; y: number } | null>(null);
  const chartSvgRef = useRef<SVGSVGElement | null>(null);

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
      }
      setError(null);
      
      const [statsData, newsData, catsData, srcsData, sourceDistData, healthData] = await Promise.all([
        api.getStats(),
        api.getArticles({ limit: 150 }),
        api.getCategories(),
        api.getSources(),
        api.getSourceDistribution(),
        api.getSourceHealth()
      ]);

      setStats(statsData);
      setAllNews(newsData);
      setCategories(catsData);
      setSources(srcsData);
      setSourceDist(sourceDistData);
      setSourceHealth(healthData);
    } catch (err: any) {
      console.error(err);
      if (isInitial) {
        setError('Handshake failed. Verify the local FastAPI port 8000 server is active.');
      }
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData(true);
    // Poll every 30 seconds for live updates
    const interval = setInterval(() => fetchData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const getCategoryName = (id: number) => {
    return categories.find(c => c.id === id)?.name || `Category ${id}`;
  };

  const getSourceName = (id: number) => {
    return sources.find(s => s.id === id)?.name || `Source ${id}`;
  };

  const parseDateUTC = (dateStr: string | null | undefined) => {
    if (!dateStr) return new Date(0);
    const isoStr = (!dateStr.endsWith('Z') && !dateStr.includes('+')) ? dateStr + 'Z' : dateStr;
    return new Date(isoStr);
  };

  const formatTimeAgo = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    const d = parseDateUTC(dateStr);
    const now = new Date();
    
    // Reset hours to compare calendar days
    const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = nowDate.getTime() - dDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 2) return 'JUST NOW';
    if (diffMins < 60) return `${diffMins} MIN AGO`;
    if (diffHours === 1) return '1 HOUR AGO';
    if (diffHours === 3) return '3 HOURS AGO';
    if (diffHours < 24 && diffDays === 0) return `${diffHours} HOURS AGO`;
    if (diffDays === 0) return 'TODAY';
    if (diffDays === 1) return 'YESTERDAY';
    if (diffDays < 7) return `${diffDays} DAYS AGO`;
    
    return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }).toUpperCase()} (${diffDays} DAYS AGO)`;
  };

  const renderSourceBadge = (name: string) => {
    const initials = name === 'Economic Times' ? 'ET' : name === 'Business Standard' ? 'BS' : name === 'Value Research' ? 'VR' : name === 'Freefincal' ? 'FF' : name;
    return (
      <span className="text-[8.5px] font-mono font-black border border-[#FAF0F1] bg-[#FFF5F6] text-[#9A1C1F] px-1 py-0.2 rounded-sm shrink-0 select-none">
        {initials.slice(0, 3).toUpperCase()}
      </span>
    );
  };

  const handleChartMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!chartSvgRef.current) return;
    const svgRect = chartSvgRef.current.getBoundingClientRect();
    const x = e.clientX - svgRect.left;
    const paddingX = 40;
    const chartWidth = svgRect.width - paddingX * 2;
    const chartHeight = svgRect.height - 50;
    
    const indexData = HISTORICAL_DATA[selectedChartIndex];
    const dataCount = indexData.prices.length;
    
    let relativeX = x - paddingX;
    if (relativeX < 0) relativeX = 0;
    if (relativeX > chartWidth) relativeX = chartWidth;
    
    const percentX = relativeX / chartWidth;
    const pointIdx = Math.min(Math.round(percentX * (dataCount - 1)), dataCount - 1);
    
    const minVal = Math.min(...indexData.prices);
    const maxVal = Math.max(...indexData.prices);
    const valRange = maxVal - minVal;
    
    const price = indexData.prices[pointIdx];
    const percentY = 1 - (price - minVal) / valRange;
    const pointY = percentY * chartHeight + 20;
    const pointX = (pointIdx / (dataCount - 1)) * chartWidth + paddingX;
    
    setHoveredDataPoint({
      index: pointIdx,
      x: pointX,
      y: pointY
    });
  };

  const handleChartMouseLeave = () => {
    setHoveredDataPoint(null);
  };

  if (loading) {
    return (
      <div className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full bg-white space-y-6">
        {/* Banner Skeleton */}
        <div className="border border-slate-200 bg-slate-50 p-6 rounded-sm animate-pulse h-16 w-full"></div>
        {/* 3 Column Newspaper Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-3 space-y-4">
            <div className="h-4 w-1/2 bg-slate-200 rounded"></div>
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="p-3 border border-slate-100 rounded animate-pulse space-y-2">
                <div className="h-2 w-1/3 bg-slate-200 rounded"></div>
                <div className="h-4 w-full bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-6 space-y-6">
            <div className="p-5 border border-slate-200 rounded animate-pulse space-y-4">
              <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
              <div className="h-8 w-5/6 bg-slate-200 rounded"></div>
              <div className="h-16 w-full bg-slate-100 rounded"></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="p-3 border border-slate-100 rounded animate-pulse space-y-3">
                  <div className="h-3 w-2/3 bg-slate-200 rounded"></div>
                  <div className="h-12 w-full bg-slate-100 rounded"></div>
                </div>
              ))}
            </div>
          </div>
          <div className="lg:col-span-3 space-y-4">
            <div className="h-40 w-full bg-slate-50 border border-slate-200 rounded animate-pulse"></div>
            <div className="h-40 w-full bg-slate-50 border border-slate-200 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-grow max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="border border-slate-205 bg-white p-8 rounded-sm shadow-xs text-center max-w-md mx-auto">
          <div className="w-10 h-10 rounded bg-[#FAF0F1] flex items-center justify-center mx-auto mb-4 border border-[#FAF0F1]">
            <span className="text-[#9A1C1F] font-bold font-mono">!</span>
          </div>
          <h3 className="text-sm font-bold text-slate-805 mb-2 font-sans">
            Terminal Connection Failure
          </h3>
          <p className="text-xs text-slate-500 mb-6 font-mono leading-relaxed">{error}</p>
          <button 
            onClick={() => fetchData(true)}
            className="w-full bg-[#9A1C1F] hover:bg-[#801719] text-white font-bold text-xs py-2 px-4 rounded shadow-sm cursor-pointer"
          >
            RE-ESTABLISH FEED
          </button>
        </div>
      </div>
    );
  }

  // Filter news based on category and source group selections
  let displayedNews = selectedCategoryFilter 
    ? allNews.filter(a => a.category_id === selectedCategoryFilter)
    : allNews;

  if (selectedSourceGroupFilter === 'regulations') {
    displayedNews = displayedNews.filter(a => [8, 9, 10].includes(a.source_id));
  }

  // 1. Featured Lead Article: Always select the most recent high-priority verified article.
  // Ranking logic: Priority Score DESC, Published Date DESC, Created At DESC. Only use verified articles.
  const heroCandidates = displayedNews.filter(a => a.verified === true);
  const leadArticle = heroCandidates.length > 0
    ? [...heroCandidates].sort((a, b) => {
        if ((b.priority_score || 0) !== (a.priority_score || 0)) {
          return (b.priority_score || 0) - (a.priority_score || 0);
        }
        const dateB = parseDateUTC(b.published_date || b.created_at).getTime();
        const dateA = parseDateUTC(a.published_date || a.created_at).getTime();
        return dateB - dateA;
      })[0]
    : null;

  // 2. Latest news wire stories (Left column feed): Sort strictly by published_date DESC, Fallback: created_at DESC (excluding hero)
  const sortedLatest = [...displayedNews].sort((a, b) => {
    const dateB = parseDateUTC(b.published_date || b.created_at).getTime();
    const dateA = parseDateUTC(a.published_date || a.created_at).getTime();
    return dateB - dateA;
  });

  const latestStories = leadArticle 
    ? sortedLatest.filter(a => a.id !== leadArticle.id).slice(0, 15)
    : sortedLatest.slice(0, 15);

  // Freshness prioritization sorting: verified=true & is_fresh=true first, then verified=true & is_fresh=false, then others. Chronological fallback within tiers.
  const sortWithFreshnessPriority = (a: Article, b: Article) => {
    const scoreA = (a.verified ? 2 : 0) + (a.is_fresh ? 1 : 0);
    const scoreB = (b.verified ? 2 : 0) + (b.is_fresh ? 1 : 0);
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    const dateB = parseDateUTC(b.published_date || b.created_at).getTime();
    const dateA = parseDateUTC(a.published_date || a.created_at).getTime();
    return dateB - dateA;
  };

  const prioritizedNews = [...displayedNews].sort(sortWithFreshnessPriority);

  // 3. Regulatory compliance bulletins (RBI, SEBI, IRDAI updates)
  const regulatoryFeed = prioritizedNews
    .filter(a => [8, 9, 10].includes(a.source_id))
    .slice(0, 6);

  // 4. Sector focus news for center column when no category is selected
  const category1News = prioritizedNews.filter(a => a.category_id === 1).slice(0, 4);
  const category2News = prioritizedNews.filter(a => a.category_id === 2).slice(0, 4);
  const category3News = prioritizedNews.filter(a => a.category_id === 3).slice(0, 4);

  const activeIndex = HISTORICAL_DATA[selectedChartIndex];
  const chartHeight = 180;
  const chartWidth = 600;
  const minVal = Math.min(...activeIndex.prices);
  const maxVal = Math.max(...activeIndex.prices);
  const valRange = maxVal - minVal;

  const points = activeIndex.prices.map((p, idx) => {
    const x = (idx / (activeIndex.prices.length - 1)) * (chartWidth - 80) + 40;
    const y = (1 - (p - minVal) / valRange) * (chartHeight - 40) + 20;
    return { x, y };
  });

  const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  const onlineCount = Object.values(sourceHealth).filter(s => s.status === 'online').length;
  const totalSources = Object.keys(sourceHealth).length || 11;

  return (
    <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 w-full bg-white animate-fade-in">
      
      {/* COGNITIVE SEARCH BANNER */}
      <div className="border border-slate-205 bg-[#FAF8F5] p-4 rounded-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-[#9A1C1F] flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 bg-[#9A1C1F] rounded-full"></span>
            MARKETLENS WIRE REGISTRY SEARCH
          </span>
          <h2 className="text-base font-bold text-slate-905 leading-tight font-serif-lens tracking-tight">
            Financial News & Syndicated Wires Database
          </h2>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative w-full md:w-80 shrink-0">
            <input 
              type="text" 
              placeholder="Search index database..."
              className="w-full pl-8 pr-20 py-1.5 border border-slate-300 bg-white rounded-xs text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:border-[#9A1C1F] font-sans"
              onClick={onNavigateToArticles}
              readOnly
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <button 
              onClick={onNavigateToArticles}
              className="bg-[#9A1C1F] hover:bg-[#801719] text-white font-bold py-0.5 px-2.5 rounded-xs text-[9px] absolute right-1.5 top-1.5 cursor-pointer select-none"
            >
              QUERY
            </button>
          </div>
        </div>
      </div>

      {/* THREE-COLUMN NEWSPAPER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUMN 1: LATEST WIRES (Left - 3/12 width) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="border-b border-slate-250 pb-2">
            <h3 className="font-sans font-extrabold text-xs uppercase text-slate-900 tracking-wider border-l-3 border-[#9A1C1F] pl-2">
              Latest Wires
            </h3>
          </div>
          <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-sm shadow-xs overflow-hidden">
            {latestStories.length === 0 ? (
              <div className="p-4 text-center text-slate-400 font-mono text-[10px]">NO ARTICLES FOUND</div>
            ) : (
              latestStories.map(story => (
                <div key={story.id} className="p-3 hover:bg-[#FFFDF9] transition duration-150 flex flex-col gap-1.5">
                  <div className="flex items-center space-x-1.5 text-[8.5px] font-mono text-slate-400 font-bold">
                    {renderSourceBadge(getSourceName(story.source_id))}
                    <span>{formatTimeAgo(story.published_date || story.created_at)}</span>
                  </div>
                  <h4 
                    onClick={() => onSelectArticle(story)}
                    className="font-serif-lens text-[12.5px] font-bold text-slate-900 hover:text-[#9A1C1F] cursor-pointer transition leading-snug"
                  >
                    {story.title}
                  </h4>
                </div>
              ))
            )}
          </div>
        </div>

        {/* COLUMN 2: LEAD STORY & SECTORS (Center - 6/12 width) */}
        <div className="lg:col-span-6 space-y-6">
          {leadArticle ? (
            <div className="bg-white border border-slate-205 p-5 rounded-sm shadow-xs border-t-3 border-t-[#9A1C1F] space-y-4">
              <div className="flex items-center space-x-2 text-[9px] font-mono font-bold text-slate-400 uppercase">
                <span className="text-[#9A1C1F] font-extrabold tracking-wider">{getSourceName(leadArticle.source_id)}</span>
                <span>&bull;</span>
                <span>{getCategoryName(leadArticle.category_id)}</span>
                <span>&bull;</span>
                <span>{formatTimeAgo(leadArticle.published_date || leadArticle.created_at)}</span>
              </div>
              <h2 
                onClick={() => onSelectArticle(leadArticle)}
                className="text-2xl md:text-3xl font-black font-serif-lens text-slate-900 hover:text-[#9A1C1F] transition leading-tight cursor-pointer"
              >
                {leadArticle.title}
              </h2>
              {leadArticle.summary && (
                <p className="text-xs text-slate-650 leading-relaxed font-body-lens">
                  {leadArticle.summary}
                </p>
              )}
              {leadArticle.why_it_matters && (
                <div className="bg-[#FAF8F5] p-3.5 border border-[#E5E7EB] rounded-xs font-sans">
                  <span className="text-[9px] font-mono font-extrabold text-[#9A1C1F] block uppercase mb-1">MarketLens brief</span>
                  <p className="text-xs text-slate-705 font-medium leading-relaxed font-body-lens">
                    {leadArticle.why_it_matters}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-100 pt-3">
                <span className="text-[#9A1C1F] font-bold uppercase font-semibold">MARKETLENS PRIORITY VALUE: {leadArticle.priority_score}/10</span>
                <button 
                  onClick={() => onSelectArticle(leadArticle)}
                  className="text-[#9A1C1F] hover:text-[#801719] font-bold flex items-center select-none cursor-pointer"
                >
                  <span>Read dossier</span>
                  <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-slate-205 text-slate-455 font-mono text-xs">NO STORIES AVAILABLE</div>
          )}

          {/* Sectors Grid (Shown only if no category filter is active) */}
          {!selectedCategoryFilter && (
            <div className="space-y-4">
              <div className="border-b border-slate-250 pb-2">
                <h3 className="font-sans font-extrabold text-xs uppercase text-slate-900 tracking-wider border-l-3 border-[#9A1C1F] pl-2">
                  Sector Highlights
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sector 1 */}
                <div className="bg-white border border-[#E5E7EB] p-3.5 rounded-sm shadow-xs space-y-3">
                  <h4 className="font-sans font-bold text-[10.5px] text-[#9A1C1F] uppercase tracking-wide border-b border-slate-100 pb-1.5">
                    Wealth Creation
                  </h4>
                  <div className="space-y-3">
                    {category1News.map(story => (
                      <h5 
                        key={story.id}
                        onClick={() => onSelectArticle(story)}
                        className="font-serif-lens text-xs font-bold text-slate-905 hover:text-[#9A1C1F] cursor-pointer leading-snug line-clamp-3"
                      >
                        {story.title}
                      </h5>
                    ))}
                    {category1News.length === 0 && <p className="text-[10px] font-mono text-slate-400">No wire reports</p>}
                  </div>
                </div>

                {/* Sector 2 */}
                <div className="bg-white border border-[#E5E7EB] p-3.5 rounded-sm shadow-xs space-y-3">
                  <h4 className="font-sans font-bold text-[10.5px] text-[#9A1C1F] uppercase tracking-wide border-b border-slate-100 pb-1.5">
                    Wealth Protection
                  </h4>
                  <div className="space-y-3">
                    {category2News.map(story => (
                      <h5 
                        key={story.id}
                        onClick={() => onSelectArticle(story)}
                        className="font-serif-lens text-xs font-bold text-slate-905 hover:text-[#9A1C1F] cursor-pointer leading-snug line-clamp-3"
                      >
                        {story.title}
                      </h5>
                    ))}
                    {category2News.length === 0 && <p className="text-[10px] font-mono text-slate-400">No wire reports</p>}
                  </div>
                </div>

                {/* Sector 3 */}
                <div className="bg-white border border-[#E5E7EB] p-3.5 rounded-sm shadow-xs space-y-3">
                  <h4 className="font-sans font-bold text-[10.5px] text-[#9A1C1F] uppercase tracking-wide border-b border-slate-100 pb-1.5">
                    Wealth Legacy
                  </h4>
                  <div className="space-y-3">
                    {category3News.map(story => (
                      <h5 
                        key={story.id}
                        onClick={() => onSelectArticle(story)}
                        className="font-serif-lens text-xs font-bold text-slate-905 hover:text-[#9A1C1F] cursor-pointer leading-snug line-clamp-3"
                      >
                        {story.title}
                      </h5>
                    ))}
                    {category3News.length === 0 && <p className="text-[10px] font-mono text-slate-400">No wire reports</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Regulatory compliance bulletins */}
          <div className="space-y-3 pt-2">
            <div className="border-b border-slate-250 pb-2 flex items-center space-x-1.5">
              <Scale className="w-4 h-4 text-slate-455" />
              <h3 className="font-sans font-extrabold text-xs uppercase text-slate-900 tracking-wider border-l-3 border-[#9A1C1F] pl-2">
                Regulatory Alerts
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {regulatoryFeed.map(bullet => (
                <div key={bullet.id} className="bg-white border border-slate-205 p-3.5 rounded-sm shadow-xs border-l-3 border-l-amber-600 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex justify-between items-center text-[8.5px] font-mono font-bold text-slate-400 mb-1">
                      <span className="text-amber-850 bg-amber-50 px-1.5 py-0.5 border border-amber-100 rounded-sm">{getSourceName(bullet.source_id)}</span>
                      <span>{formatTimeAgo(bullet.published_date || bullet.created_at)}</span>
                    </div>
                    <h4 
                      onClick={() => onSelectArticle(bullet)}
                      className="font-serif-lens text-[12.5px] font-bold text-slate-905 hover:text-[#9A1C1F] cursor-pointer leading-snug line-clamp-3"
                    >
                      {bullet.title}
                    </h4>
                  </div>
                  <div className="flex justify-between items-center text-[8.5px] font-mono border-t border-slate-50 pt-2 text-slate-400 font-bold">
                    <span>{getCategoryName(bullet.category_id).toUpperCase()}</span>
                    <button 
                      onClick={() => onSelectArticle(bullet)}
                      className="text-slate-805 hover:text-[#9A1C1F] font-bold cursor-pointer"
                    >
                      DOSSIER &rarr;
                    </button>
                  </div>
                </div>
              ))}
              {regulatoryFeed.length === 0 && <p className="text-[10px] font-mono text-slate-455 text-center py-2 col-span-2">No regulatory compliance reports found</p>}
            </div>
          </div>
        </div>

        {/* COLUMN 3: MARKET INDICES, TELEMETRY & BREAKDOWN (Right - 3/12 width) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* General Stats summary */}
          <div className="bg-white border border-slate-205 p-4 rounded-sm shadow-xs space-y-3.5">
            <span className="text-[9px] font-mono uppercase font-bold text-slate-455 tracking-wider block border-b border-slate-100 pb-1.5">Wire Registry Stats</span>
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[8px] font-mono text-slate-400 font-bold block uppercase font-bold">Wire base</span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight">{stats?.total_articles || 0}</span>
              </div>
              <div>
                <span className="text-[8px] font-mono text-slate-400 font-bold block uppercase font-bold">Linked sources</span>
                <span className="text-2xl font-bold text-slate-900 tracking-tight">11</span>
              </div>
            </div>

            {/* Online / Failed sources */}
            <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[8px] font-mono text-slate-400 font-bold block uppercase">Sources online</span>
                <span className="text-2xl font-bold text-emerald-700 tracking-tight">{stats?.online_sources || 0}</span>
              </div>
              <div>
                <span className="text-[8px] font-mono text-slate-400 font-bold block uppercase">Sources failed</span>
                <span className="text-2xl font-bold text-[#9A1C1F] tracking-tight">{stats?.failed_sources || 0}</span>
              </div>
            </div>

            {/* Latest Sync Time */}
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[8px] font-mono text-slate-400 font-bold block uppercase">Last Updated</span>
              <span className="text-xs font-mono font-bold text-slate-700 block mt-1">
                {stats?.last_sync_time ? formatTimeAgo(stats.last_sync_time) : 'N/A'}
              </span>
            </div>

            {/* Source Ingestion table */}
            <div className="space-y-2 pt-1">
              <span className="text-[9px] font-mono text-slate-455 font-bold uppercase block">Source Breakdown</span>
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[8px] text-left">
                    <th className="pb-1">Source</th>
                    <th className="text-right pb-1">Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(sourceDist).map(([name, count]) => (
                    <tr key={name} className="text-slate-805 font-semibold">
                      <td className="py-1 flex items-center space-x-1.5">
                        {renderSourceBadge(name)}
                        <span className="truncate max-w-[100px]">{name}</span>
                      </td>
                      <td className="text-right py-1 mono-num">{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

          {/* TELEMETRY & INGESTION HEALTH */}
          <div className="bg-white border border-slate-205 p-4 rounded-sm shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
              <div className="flex items-center space-x-1.5">
                <Signal className="w-3.5 h-3.5 text-slate-455" />
                <span className="text-[9px] font-mono uppercase font-bold text-slate-450 tracking-wider">Feed Telemetry</span>
              </div>
              <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded-sm ${
                onlineCount === totalSources ? 'bg-emerald-50 text-emerald-700 border border-emerald-250' :
                onlineCount > totalSources / 2 ? 'bg-amber-50 text-amber-700 border border-amber-250' :
                'bg-red-50 text-red-750 border border-red-250'
              }`}>
                {onlineCount}/{totalSources} ONLINE
              </span>
            </div>
            
            <div className="space-y-1.5">
              {Object.entries(sourceHealth).map(([name, info]) => (
                <div key={name} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-b-0">
                  <div className="flex items-center space-x-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${getStatusDot(info.status)}`}></span>
                    <span className="text-[10px] font-mono font-bold text-slate-700">{name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`text-[8px] font-mono font-bold ${
                      info.status === 'online' ? 'text-emerald-700' :
                      info.status === 'blocked' ? 'text-[#9A1C1F]' :
                      info.status === 'unavailable' ? 'text-amber-600' :
                      'text-slate-455'
                    }`}>
                      {getStatusLabel(info.status)}
                    </span>
                    {info.last_fetched && (
                      <span className="text-[7.5px] font-mono text-slate-400">
                        {formatTimeAgo(info.last_fetched)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {Object.keys(sourceHealth).length === 0 && (
              <div className="text-center py-4">
                <span className="text-[9px] font-mono text-slate-450">No telemetry logs logged</span>
              </div>
            )}
          </div>

          {/* Market Indices chart (Compact light ET style) */}
          <div className="bg-white border border-slate-205 p-4 rounded-sm shadow-xs flex flex-col justify-between h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <div>
                <span className="text-[8px] font-mono uppercase font-bold text-slate-400">Index Chart</span>
                <h4 className="text-xs font-bold text-slate-900 font-sans mt-0.5">
                  {activeIndex.name} ({activeIndex.symbol})
                </h4>
              </div>
              <div className="flex bg-slate-100 p-0.5 rounded-sm text-[8px] font-mono font-bold">
                {Object.keys(HISTORICAL_DATA).map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedChartIndex(key);
                      setHoveredDataPoint(null);
                    }}
                    className={`px-1.5 py-0.5 rounded-sm cursor-pointer ${
                      selectedChartIndex === key 
                        ? 'bg-white text-slate-900 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-grow flex items-center justify-center relative mt-2">
              <svg 
                ref={chartSvgRef}
                viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
                className="w-full h-full cursor-crosshair overflow-visible select-none"
                onMouseMove={handleChartMouseMove}
                onMouseLeave={handleChartMouseLeave}
              >
                <line x1="40" y1="20" x2={chartWidth - 40} y2="20" stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1={chartHeight / 2} x2={chartWidth - 40} y2={chartHeight / 2} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
                <line x1="40" y1={chartHeight - 20} x2={chartWidth - 40} y2={chartHeight - 20} stroke="#F3F4F6" strokeWidth="1" strokeDasharray="4 4" />
                
                <path 
                  d={areaD} 
                  fill={`${activeIndex.color}0a`} 
                  stroke="none" 
                />
                
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke={activeIndex.color} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                />

                {hoveredDataPoint && (
                  <>
                    <line x1={hoveredDataPoint.x} y1="20" x2={hoveredDataPoint.x} y2={chartHeight} stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx={hoveredDataPoint.x} cy={hoveredDataPoint.y} r="3" fill={activeIndex.color} stroke="#FFFFFF" strokeWidth="1" />
                  </>
                )}
              </svg>

              {hoveredDataPoint && (
                <div 
                  className="absolute bg-slate-900 text-white p-2 rounded-xs border border-slate-700 shadow-md z-20 font-mono text-[8px] leading-tight space-y-0.5"
                  style={{
                    left: `${Math.min(hoveredDataPoint.x - 50, chartSvgRef.current ? chartSvgRef.current.clientWidth - 110 : 300)}px`,
                    top: `${hoveredDataPoint.y - 65}px`
                  }}
                >
                  <span className="text-slate-355 block font-bold">{activeIndex.dates[hoveredDataPoint.index].toUpperCase()}</span>
                  <span className="font-extrabold text-[10px] block">
                    {activeIndex.prices[hoveredDataPoint.index].toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center text-[8px] font-mono border-t border-slate-100 pt-2">
              <span className={`font-bold ${activeIndex.changePercent >= 0 ? 'text-emerald-700' : 'text-red-650'}`}>
                {activeIndex.changePercent >= 0 ? '▲' : '▼'} {activeIndex.changePercent >= 0 ? '+' : ''}{activeIndex.changePercent}%
              </span>
              <span className="text-slate-900 font-extrabold">CLOSE: {activeIndex.currentPrice.toLocaleString()}</span>
            </div>

          </div>

        </div>

      </div>
    </main>
  );
};