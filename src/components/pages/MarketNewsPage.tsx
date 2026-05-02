'use client';

import { useEffect, useState, useMemo } from 'react';
import { Newspaper, ExternalLink, Loader2, TrendingUp, AlertTriangle } from 'lucide-react';

interface NewsItem {
  title: string;
  summary: string;
  date: string;
  source: string;
  url: string;
}

export default function MarketNewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newsTab, setNewsTab] = useState<'outlook' | 'risks'>('outlook');

  const fetchNews = () => {
    setLoading(true);
    setError(null);
    fetch('/api/market-news')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch news');
        return res.json();
      })
      .then((data) => {
        setNews(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchNews();
  }, []);

  // Filter news based on tab keywords
  const filteredNews = useMemo(() => {
    return news.filter(item => {
      const content = (item.title + item.summary).toLowerCase();
      
      if (newsTab === 'outlook') {
        // Added 'business' and 'stocks' to capture more financial data
        return content.includes('finance') || content.includes('sales') || 
              content.includes('market') || content.includes('inflation') ||
              content.includes('trade') || content.includes('business');
      }
      
      // Added 'global' and 'shipping' to capture more risk data
      return content.includes('war') || content.includes('conflict') || 
            content.includes('logistics') || content.includes('supply chain') ||
            content.includes('tariff') || content.includes('shipping') || 
            content.includes('oil');
    });
  }, [news, newsTab]);

 const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Recent"; 
      
      // Returns "2 May 2026" (Clean Malaysian Format)
      return d.toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return "Recent";
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Market Insights</h2>
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 size={40} className="animate-spin text-emerald-400 mb-4" />
          <span className="text-slate-400 font-medium">AI is gathering global intelligence...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Market Intelligence</h2>
         <p className="text-slate-400 text-sm mt-1">
          {newsTab === 'outlook' 
            ? "Monitoring financial trends, currency fluctuations, and macro-economic shifts." 
            : "Tracking geopolitical conflicts, logistics disruptions, and supply chain threats."
          }
        </p>
        </div>
        <button
          onClick={fetchNews}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 transition-all"
        >
          Refresh Feed
        </button>
      </div>

      {/* Strategic Tab Switcher */}
      <div className="flex gap-2 p-1 bg-slate-900/50 border border-slate-700 rounded-xl w-fit">
        <button 
          onClick={() => setNewsTab('outlook')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            newsTab === 'outlook' 
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp size={16} />
          Market Outlook
        </button>
        <button 
          onClick={() => setNewsTab('risks')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
            newsTab === 'risks' 
              ? 'bg-red-600/80 text-white shadow-lg shadow-red-900/20' 
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle size={16} />
          Risk Alerts
        </button>
      </div>

      {error ? (
        <div className="text-center py-16 bg-red-900/10 border border-red-900/20 rounded-xl transition-all">
          <p className="text-red-400 mb-4 font-medium">Connection Error: {error}</p>
          <button onClick={fetchNews} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-700">Retry Connection</button>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/20 border border-dashed border-slate-700 rounded-2xl">
          <Newspaper size={48} className="mx-auto mb-4 opacity-20 text-slate-400" />
          <p className="text-slate-500 font-medium">No high-priority {newsTab === 'outlook' ? 'financial' : 'risk'} signals detected.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredNews.map((item, i) => (
            <div key={i} className="group bg-slate-800/40 border border-slate-700/50 rounded-2xl p-6 hover:border-emerald-500/50 hover:bg-slate-800/60 transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${newsTab === 'outlook' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                    <Newspaper size={18} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.source}</span>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-900/50 px-2 py-1 rounded-md border border-slate-700/50">{formatDate(item.date)}</span>
              </div>
              
              <h3 className="text-white font-bold text-lg mb-3 leading-tight group-hover:text-emerald-400 transition-colors">
                {item.title}
              </h3>
              
              <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 mb-4">
                {item.summary}
              </p>

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors group/link"
                >
                  SOURCE INTEL
                  <ExternalLink size={14} className="group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5 transition-transform" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}