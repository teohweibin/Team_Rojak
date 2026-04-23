'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Brain, DollarSign, Package } from 'lucide-react';

interface DashboardData {
  inventoryValue: number;
  productCount: number;
  criticalCount: number;
  lowCount: number;
  pendingRecommendations: number;
  totalSavings: number;
  exchangeRates: { fromCurrency: string; toCurrency: string; rate: number }[];
  recentMovements: { id: string; productId: string; type: string; quantity: number; note: string | null; createdAt: string }[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4">
      {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-800 rounded-xl"></div>)}
    </div></div>;
  }

  if (!data) return <div className="p-6 text-slate-400">Failed to load dashboard data</div>;

  const fmt = (n: number) => `RM${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Inventory Value */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Inventory Value</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign size={16} className="text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{fmt(data.inventoryValue)}</p>
          <p className="text-sm text-slate-400 mt-1">Across {data.productCount} products</p>
        </div>

        {/* At Risk Stock */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">At Risk Stock</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            <span className="text-red-400">{data.criticalCount} critical</span>
          </p>
          <p className="text-sm text-slate-400 mt-1">
            {data.lowCount > 0 ? `Plus ${data.lowCount} low stock` : 'No low stock items'}
          </p>
        </div>

        {/* AI Recommendations */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">AI Recommendations</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Brain size={16} className="text-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">
            <span className="text-amber-400">{data.pendingRecommendations} pending</span>
          </p>
          <p className="text-sm text-slate-400 mt-1">Ready for review</p>
        </div>

        {/* Est. Savings */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-400">Est. Savings Opportunity</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{fmt(data.totalSavings)}</p>
          <p className="text-sm text-slate-400 mt-1">From implementing AI suggestions</p>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Inventory Movements */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Package size={18} className="text-slate-400" />
            Recent Inventory Movements
          </h3>
          {data.recentMovements.length === 0 ? (
            <p className="text-slate-500 text-sm">No recent movements</p>
          ) : (
            <div className="space-y-2">
              {data.recentMovements.map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      m.type === 'in' ? 'bg-emerald-500/20 text-emerald-400' :
                      m.type === 'out' ? 'bg-red-500/20 text-red-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {m.type}
                    </span>
                    <span className="text-sm text-slate-300">Qty: {m.quantity}</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Currencies Tracked */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-slate-400" />
            Currencies Tracked
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {data.exchangeRates.map((r) => (
              <div key={`${r.fromCurrency}-${r.toCurrency}`} className="bg-slate-900/50 rounded-lg p-4 text-center">
                <p className="text-lg font-bold text-white">{r.fromCurrency} / {r.toCurrency}</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">{r.rate.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
