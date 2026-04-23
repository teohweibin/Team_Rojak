'use client';

import { Newspaper, ExternalLink } from 'lucide-react';

const newsItems = [
  {
    title: 'Malaysian Ringgit Strengthens Against USD Amid Regional Optimism',
    summary: 'The MYR gained 0.3% against the US dollar as regional trade data showed improvement. Economists attribute this to stronger export figures and increased foreign investment inflows into Malaysia\'s manufacturing sector.',
    date: '23 Apr 2026',
    source: 'Bloomberg',
  },
  {
    title: 'Global Coffee Bean Prices Surge Due to Supply Chain Disruptions',
    summary: 'Arabica coffee futures rose 4.2% this week as shipping delays from major producing regions continue to impact global supply. Importers are advised to lock in forward contracts to hedge against further price increases.',
    date: '22 Apr 2026',
    source: 'Reuters',
  },
  {
    title: 'China Manufacturing PMI Signals Expansion for Third Consecutive Month',
    summary: 'China\'s official manufacturing PMI came in at 51.2, above the 50-mark that separates expansion from contraction. This bodes well for CNY-denominated supply chains and may reduce lead time variability for Malaysian importers.',
    date: '21 Apr 2026',
    source: 'CNBC',
  },
  {
    title: 'EU Carbon Border Tax Impacts European Supplier Costs',
    summary: 'The European Union\'s Carbon Border Adjustment Mechanism continues to push up manufacturing costs for European suppliers. Malaysian businesses sourcing from EU partners should anticipate 2-5% price increases in Q3 2026.',
    date: '20 Apr 2026',
    source: 'Financial Times',
  },
  {
    title: 'Southeast Asian E-Commerce Growth Drives Packaging Demand',
    summary: 'E-commerce sales across Southeast Asia grew 18% year-on-year, driving increased demand for packaging materials including disposable tableware. Suppliers report capacity constraints and 3-4 week lead times for new orders.',
    date: '19 Apr 2026',
    source: 'Nikkei Asia',
  },
  {
    title: 'Bank Negara Malaysia Holds Interest Rate at 3.0%',
    summary: 'The central bank maintained its overnight policy rate at 3.0%, citing stable inflation and manageable external uncertainties. The decision is expected to support MYR stability against major currencies in the near term.',
    date: '18 Apr 2026',
    source: 'The Star',
  },
];

export default function MarketNewsPage() {
  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Market News</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {newsItems.map((item, i) => (
          <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:border-slate-600 transition-colors">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Newspaper size={16} className="text-emerald-400 mt-0.5" />
                <span className="text-xs text-emerald-400 font-medium">{item.source}</span>
              </div>
              <span className="text-xs text-slate-500">{item.date}</span>
            </div>
            <h3 className="text-white font-semibold mb-2 leading-tight">{item.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{item.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
