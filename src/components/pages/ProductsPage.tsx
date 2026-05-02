'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, X, Pencil } from 'lucide-react';

interface Supplier {
  id: string; name: string; country: string; currency: string;
  products: { id: string; sku: string; name: string; category: string; unitPriceMyr: number; reorderPoint: number; leadTimeDays: number }[];
}

interface Product {
  id: string; sku: string; name: string; category: string; unitPriceMyr: number;
  reorderPoint: number; leadTimeDays: number; supplierId: string;
  supplier: { id: string; name: string; currency: string };
}

export default function ProductsPage() {
  const [tab, setTab] = useState<'products' | 'suppliers'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Product form
  const [pf, setPf] = useState({ sku: '', name: '', category: '', unitPriceMyr: '', reorderPoint: '', leadTimeDays: '', supplierId: '' });
  // Supplier form
  const [sf, setSf] = useState({ name: '', country: '', currency: 'USD' });

  const fetchData = () => {
    Promise.all([fetch('/api/products'), fetch('/api/suppliers')])
      .then(([pRes, sRes]) => Promise.all([pRes.json(), sRes.json()]))
      .then(([pData, sData]) => { setProducts(pData); setSuppliers(sData); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const addProduct = async () => {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: pf.sku, name: pf.name, category: pf.category,
        unitPriceMyr: parseFloat(pf.unitPriceMyr),
        reorderPoint: parseInt(pf.reorderPoint),
        leadTimeDays: parseInt(pf.leadTimeDays),
        supplierId: pf.supplierId,
      }),
    });
    setShowProductForm(false);
    setPf({ sku: '', name: '', category: '', unitPriceMyr: '', reorderPoint: '', leadTimeDays: '', supplierId: '' });
    fetchData();
  };

  const addSupplier = async () => {
    await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sf),
    });
    setShowSupplierForm(false);
    setSf({ name: '', country: '', currency: 'USD' });
    fetchData();
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('Delete this supplier and all their associated products?')) return;
    await fetch(`/api/suppliers/${id}`, { method: 'DELETE' });
    fetchData();
  };

  // State to hold the product currently being edited
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Function to handle the update
  const updateProduct = async () => {
    if (!editingProduct) return;
    
    await fetch(`/api/products/${editingProduct.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: editingProduct.sku,
        name: editingProduct.name,
        category: editingProduct.category,
        unitPriceMyr: editingProduct.unitPriceMyr,
        reorderPoint: editingProduct.reorderPoint,
        leadTimeDays: editingProduct.leadTimeDays,
        supplierId: editingProduct.supplierId,
      }),
    });
    
    setEditingProduct(null);
    fetchData();
  };
  
  const fmt = (n: number) => `RM${n.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) return <div className="p-6"><div className="animate-pulse h-64 bg-slate-800 rounded-xl"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Products & Suppliers</h2>
        <div className="flex gap-2">
          <button onClick={() => setTab('products')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'products' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            Products
          </button>
          <button onClick={() => setTab('suppliers')} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === 'suppliers' ? 'bg-emerald-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
            Suppliers
          </button>
        </div>
      </div>

      {tab === 'products' && (
        <>
          <button onClick={() => setShowProductForm(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Add Product
          </button>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">SKU</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Category</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Unit Price (MYR)</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Reorder Pt</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium">Lead Time (d)</th>
                    <th className="text-right px-4 py-3 text-slate-400 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-mono text-xs">{p.sku}</td>
                      <td className="px-4 py-3 text-white">{p.name}</td>
                      <td className="px-4 py-3 text-slate-300">{p.category}</td>
                      <td className="px-4 py-3 text-right text-white">{fmt(p.unitPriceMyr)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{p.reorderPoint}</td>
                      <td className="px-4 py-3 text-right text-slate-300">{p.leadTimeDays}</td>
                        <td className="px-4 py-3 text-right flex justify-end gap-2">
                        {/* Edit Button */}
                        <button 
                          onClick={() => setEditingProduct(p)} 
                          className="p-1.5 text-slate-500 hover:text-emerald-400 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editingProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Modify Product</h3>
              <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input 
                placeholder="Product Name" 
                value={editingProduct.name} 
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })} 
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500" 
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Reorder Point</label>
                  <input 
                    type="text" // Standard text input to remove scroll numbers
                    placeholder="Reorder Point" 
                    value={editingProduct.reorderPoint ?? ''} 
                    onChange={(e) => {
                      // Only allow digits to be typed
                      const val = e.target.value.replace(/\D/g, ''); 
                      setEditingProduct({ ...editingProduct, reorderPoint: parseInt(val) || 0 });
                    }} 
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Lead Time (d)</label>
                  <input 
                    type="text" // Standard text input
                    placeholder="Lead Time (d)" 
                    value={editingProduct.leadTimeDays ?? ''} 
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, ''); 
                      setEditingProduct({ ...editingProduct, leadTimeDays: parseInt(val) || 0 });
                    }} 
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500" 
                  />
                </div>
              </div>
              <button onClick={updateProduct} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <>
          <button onClick={() => setShowSupplierForm(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={16} /> Add Supplier
          </button>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Country</th>
                    <th className="text-left px-4 py-3 text-slate-400 font-medium">Currency</th>
                    <th className="text-center px-4 py-3 text-slate-400 font-medium">Products</th>
                    {/* Added empty header for the delete button */}
                    <th className="text-right px-4 py-3 text-slate-400 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((s) => (
                    <tr key={s.id} className="border-b border-slate-700/50 hover:bg-slate-800/80 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-slate-300">{s.country}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-700 text-slate-300">
                          {s.currency}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{s.products.length}</td>
                      {/* Added Delete Button */}
                      <td className="px-4 py-3 text-right">
                        <button 
                          onClick={() => deleteSupplier(s.id)} 
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Product</h3>
              <button onClick={() => setShowProductForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="SKU" value={pf.sku} onChange={(e) => setPf({ ...pf, sku: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input placeholder="Product Name" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input placeholder="Category" value={pf.category} onChange={(e) => setPf({ ...pf, category: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <div className="grid grid-cols-3 gap-3">
                <input type="number" placeholder="Price (MYR)" value={pf.unitPriceMyr} onChange={(e) => setPf({ ...pf, unitPriceMyr: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="number" placeholder="Reorder Pt" value={pf.reorderPoint} onChange={(e) => setPf({ ...pf, reorderPoint: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                <input type="number" placeholder="Lead Time (d)" value={pf.leadTimeDays} onChange={(e) => setPf({ ...pf, leadTimeDays: e.target.value })} className="bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <select value={pf.supplierId} onChange={(e) => setPf({ ...pf, supplierId: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Select Supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.currency})</option>)}
              </select>
              <button onClick={addProduct} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">Add Product</button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Form Modal */}
      {showSupplierForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Supplier</h3>
              <button onClick={() => setShowSupplierForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input placeholder="Supplier Name" value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input placeholder="Country" value={sf.country} onChange={(e) => setSf({ ...sf, country: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <select value={sf.currency} onChange={(e) => setSf({ ...sf, currency: e.target.value })} className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="CNY">CNY</option>
                <option value="MYR">MYR</option>
              </select>
              <button onClick={addSupplier} className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors">Add Supplier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
