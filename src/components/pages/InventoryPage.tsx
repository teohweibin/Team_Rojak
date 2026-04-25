'use client';

import { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  unitPriceMyr: number;
  reorderPoint: number;
  leadTimeDays: number;
  supplier: { id: string; name: string; currency: string };
  quantity: number;
  value: number;
  status: string;
  daysCover: number;
}

type MovementType =
  | 'purchase_received'
  | 'sale_delivery'
  | 'customer_return'
  | 'supplier_return'
  | 'damaged_lost'
  | 'stock_count_correction';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [movementProductId, setMovementProductId] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<MovementType>('purchase_received');
  const [movementQty, setMovementQty] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [note, setNote] = useState('');

  const fetchInventory = () => {
    setLoading(true);
    fetch('/api/inventory')
      .then((r) => r.json())
      .then((d) => {
        setItems(Array.isArray(d) ? d : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const selectedItem = items.find((item) => item.id === movementProductId);

  const openMovementModal = (item: InventoryItem) => {
    setMovementProductId(item.id);
    setMovementType('purchase_received');
    setMovementQty('');
    setReferenceNo('');
    setNote('');
  };

  const closeMovementModal = () => {
    setMovementProductId(null);
    setMovementQty('');
    setReferenceNo('');
    setNote('');
  };

  const handleStockMovement = async () => {
    if (!movementProductId || !movementQty) return;

    setLoading(true);

    await fetch('/api/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: movementProductId,
        quantity: parseInt(movementQty),
        type: movementType,
        referenceNo,
        note,
      }),
    });

    closeMovementModal();
    fetchInventory();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'Critical':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'Low':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Healthy':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Out of Stock':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const fmt = (n: number) =>
    `RM${n.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-800 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Inventory</h2>
        <button
          onClick={fetchInventory}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="text-left px-4 py-3 text-slate-400 font-medium">SKU / Product</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-slate-400 font-medium">Supplier</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Qty</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Value (MYR)</th>
                <th className="text-center px-4 py-3 text-slate-400 font-medium">Status</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium">Days Cover</th>
                <th className="text-right px-4 py-3 text-slate-400 font-medium"></th>
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-slate-700/50 hover:bg-slate-800/80 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{item.name}</div>
                    <div className="text-slate-500 text-xs">{item.sku}</div>
                  </td>

                  <td className="px-4 py-3 text-slate-300">{item.category}</td>

                  <td className="px-4 py-3">
                    <div className="text-slate-300">{item.supplier.name}</div>
                    <div className="text-xs text-slate-500">{item.supplier.currency} base</div>
                  </td>

                  <td className="px-4 py-3 text-right text-white font-medium">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-white">{fmt(item.value)}</td>

                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${statusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-right text-slate-300">{item.daysCover}</td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openMovementModal(item)}
                      className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                    >
                      Stock Movement
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {movementProductId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Stock Movement</h3>
              <button onClick={closeMovementModal} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            {selectedItem && (
              <div className="mb-4 rounded-lg bg-slate-900/60 border border-slate-700 p-3">
                <div className="text-white font-medium">{selectedItem.name}</div>
                <div className="text-xs text-slate-500">{selectedItem.sku}</div>
                <div className="text-xs text-slate-400 mt-1">Current stock: {selectedItem.quantity}</div>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Movement Type</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value as MovementType)}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="purchase_received">Purchase Received / PO Received (+)</option>
                  <option value="sale_delivery">Sale / Delivery (-)</option>
                  <option value="customer_return">Customer Return (+)</option>
                  <option value="supplier_return">Return to Supplier (-)</option>
                  <option value="damaged_lost">Damaged / Lost (-)</option>
                  <option value="stock_count_correction">Stock Count Correction</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  {movementType === 'stock_count_correction' ? 'Correct Final Quantity' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min="0"
                  value={movementQty}
                  onChange={(e) => setMovementQty(e.target.value)}
                  placeholder={movementType === 'purchase_received' ? 'e.g. 100' : 'e.g. 20'}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Reference No.</label>
                <input
                  type="text"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  placeholder="e.g. PO-00012 / SO-00031"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Notes</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional notes..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleStockMovement}
                  className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
                >
                  Save Movement
                </button>

                <button
                  onClick={closeMovementModal}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}