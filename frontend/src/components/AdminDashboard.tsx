import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Badge } from './ui/Badge';
import { SkeletonRow } from './ui/Skeleton';
import { useToast } from './ui/Toast';

export function AdminDashboard({ role }: { role: string }) {
  const { showToast } = useToast();
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
      const res = await fetch('/api/v1/admin/rates', {
        headers: { 'X-User-Role': role },
      });
      const data = await res.json();
      setRates(data);
    } catch (err) {
      console.error('Failed to fetch rates:', err);
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
        const res = await fetch(`/api/v1/admin/rates/${editingRate.item_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
          body: JSON.stringify({
            name: formData.name,
            rate: formData.rate,
            gst_percent: formData.gst_percent,
            applicable_vendor: formData.applicable_vendor,
            in_catalogue: formData.in_catalogue,
          }),
        });
        if (!res.ok) throw new Error('Failed to update rate');
        showToast('Rate updated successfully.', 'success');
      } else {
        const res = await fetch('/api/v1/admin/rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
          body: JSON.stringify(formData),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || 'Failed to create rate');
        }
        showToast('Rate added successfully.', 'success');
      }
      setIsModalOpen(false);
      fetchRates();
    } catch (err: any) {
      showToast(err.message || 'Could not save rate.', 'error');
    }
  };

  const CATEGORY_VARIANTS: Record<string, 'default' | 'success' | 'warning'> = {
    board: 'default',
    laminate: 'default',
    hardware: 'default',
    labour: 'success',
    glass: 'default',
    miscellaneous: 'warning',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-center">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Master Rate Database</h1>
          <p className="text-xs text-slate-500 mt-0.5">Procurement control centre. Rate updates are append-only to preserve quote history.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Rate
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {rates.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                <Plus className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No rates yet</p>
              <p className="text-xs text-slate-400">Add your first rate to get started.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Item ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Master SKU</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Rate</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Unit</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                  : rates.map(rate => (
                      <tr key={rate.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{rate.item_id}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant={CATEGORY_VARIANTS[rate.category] || 'default'}>
                            {rate.category}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5 text-slate-800 font-medium">{rate.name}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{rate.master_sku}</td>
                        <td className="px-5 py-3.5 text-slate-900 font-semibold text-right">₹{rate.rate.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-slate-500 text-center text-xs">{rate.unit}</td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => handleOpenModal(rate)}
                            className="text-indigo-600 hover:text-indigo-800 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit / Add Modal */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRate ? 'Edit Rate' : 'Add New Rate'}
        subtitle={editingRate ? `Editing: ${editingRate.item_id}` : 'Create a new procurement rate entry.'}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              form="rate-form"
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <Save className="w-4 h-4" />
              Save Rate
            </button>
          </div>
        }
      >
        <form id="rate-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Item ID</label>
              <input
                required
                disabled={!!editingRate}
                type="text"
                value={formData.item_id}
                onChange={e => setFormData({ ...formData, item_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800"
                placeholder="e.g. ITM-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Master SKU</label>
              <input
                required
                disabled={!!editingRate}
                type="text"
                value={formData.master_sku}
                onChange={e => setFormData({ ...formData, master_sku: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800"
                placeholder="e.g. MAT-PLY-18"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Name</label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Category</label>
              <select
                disabled={!!editingRate}
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800"
              >
                <option value="board">Board</option>
                <option value="laminate">Laminate</option>
                <option value="hardware">Hardware</option>
                <option value="labour">Labour</option>
                <option value="glass">Glass</option>
                <option value="miscellaneous">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Unit</label>
              <input
                required
                disabled={!!editingRate}
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Rate (₹)</label>
              <input
                required
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">GST %</label>
              <input
                required
                type="number"
                step="0.1"
                value={formData.gst_percent}
                onChange={e => setFormData({ ...formData, gst_percent: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800"
              />
            </div>
          </div>

          {editingRate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <strong>Note:</strong> Editing this rate will expire the current entry and create a new row with today's date to preserve quote history.
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
