import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import type { Article, VerificationProgress, VerificationResultsResponse } from '../api';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Play, 
  RefreshCw, 
  Download, 
  Activity, 
  Clock, 
  Filter
} from 'lucide-react';

interface AdminVerificationProps {
  onSelectArticle: (article: Article) => void;
}

export const AdminVerification: React.FC<AdminVerificationProps> = ({ onSelectArticle }) => {
  const [data, setData] = useState<VerificationResultsResponse | null>(null);
  const [progress, setProgress] = useState<VerificationProgress | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [triggering, setTriggering] = useState<boolean>(false);
  const pollIntervalRef = useRef<number | null>(null);

  // Fetch results and aggregates
  const fetchResults = useCallback(async () => {
    try {
      setLoading(true);
      const results = await api.getVerificationResults({
        status: statusFilter || undefined,
        limit: 100
      });
      setData(results);
    } catch (err) {
      console.error("Failed to load verification results", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Poll progress function
  const startPollingProgress = useCallback(() => {
    if (pollIntervalRef.current) return;
    
    pollIntervalRef.current = window.setInterval(async () => {
      try {
        const prog = await api.getVerificationProgress();
        setProgress(prog);
        
        if (!prog.is_running) {
          // Stopped running, clean up and refetch results
          stopPollingProgress();
          fetchResults();
        }
      } catch (err) {
        console.error("Error polling progress", err);
      }
    }, 1000);
  }, [fetchResults]);

  const stopPollingProgress = () => {
    if (pollIntervalRef.current) {
      window.clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // Initial load and progress check
  useEffect(() => {
    fetchResults();
    
    // Check initial progress
    const checkInitialProgress = async () => {
      try {
        const prog = await api.getVerificationProgress();
        setProgress(prog);
        if (prog.is_running) {
          startPollingProgress();
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkInitialProgress();

    return () => stopPollingProgress();
  }, [fetchResults, startPollingProgress]);

  // Filter change
  useEffect(() => {
    fetchResults();
  }, [statusFilter, fetchResults]);

  // Run verification
  const handleStartVerification = async () => {
    if (progress?.is_running || triggering) return;
    
    try {
      setTriggering(true);
      await api.triggerVerification(100);
      const prog = await api.getVerificationProgress();
      setProgress(prog);
      startPollingProgress();
    } catch (err) {
      console.error("Failed to trigger verification", err);
      alert("Failed to start verification.");
    } finally {
      setTriggering(false);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data || !data.articles.length) return;
    
    const headers = ['Headline', 'Source ID', 'URL', 'HTTP Status', 'Resolved Domain', 'Title Similarity %', 'Verified At', 'Status', 'Errors'];
    const rows = data.articles.map(a => [
      `"${a.title.replace(/"/g, '""')}"`,
      a.source_id,
      a.url,
      a.http_status || 'N/A',
      a.resolved_domain || 'N/A',
      a.title_similarity != null ? a.title_similarity.toFixed(1) : 'N/A',
      a.verified_at ? new Date(a.verified_at).toLocaleString() : 'N/A',
      a.verification_status || 'Pending',
      a.verification_errors ? `"${a.verification_errors.replace(/"/g, '""')}"` : ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `MarketLens_Verification_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Export
  const handleExportJSON = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.setAttribute("href", jsonString);
    link.setAttribute("download", `MarketLens_Verification_Report_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print (PDF fallback) Layout
  const handlePrint = () => {
    window.print();
  };

  // Compute metrics
  const summary = data?.summary || {
    total_checked: 0,
    verified: 0,
    warnings: 0,
    failed: 0,
    verification_score: 0.0,
    average_response_time_ms: 0.0
  };

  // Calculate circular progress parameters
  const score = progress?.is_running 
    ? (progress.verified_count / (progress.verified_count + progress.warning_count + progress.failed_count || 1)) * 100
    : summary.verification_score;


  return (
    <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full bg-white animate-fade-in">
      
      {/* 1. PAGE HEADER */}
      <div className="border-b border-slate-200 pb-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[9px] font-mono tracking-widest uppercase font-bold text-[#9A1C1F] flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 bg-[#9A1C1F] rounded-full"></span>
            SYSTEM AUDIT PORTAL
          </span>
          <h2 className="text-xl font-bold text-slate-900 leading-tight font-serif-lens tracking-tight">
            News Verification Center
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Verify authenticity, reachability, and source integrity of every article in MarketLens.
          </p>
        </div>
        
        <button
          onClick={handleStartVerification}
          disabled={progress?.is_running || triggering}
          className="flex items-center gap-2 bg-[#0C1E36] hover:bg-[#1E293B] disabled:bg-slate-400 text-white font-bold py-2 px-4 rounded-sm text-[11px] uppercase tracking-widest cursor-pointer shadow-sm select-none transition-all duration-150 border-none shrink-0"
        >
          {progress?.is_running ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          <span>{progress?.is_running ? 'Verifying...' : 'Verify Latest Articles'}</span>
        </button>
      </div>

      {/* 2. PROGRESS PANEL IF RUNNING */}
      {progress?.is_running && (
        <div className="bg-slate-950 border border-slate-800 p-5 rounded-sm mb-8 text-slate-350 font-mono text-xs space-y-3.5 shadow-md">
          <div className="flex justify-between items-center text-[#B58E2A] border-b border-slate-900 pb-2">
            <span className="font-bold flex items-center gap-2 animate-pulse">
              <Activity className="w-4 h-4 text-[#B58E2A]" />
              ACTIVE VERIFICATION PROCESS RUNNING...
            </span>
            <span>{progress.current_index} OF {progress.total_to_check} RECORDS</span>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span className="truncate max-w-[80%]">Auditing: <span className="text-white font-bold">{progress.current_article_title}</span></span>
              <span>{Math.round((progress.current_index / progress.total_to_check) * 100)}%</span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-sm overflow-hidden">
              <div 
                className="bg-[#B58E2A] h-full transition-all duration-300"
                style={{ width: `${(progress.current_index / progress.total_to_check) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-4 text-[10px] text-slate-400 pt-1 text-center font-bold">
            <div>VERIFIED: <span className="text-emerald-500 font-extrabold">{progress.verified_count}</span></div>
            <div>WARNINGS: <span className="text-amber-500 font-extrabold">{progress.warning_count}</span></div>
            <div>FAILED: <span className="text-rose-500 font-extrabold">{progress.failed_count}</span></div>
            <div>AVG TIME: <span className="text-slate-200">{Math.round(progress.average_response_time_ms)}ms</span></div>
          </div>
        </div>
      )}

      {/* 3. ENTERPRISE TELEMETRY GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Verification Score Circular Chart */}
        <div className="bg-[#0C1E36] text-white p-5 rounded-sm shadow-xs border border-slate-700 flex items-center justify-between col-span-1">
          <div className="space-y-1">
            <span className="text-[9px] font-mono tracking-wider text-slate-400 uppercase font-bold">Verification Score</span>
            <div className="text-2xl font-black font-sans leading-none">
              {score.toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-400 leading-normal">
              Rate of articles matching strict domain & title tests.
            </p>
          </div>
          
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="32" cy="32" r="28" stroke="#1E293B" strokeWidth="4" fill="transparent" />
              <circle 
                cx="32" cy="32" r="28" 
                stroke={score >= 95 ? '#10B981' : score >= 80 ? '#F59E0B' : '#EF4444'} 
                strokeWidth="4" fill="transparent"
                strokeDasharray="175.9"
                strokeDashoffset={175.9 - (175.9 * score) / 100}
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute text-[10px] font-mono font-bold">{Math.round(score)}%</span>
          </div>
        </div>

        {/* Checked & Verified Stats */}
        <div className="bg-white border border-slate-205 p-5 rounded-sm shadow-xs grid grid-cols-2 gap-4 col-span-2">
          <div className="border-r border-slate-100 pr-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono tracking-wider text-slate-450 uppercase font-bold">Total Audited</span>
            <div className="my-2">
              <span className="text-3xl font-black text-slate-900 leading-none tracking-tight">{summary.total_checked}</span>
              <span className="text-[10px] text-slate-400 font-mono block mt-1">Articles checked</span>
            </div>
          </div>
          
          <div className="pl-2 flex flex-col justify-between">
            <span className="text-[9px] font-mono tracking-wider text-slate-450 uppercase font-bold">Status Breakdown</span>
            <div className="space-y-1 mt-1 text-[11px] font-mono font-bold">
              <div className="flex justify-between items-center text-emerald-700">
                <span className="flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Verified</span>
                <span>{summary.verified}</span>
              </div>
              <div className="flex justify-between items-center text-amber-700">
                <span className="flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Warnings</span>
                <span>{summary.warnings}</span>
              </div>
              <div className="flex justify-between items-center text-[#9A1C1F]">
                <span className="flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Failed</span>
                <span>{summary.failed}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Latency card */}
        <div className="bg-white border border-slate-205 p-5 rounded-sm shadow-xs flex flex-col justify-between col-span-1">
          <span className="text-[9px] font-mono tracking-wider text-slate-450 uppercase font-bold">Average HTTP Response</span>
          <div className="my-2">
            <span className="text-3xl font-black text-slate-900 leading-none tracking-tight flex items-baseline gap-1">
              {Math.round(summary.average_response_time_ms)}
              <span className="text-xs font-bold text-slate-400 uppercase font-sans">ms</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono block mt-1">Reachable validation time</span>
          </div>
          <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Target threshold &lt; 2000ms</span>
          </div>
        </div>

      </div>

      {/* 4. HEALTH INDICATORS OF PRIMARY SOURCES */}
      <div className="bg-white border border-slate-205 p-4 rounded-sm shadow-xs mb-8">
        <span className="text-[9px] font-mono tracking-wider text-slate-450 uppercase font-bold block border-b border-slate-100 pb-2 mb-3">
          Channel Verification Health
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {data?.source_health.map(src => (
            <div key={src.id} className="border border-slate-200 p-2.5 rounded-sm flex flex-col justify-between h-[65px]">
              <div className="flex justify-between items-start gap-1">
                <span className="text-[10.5px] font-bold text-slate-800 truncate">{src.name}</span>
                <span className={`text-[7.5px] font-mono font-bold px-1 py-0.2 rounded-xs ${
                  src.status === 'ONLINE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                  src.status === 'OFFLINE' ? 'bg-red-50 text-[#9A1C1F] border border-red-200' :
                  'bg-slate-55 border border-slate-200 text-slate-400'
                }`}>
                  {src.status}
                </span>
              </div>
              <span className="text-[7.5px] font-mono text-slate-400 truncate">
                {src.last_verified_at 
                  ? `Checked ${new Date(src.last_verified_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}`
                  : 'Never audited'
                }
              </span>
            </div>
          ))}
          {!data?.source_health.length && (
            <p className="text-[10px] font-mono text-slate-400 py-2 col-span-6 text-center">No source health data loaded</p>
          )}
        </div>
      </div>

      {/* 5. TABLE CONTROLS & SEARCH FILTERS */}
      <div className="bg-white border border-slate-205 rounded-sm shadow-xs overflow-hidden">
        
        {/* Table Filter Top Bar */}
        <div className="bg-slate-50 border-b border-slate-200 p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-500 uppercase">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter results:</span>
            <div className="flex gap-1.5 ml-2">
              <button 
                onClick={() => setStatusFilter('')}
                className={`px-2 py-0.5 rounded-sm border cursor-pointer ${
                  statusFilter === '' 
                    ? 'bg-slate-200 text-slate-800 border-slate-300' 
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-700'
                }`}
              >
                ALL
              </button>
              <button 
                onClick={() => setStatusFilter('Verified')}
                className={`px-2 py-0.5 rounded-sm border cursor-pointer ${
                  statusFilter === 'Verified' 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                    : 'bg-white text-slate-500 border-slate-200 hover:text-emerald-600'
                }`}
              >
                VERIFIED
              </button>
              <button 
                onClick={() => setStatusFilter('Warning')}
                className={`px-2 py-0.5 rounded-sm border cursor-pointer ${
                  statusFilter === 'Warning' 
                    ? 'bg-amber-50 text-amber-800 border-amber-250' 
                    : 'bg-white text-slate-500 border-slate-200 hover:text-amber-600'
                }`}
              >
                WARNINGS
              </button>
              <button 
                onClick={() => setStatusFilter('Failed')}
                className={`px-2 py-0.5 rounded-sm border cursor-pointer ${
                  statusFilter === 'Failed' 
                    ? 'bg-red-50 text-red-800 border-red-250' 
                    : 'bg-white text-slate-500 border-slate-200 hover:text-rose-600'
                }`}
              >
                FAILED
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportCSV}
              disabled={!data || !data.articles.length}
              className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 font-bold py-1 px-2.5 rounded-xs text-[9px] uppercase tracking-wider cursor-pointer shadow-xs hover:bg-slate-50 select-none disabled:bg-slate-50 disabled:text-slate-400"
              title="Export Report as CSV"
            >
              <Download className="w-3 h-3" />
              <span>CSV</span>
            </button>
            <button
              onClick={handleExportJSON}
              disabled={!data || !data.articles.length}
              className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 font-bold py-1 px-2.5 rounded-xs text-[9px] uppercase tracking-wider cursor-pointer shadow-xs hover:bg-slate-50 select-none disabled:bg-slate-50 disabled:text-slate-400"
              title="Export Report as JSON"
            >
              <Download className="w-3 h-3" />
              <span>JSON</span>
            </button>
            <button
              onClick={handlePrint}
              disabled={!data || !data.articles.length}
              className="flex items-center gap-1.5 bg-white border border-slate-300 text-slate-700 font-bold py-1 px-2.5 rounded-xs text-[9px] uppercase tracking-wider cursor-pointer shadow-xs hover:bg-slate-50 select-none disabled:bg-slate-50 disabled:text-slate-400"
              title="Export Report as PDF"
            >
              <Download className="w-3 h-3" />
              <span>PDF</span>
            </button>
          </div>
        </div>

        {/* 6. VERIFICATION RESULTS DATA TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-455 font-mono uppercase text-[8.5px] font-bold">
                <th className="py-2.5 px-4">Headline</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3 text-center">HTTP</th>
                <th className="py-2.5 px-3">Resolved Domain</th>
                <th className="py-2.5 px-3 text-center">Similarity</th>
                <th className="py-2.5 px-3">Verified At</th>
                <th className="py-2.5 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-[10px]">
                    LOADING AUDIT RECORDS...
                  </td>
                </tr>
              ) : data?.articles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-mono text-[10px]">
                    NO VERIFIED ARTICLES FOUND FOR THIS FILTER
                  </td>
                </tr>
              ) : (
                data?.articles.map(art => (
                  <tr key={art.id} className="hover:bg-slate-50 transition-colors">
                    {/* Title */}
                    <td className="py-3 px-4 max-w-[250px] sm:max-w-[400px]">
                      <div className="flex flex-col gap-1">
                        <span 
                          onClick={() => onSelectArticle(art)}
                          className="font-bold text-slate-900 hover:underline cursor-pointer leading-tight block truncate"
                          title={art.title}
                        >
                          {art.title}
                        </span>
                        {art.verification_errors && (
                          <span className="text-[9px] font-mono text-rose-600 bg-rose-50/50 px-1.5 py-0.5 border border-rose-100 rounded-xs self-start font-bold uppercase">
                            Errors: {art.verification_errors}
                          </span>
                        )}
                      </div>
                    </td>
                    {/* Source */}
                    <td className="py-3 px-3 font-mono font-bold text-slate-500 uppercase">
                      {art.source_id === 1 ? 'Mint' : 
                       art.source_id === 2 ? 'ET' : 
                       art.source_id === 3 ? 'BS' : 
                       art.source_id === 4 ? 'MC' : 
                       art.source_id === 5 ? 'Cafe' : 
                       art.source_id === 6 ? 'ValRes' : 
                       art.source_id === 7 ? 'FreeFin' : 
                       art.source_id === 8 ? 'SEBI' : 
                       art.source_id === 9 ? 'RBI' : 
                       art.source_id === 10 ? 'IRDAI' : 
                       art.source_id === 11 ? 'AMFI' : `Src ${art.source_id}`}
                    </td>
                    {/* HTTP code */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className={`font-bold ${
                        art.http_status === 200 ? 'text-emerald-700 font-extrabold' : 
                        art.http_status === 404 ? 'text-rose-600 font-extrabold' : 'text-slate-500'
                      }`}>
                        {art.http_status || 'N/A'}
                      </span>
                    </td>
                    {/* Domain */}
                    <td className="py-3 px-3 font-mono text-slate-500 truncate max-w-[150px]" title={art.resolved_domain || ''}>
                      {art.resolved_domain || 'N/A'}
                    </td>
                    {/* Similarity */}
                    <td className="py-3 px-3 text-center font-mono">
                      <span className={`font-bold ${
                        art.title_similarity != null && art.title_similarity >= 80.0 ? 'text-emerald-700' :
                        art.title_similarity != null ? 'text-amber-600' : 'text-slate-400'
                      }`}>
                        {art.title_similarity != null ? `${art.title_similarity.toFixed(0)}%` : 'N/A'}
                      </span>
                    </td>
                    {/* Verified date */}
                    <td className="py-3 px-3 font-mono text-slate-450 whitespace-nowrap">
                      {art.verified_at ? new Date(art.verified_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).toUpperCase() : 'N/A'}
                    </td>
                    {/* Status Badge */}
                    <td className="py-3 px-4 text-right">
                      <span className={`inline-flex items-center gap-1 text-[8.5px] font-mono font-black px-2 py-0.5 rounded-sm border uppercase select-none ${
                        art.verification_status === 'Verified' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        art.verification_status === 'Warning' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-red-50 text-[#9A1C1F] border-red-200'
                      }`}>
                        {art.verification_status === 'Verified' && <CheckCircle className="w-2.5 h-2.5" />}
                        {art.verification_status === 'Warning' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {art.verification_status === 'Failed' && <XCircle className="w-2.5 h-2.5" />}
                        <span>{art.verification_status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

    </main>
  );
};
