'use client';

import { useEffect, useState } from 'react';
import { Plus, X, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface VelocityData { productId: string; productName: string; avgPerDay: number; }
interface RevenuePoint { date: string; revenue: number; }
interface Sale { id: string; productId: string; quantity: number; unitPrice: number; total: number; date: string; product: { name: string }; }

export default function SalesVelocityPage() {
  const [velocity, setVelocity] = useState<VelocityData[]>([]);
  const [revenue, setRevenue] = useState<RevenuePoint[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogSale, setShowLogSale] = useState(false);
  const [logForm, setLogForm] = useState({ productId: '', quantity: '', unitPrice: '' });
  const [products, setProducts] = useState<{ id: string; name: string; unitPriceMyr: number }[]>([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/sales-velocity').then((r) => r.json()),
      fetch('/api/sales').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ]).then(([velData, salesData, prodData]) => {
      setVelocity(velData.velocityData || []);
      setRevenue(velData.revenueChart || []);
      setSales(salesData);
      setProducts(prodData);
      setLoading(false);
    });
  }, []);

  const logSale = async () => {
    if (!logForm.productId || !logForm.quantity) return;
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: logForm.productId,
        quantity: parseInt(logForm.quantity),
        unitPrice: parseFloat(logForm.unitPrice) || 0,
      }),
    });
    setShowLogSale(false);
    setLogForm({ productId: '', quantity: '', unitPrice: '' });
    // Refresh
    const [velData, salesData] = await Promise.all([
      fetch('/api/sales-velocity').then((r) => r.json()),
      fetch('/api/sales').then((r) => r.json()),
    ]);
    setVelocity(velData.velocityData || []);
    setRevenue(velData.revenueChart || []);
    setSales(salesData);
  };

  const fmt = (n: number) => `RM${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const shortDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
  };

  if (loading) return <div className="p-6"><div className="animate-pulse space-y-4">
    <div className="h-64 bg-slate-800 rounded-xl"></div>
    <div className="h-48 bg-slate-800 rounded-xl"></div>
  </div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Sales Velocity</h2>
        <button onClick={() => setShowLogSale(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus size={16} /> Log Sale
        </button>
      </div>

      {/* Revenue Chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-400" />
          Recent Revenue
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tickFormatter={shortDate} stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(v) => `RM${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                labelFormatter={(label) => shortDate(label as string)}
                formatter={(value: number) => [fmt(value), 'Revenue']}
              />
              <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales Velocity Table */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Sales Velocity (30d)</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-slate-400 font-medium">Product</th>
              <th className="text-right px-4 py-3 text-slate-400 font-medium">Avg/Day</th>
            </tr>
          </thead>
          <tbody>
            {velocity.map((v) => (
              <tr key={v.productId} className="border-b border-slate-700/50 hover:bg-slate-800/80">
                <td className="px-4 py-3 text-white">{v.productName}</td>
                <td className="px-4 py-3 text-right text-emerald-400 font-medium">{v.avgPerDay}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Recent Sales Log */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Stock / Sales Log</h3>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-800">
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Product</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Qty</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Unit Price</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {sales.slice(0, 50).map((s) => (
                <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-800/80">
                  <td className="px-4 py-2 text-slate-300">{new Date(s.date).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-2 text-white">{s.product?.name || 'Unknown'}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{s.quantity}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{fmt(s.unitPrice)}</td>
                  <td className="px-4 py-2 text-right text-white font-medium">{fmt(s.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Sale Modal */}
      {showLogSale && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Log Sale</h3>
              <button onClick={() => setShowLogSale(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <select value={logForm.productId} onChange={(e) => {
                const p = products.find((pr) => pr.id === e.target.value);
                setLogForm({ ...logForm, productId: e.target.value, unitPrice: p ? String(p.unitPriceMyr) : '' });
              }} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Select Product</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="number" placeholder="Quantity" value={logForm.quantity} onChange={(e) => setLogForm({ ...logForm, quantity: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="number" placeholder="Unit Price (MYR)" value={logForm.unitPrice} onChange={(e) => setLogForm({ ...logForm, unitPrice: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <button onClick={logSale} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">Log Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
