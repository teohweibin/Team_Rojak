'use client';

import { useState } from 'react';
import { Play, AlertTriangle, CheckCircle, Clock, DollarSign, BarChart3 } from 'lucide-react';

interface SimulationResult {
  summary: {
    totalLostSales: number;
    totalOrderCost: number;
    highRiskItems: number;
    totalProducts: number;
  };
  simulations: {
    productName: string;
    sku: string;
    currentStock: number;
    avgDailySales: number;
    daysUntilStockout: number | string;
    leadTimeDays: number;
    riskLevel: string;
    projectedLostSales: number;
    recommendedOrderQty: number;
    estimatedOrderCost: number;
  }[];
}

export default function StrategyValidationPage() {
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [running, setRunning] = useState(false);

  const runSimulation = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/simulate', { method: 'POST' });
      const data = await res.json();
      setResults(data);
    } catch (e) {
      console.error(e);
    }
    setRunning(false);
  };

  const fmt = (n: number) => `RM${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const riskColor = (r: string) => {
    switch (r) {
      case 'HIGH': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'MEDIUM': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'LOW': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={24} className="text-emerald-400" />
          Strategy Validation
        </h2>
        <button
          onClick={runSimulation}
          disabled={running}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Play size={16} className={running ? 'animate-pulse' : ''} />
          {running ? 'Running...' : 'Run Simulation'}
        </button>
      </div>

      {!results && !running && (
        <div className="text-center py-16 bg-slate-800/30 border border-dashed border-slate-700 rounded-xl">
          <Clock size={48} className="mx-auto mb-4 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-400 mb-2">Ready to Simulate</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Run a simulation to analyze your current inventory strategy, identify at-risk products, and get cost optimization recommendations.
          </p>
          <button
            onClick={runSimulation}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Play size={16} /> Run Simulation Now
          </button>
        </div>
      )}

      {running && (
        <div className="text-center py-16 bg-slate-800/30 border border-slate-700 rounded-xl">
          <div className="animate-spin w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white">Analyzing Inventory Strategy...</h3>
          <p className="text-sm text-slate-400 mt-2">This may take a moment</p>
        </div>
      )}

      {results && !running && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-red-400" />
                <span className="text-sm text-slate-400">High Risk Items</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{results.summary.highRiskItems}</p>
              <p className="text-xs text-slate-500 mt-1">of {results.summary.totalProducts} products</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign size={16} className="text-amber-400" />
                <span className="text-sm text-slate-400">Projected Lost Sales</span>
              </div>
              <p className="text-2xl font-bold text-amber-400">{fmt(results.summary.totalLostSales)}</p>
              <p className="text-xs text-slate-500 mt-1">If no action taken</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle size={16} className="text-emerald-400" />
                <span className="text-sm text-slate-400">Optimal Order Cost</span>
              </div>
              <p className="text-2xl font-bold text-emerald-400">{fmt(results.summary.totalOrderCost)}</p>
              <p className="text-xs text-slate-500 mt-1">To restore safe levels</p>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={16} className="text-blue-400" />
                <span className="text-sm text-slate-400">Net Savings</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">{fmt(results.summary.totalLostSales - results.summary.totalOrderCost)}</p>
              <p className="text-xs text-slate-500 mt-1">Action vs. inaction</p>
            </div>
          </div>

          {/* Simulation Table */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Product</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Stock</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Avg/Day</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Days Left</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">Risk</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Lost Sales</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Order Qty</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Order Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {results.simulations.map((s, i) => (
                    <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{s.productName}</div>
                        <div className="text-xs text-slate-500">{s.sku}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-white">{s.currentStock}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{s.avgDailySales}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{s.daysUntilStockout}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${riskColor(s.riskLevel)}`}>
                          {s.riskLevel}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-amber-400">{s.projectedLostSales > 0 ? fmt(s.projectedLostSales) : '-'}</td>
                      <td className="px-4 py-3 text-right text-emerald-400">{s.recommendedOrderQty > 0 ? s.recommendedOrderQty : '-'}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{s.estimatedOrderCost > 0 ? fmt(s.estimatedOrderCost) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
