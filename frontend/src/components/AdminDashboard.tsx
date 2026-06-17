import React, { useState, useEffect } from 'react';
import { Plus, Edit2, X, Save } from 'lucide-react';

export function AdminDashboard({ role }: { role: string }) {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<any>(null);
  const [formData, setFormData] = useState({
    item_id: '',
    category: 'board',
    name: '',
    master_sku: '',
    unit: 'sqft',
    rate: 0,
    gst_percent: 18.0,
    applicable_vendor: '',
    in_catalogue: false,
  });

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/admin/rates", {
        headers: { "X-User-Role": role }
      });
      const data = await res.json();
      setRates(data);
    } catch (err) {
      console.error("Failed to fetch rates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  const handleOpenModal = (rate: any = null) => {
    if (rate) {
      setEditingRate(rate);
      setFormData({
        item_id: rate.item_id,
        category: rate.category,
        name: rate.name,
        master_sku: rate.master_sku,
        unit: rate.unit,
        rate: rate.rate,
        gst_percent: rate.gst_percent,
        applicable_vendor: rate.applicable_vendor || '',
        in_catalogue: rate.in_catalogue,
      });
    } else {
      setEditingRate(null);
      setFormData({
        item_id: '',
        category: 'board',
        name: '',
        master_sku: '',
        unit: 'sqft',
        rate: 0,
        gst_percent: 18.0,
        applicable_vendor: '',
        in_catalogue: false,
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRate) {
        // PUT request
        const res = await fetch(`http://localhost:8000/api/v1/admin/rates/${editingRate.item_id}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "X-User-Role": role
          },
          body: JSON.stringify({
            name: formData.name,
            rate: formData.rate,
            gst_percent: formData.gst_percent,
            applicable_vendor: formData.applicable_vendor,
            in_catalogue: formData.in_catalogue
          })
        });
        if (!res.ok) throw new Error("Failed to update rate");
      } else {
        // POST request
        const res = await fetch(`http://localhost:8000/api/v1/admin/rates`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "X-User-Role": role
          },
          body: JSON.stringify(formData)
        });
        if (!res.ok) {
           const errData = await res.json();
           throw new Error(errData.detail || "Failed to create rate");
        }
      }
      setIsModalOpen(false);
      fetchRates();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      <div className="px-8 py-6 flex justify-between items-center border-b border-gray-200 bg-white">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Master Rate DB</h2>
          <p className="text-sm text-gray-500">Procurement Control Center. Rate updates are append-only to preserve quote history.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Rate</span>
        </button>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading rates...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-600">Item ID</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Category</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Name</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Master SKU</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 text-right">Current Rate</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 text-center">Unit</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rates.map((rate) => (
                  <tr key={rate.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{rate.item_id}</td>
                    <td className="px-6 py-4">
                      <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs uppercase tracking-wide font-medium">{rate.category}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{rate.name}</td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{rate.master_sku}</td>
                    <td className="px-6 py-4 text-gray-900 font-bold text-right">₹{rate.rate.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-500 text-center">{rate.unit}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleOpenModal(rate)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {rates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No rates found in the database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">{editingRate ? "Edit Rate" : "Add New Rate"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item ID</label>
                  <input required disabled={!!editingRate} type="text" value={formData.item_id} onChange={e => setFormData({...formData, item_id: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500" />
                  <p className="text-xs text-gray-500 mt-1">Unique identifier (e.g. ITM-001)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Master SKU</label>
                  <input required disabled={!!editingRate} type="text" value={formData.master_sku} onChange={e => setFormData({...formData, master_sku: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500" />
                  <p className="text-xs text-gray-500 mt-1">Pricing lookup key (e.g. MAT-PLY-18)</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select disabled={!!editingRate} value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500">
                    <option value="board">Board</option>
                    <option value="laminate">Laminate</option>
                    <option value="hardware">Hardware</option>
                    <option value="labour">Labour</option>
                    <option value="glass">Glass</option>
                    <option value="miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input required disabled={!!editingRate} type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                  <input required type="number" step="0.01" value={formData.rate} onChange={e => setFormData({...formData, rate: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none font-bold text-gray-900" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST %</label>
                  <input required type="number" step="0.1" value={formData.gst_percent} onChange={e => setFormData({...formData, gst_percent: parseFloat(e.target.value) || 0})} className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              {editingRate && (
                <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex items-start space-x-2 mt-4">
                  <div className="text-yellow-700 text-sm">
                    <strong>Note:</strong> Editing this rate will automatically expire the old rate and insert a new row with today's date to preserve quote history.
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200 flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium">Cancel</button>
                <button type="submit" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  <Save className="w-4 h-4" />
                  <span>Save Rate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
