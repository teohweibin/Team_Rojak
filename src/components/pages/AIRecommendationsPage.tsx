'use client';

import { useEffect, useState } from 'react';
import { Brain, CheckCircle, XCircle, Sparkles } from 'lucide-react';

interface Recommendation {
  id: string;
  type: string;
  priority: string;
  message: string;
  status: string;
  savingsMyr: number | null;
  createdAt: string;
  product: { id: string; name: string; sku: string };
}

const priorityColor = (p: string) => {
  switch (p) {
    case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'high': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'medium': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  }
};

const typeLabel = (t: string) => {
  switch (t) {
    case 'reorder': return 'Reorder';
    case 'price_adjust': return 'Price Adjust';
    case 'supplier_switch': return 'Supplier Switch';
    default: return t;
  }
};

export default function AIRecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchRecs = () => {
    const url = filter === 'all' ? '/api/recommendations' : `/api/recommendations?status=${filter}`;
    fetch(url)
      .then((res) => res.json())
      .then((d) => { setRecs(d); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchRecs(); }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/recommendations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    fetchRecs();
  };

  const generateNew = async () => {
    setGenerating(true);
    // Generate new recommendations based on current inventory
    try {
      const invRes = await fetch('/api/inventory');
      const inventory = await invRes.json();

      const critical = inventory.filter((i: { status: string }) => i.status === 'Critical' || i.status === 'Out of Stock');
      for (const item of critical) {
        await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.id,
            type: 'reorder',
            priority: item.status === 'Out of Stock' ? 'critical' : 'high',
            message: `${item.name} (${item.sku}) requires immediate reorder. Current stock: ${item.quantity}, Reorder point: ${item.reorderPoint}. ${item.daysCover} days of cover remaining.`,
            savingsMyr: 0,
          }),
        });
      }
      fetchRecs();
    } catch (e) {
      console.error(e);
    }
    setGenerating(false);
  };

  const fmt = (n: number) => `RM${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const filters = ['all', 'pending', 'accepted', 'dismissed'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Brain size={24} className="text-emerald-400" />
          AI Recommendations
        </h2>
        <button
          onClick={generateNew}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Sparkles size={16} className={generating ? 'animate-spin' : ''} />
          {generating ? 'Generating...' : 'Generate New'}
        </button>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-slate-800 rounded-xl"></div>)}
        </div>
      ) : recs.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Brain size={48} className="mx-auto mb-3 opacity-30" />
          <p>No recommendations found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recs.map((rec) => (
            <div key={rec.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                      {typeLabel(rec.type)}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priorityColor(rec.priority)}`}>
                      {rec.priority}
                    </span>
                    <span className="text-xs text-slate-500">
                      {rec.product.name} ({rec.product.sku})
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{rec.message}</p>
                  {rec.savingsMyr && rec.savingsMyr > 0 && (
                    <p className="text-sm text-emerald-400 mt-2 font-medium">
                      Potential savings: {fmt(rec.savingsMyr)}
                    </p>
                  )}
                </div>
                {rec.status === 'pending' && (
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateStatus(rec.id, 'dismissed')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-xs font-medium transition-colors"
                    >
                      <XCircle size={14} /> Dismiss
                    </button>
                    <button
                      onClick={() => updateStatus(rec.id, 'accepted')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      <CheckCircle size={14} /> Accept
                    </button>
                  </div>
                )}
                {rec.status !== 'pending' && (
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                    rec.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {rec.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
