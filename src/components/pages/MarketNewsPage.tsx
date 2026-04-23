'use client';

import { useEffect, useState } from 'react';
import { Newspaper, ExternalLink, Loader2 } from 'lucide-react';

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

  useEffect(() => { fetchNews(); }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Market News</h2>
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-emerald-400" />
          <span className="ml-3 text-slate-400">Fetching latest market news...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Market News</h2>
        <div className="text-center py-16 bg-slate-800/30 border border-dashed border-slate-700 rounded-xl">
          <Newspaper size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-slate-500 mb-4">Failed to load news: {error}</p>
          <button
            onClick={fetchNews}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Market News</h2>
        <button
          onClick={fetchNews}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs font-medium transition-colors"
        >
          Refresh
        </button>
      </div>

      {news.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 border border-dashed border-slate-700 rounded-xl">
          <Newspaper size={48} className="mx-auto mb-3 opacity-30" />
          <p className="text-slate-500">No news found. Try refreshing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {news.map((item, i) => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Newspaper size={16} className="text-emerald-400 mt-0.5" />
                  <span className="text-xs text-emerald-400 font-medium">{item.source}</span>
                </div>
                <span className="text-xs text-slate-500">{formatDate(item.date)}</span>
              </div>
              <h3 className="text-white font-semibold mb-2 leading-tight">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.summary}</p>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-3 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  <ExternalLink size={12} />
                  Read more
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
