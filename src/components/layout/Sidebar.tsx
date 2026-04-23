'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  TrendingUp,
  RefreshCw,
  Newspaper,
  Brain,
  CheckSquare,
  Menu,
  X,
} from 'lucide-react';

export type PageKey =
  | 'dashboard'
  | 'inventory'
  | 'products'
  | 'sales-velocity'
  | 'exchange-rates'
  | 'market-news'
  | 'ai-recommendations'
  | 'strategy-validation';

interface SidebarProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

const navItems: { key: PageKey; label: string; icon: React.ReactNode }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { key: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
  { key: 'products', label: 'Products & Suppliers', icon: <ShoppingBag size={18} /> },
  { key: 'sales-velocity', label: 'Sales Velocity', icon: <TrendingUp size={18} /> },
  { key: 'exchange-rates', label: 'Exchange Rates', icon: <RefreshCw size={18} /> },
  { key: 'market-news', label: 'Market News', icon: <Newspaper size={18} /> },
  { key: 'ai-recommendations', label: 'AI Recommendations', icon: <Brain size={18} /> },
  { key: 'strategy-validation', label: 'Strategy Validation', icon: <CheckSquare size={18} /> },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-slate-800 text-white p-2 rounded-md shadow-lg"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-700 z-40 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Package size={24} className="text-emerald-400" />
            StockWise
          </h1>
        </div>

        <nav className="p-3 flex-1 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.key}>
                <button
                  onClick={() => {
                    onNavigate(item.key);
                    setMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === item.key
                      ? 'bg-emerald-600/20 text-emerald-400'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}
