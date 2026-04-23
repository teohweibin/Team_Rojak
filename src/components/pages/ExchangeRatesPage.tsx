'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Edit3, X } from 'lucide-react';

interface ExchangeRate {
  id: string; fromCurrency: string; toCurrency: string; rate: number;
}

export default function ExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRate, setEditRate] = useState('');

  const fetchRates = () => {
    fetch('/api/exchange-rates')
      .then((res) => res.json())
      .then((d) => { setRates(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchRates(); }, []);

  const updateRate = async (id: string) => {
    const rate = rates.find((r) => r.id === id);
    if (!rate || !editRate) return;
    await fetch('/api/exchange-rates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromCurrency: rate.fromCurrency, toCurrency: rate.toCurrency, rate: parseFloat(editRate) }),
    });
    setEditingId(null);
    setEditRate('');
    fetchRates();
  };

  const currencyFlags: Record<string, string> = { USD: '🇺🇸', EUR: '🇪🇺', CNY: '🇨🇳', MYR: '🇲🇾' };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Exchange Rates</h2>
        <button onClick={fetchRates} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rates.map((r) => (
            <div key={r.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{currencyFlags[r.fromCurrency] || ''}</span>
                  <span className="text-lg font-bold text-white">{r.fromCurrency} / {r.toCurrency}</span>
                </div>
                <button
                  onClick={() => { setEditingId(r.id); setEditRate(String(r.rate)); }}
                  className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors"
                >
                  <Edit3 size={14} />
                </button>
              </div>
              {editingId === r.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={editRate}
                    onChange={(e) => setEditRate(e.target.value)}
                    className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button onClick={() => updateRate(r.id)} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm transition-colors">Save</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors"><X size={14} /></button>
                </div>
              ) : (
                <>
                  <p className="text-3xl font-bold text-emerald-400">{r.rate.toFixed(4)}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                    <TrendingUp size={12} className="text-emerald-500" />
                    <span>Last updated</span>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
