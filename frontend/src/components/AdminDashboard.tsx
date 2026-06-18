import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Save, PowerOff, Power, Upload, CheckCircle, XCircle, SkipForward } from 'lucide-react';
import { Modal } from './ui/Modal';
import { useToast } from './ui/Toast';

interface CatalogItem {
  id: number;
  item_id: string;
  category: string;
  name: string;
  master_sku: string;
  unit: string;
  rate: number;
  gst_percent: number;
  applicable_vendor: string | null;
  in_catalogue: boolean;
}

const emptyForm = {
  item_id: '',
  category: 'board',
  name: '',
  master_sku: '',
  unit: '',
  rate: 0,
  gst_percent: 18.0,
  applicable_vendor: '',
  in_catalogue: true,
};

interface ImportResult {
  rows_added: number;
  rows_skipped: number;
  errors: { row: number; item_id?: string; reason: string }[];
}

export function AdminDashboard({ role }: { role: string }) {
  const { showToast } = useToast();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/rates?active_only=${!showInactive}`, {
        headers: { 'X-User-Role': role },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      showToast('Failed to load catalog.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [showInactive]);

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/v1/admin/rates/import', {
        method: 'POST',
        headers: { 'X-User-Role': role },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.detail || 'Import failed.', 'error');
        return;
      }
      setImportResult(data as ImportResult);
      if (data.rows_added > 0) fetchItems();
    } catch (err) {
      console.error('CSV import failed:', err);
      showToast('Could not upload CSV.', 'error');
    } finally {
      setImporting(false);
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData({ ...emptyForm });
    setIsModalOpen(true);
  };

  const openEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      item_id: item.item_id,
      category: item.category,
      name: item.name,
      master_sku: item.master_sku,
      unit: item.unit,
      rate: item.rate,
      gst_percent: item.gst_percent,
      applicable_vendor: item.applicable_vendor || '',
      in_catalogue: item.in_catalogue,
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        const res = await fetch(`/api/v1/admin/rates/${editingItem.item_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
          body: JSON.stringify({
            name: formData.name,
            category: formData.category,
            unit: formData.unit,
            rate: formData.rate,
            gst_percent: formData.gst_percent,
            applicable_vendor: formData.applicable_vendor || null,
            in_catalogue: formData.in_catalogue,
          }),
        });
        if (!res.ok) throw new Error('Failed to update material');
        showToast('Material updated.', 'success');
      } else {
        const res = await fetch('/api/v1/admin/rates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
          body: JSON.stringify({
            ...formData,
            applicable_vendor: formData.applicable_vendor || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to add material');
        }
        showToast('Material added.', 'success');
      }
      setIsModalOpen(false);
      fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Could not save material.', 'error');
    }
  };

  const handleToggleActive = async (item: CatalogItem) => {
    try {
      const res = await fetch(`/api/v1/admin/rates/${item.item_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
        body: JSON.stringify({
          name: item.name,
          category: item.category,
          unit: item.unit,
          rate: item.rate,
          gst_percent: item.gst_percent,
          applicable_vendor: item.applicable_vendor || null,
          in_catalogue: !item.in_catalogue,
        }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      showToast(
        item.in_catalogue ? 'Material deactivated.' : 'Material activated.',
        'success'
      );
      fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Could not update material.', 'error');
    }
  };

  const CATEGORY_COLORS: Record<string, string> = {
    board: 'bg-blue-50 text-blue-700',
    laminate: 'bg-purple-50 text-purple-700',
    hardware: 'bg-amber-50 text-amber-700',
    labour: 'bg-green-50 text-green-700',
    glass: 'bg-cyan-50 text-cyan-700',
    miscellaneous: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-4 sm:px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Material Catalog</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage materials, units, and prices used in quotes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Show inactive
          </label>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvImport}
          />
          <button
            onClick={() => csvInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-1.5 border border-slate-200 bg-white text-slate-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm min-h-[36px] disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm min-h-[36px]"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
              <Plus className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No materials yet</p>
            <p className="text-xs text-slate-400">Add your first material to get started.</p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Category</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Unit</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Price/unit</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map(item => (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.in_catalogue ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-600'}`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-center text-xs">{item.unit}</td>
                      <td className="px-4 py-3 text-slate-900 font-semibold text-right">
                        ₹{item.rate.toLocaleString('en-IN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          item.in_catalogue ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.in_catalogue ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            title="Edit"
                            className="p-2 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(item)}
                            title={item.in_catalogue ? 'Deactivate' : 'Activate'}
                            className={`p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                              item.in_catalogue
                                ? 'text-red-400 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                          >
                            {item.in_catalogue ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="sm:hidden divide-y divide-slate-100">
              {items.map(item => (
                <div key={item.id} className={`px-4 py-3 ${!item.in_catalogue ? 'opacity-50' : ''}`}>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{item.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-600'}`}>
                          {item.category}
                        </span>
                        <span className="text-xs text-slate-500">{item.unit}</span>
                        <span className="text-xs font-semibold text-slate-900">₹{item.rate.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(item)} className="p-2.5 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`p-2.5 rounded-xl transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                          item.in_catalogue ? 'text-red-400 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {item.in_catalogue ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <Modal
        open={!!importResult}
        onClose={() => setImportResult(null)}
        title="CSV Import Results"
        subtitle={importResult ? `${importResult.rows_added} added · ${importResult.rows_skipped} skipped · ${importResult.errors.length} error${importResult.errors.length !== 1 ? 's' : ''}` : ''}
        footer={
          <div className="flex justify-end">
            <button
              onClick={() => setImportResult(null)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
            >
              Done
            </button>
          </div>
        }
      >
        {importResult && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col items-center justify-center bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                <CheckCircle className="w-5 h-5 text-green-500 mb-1" />
                <span className="text-2xl font-bold text-green-700">{importResult.rows_added}</span>
                <span className="text-xs text-green-600 mt-0.5">Added</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                <SkipForward className="w-5 h-5 text-amber-500 mb-1" />
                <span className="text-2xl font-bold text-amber-700">{importResult.rows_skipped}</span>
                <span className="text-xs text-amber-600 mt-0.5">Skipped</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                <XCircle className="w-5 h-5 text-red-400 mb-1" />
                <span className="text-2xl font-bold text-red-600">{importResult.errors.length}</span>
                <span className="text-xs text-red-500 mt-0.5">Errors</span>
              </div>
            </div>
            {importResult.rows_skipped > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                Skipped rows already have an active entry in the catalog. The append-only history is preserved.
              </p>
            )}
            {importResult.errors.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Row errors</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                      <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <span className="text-red-700">
                        <span className="font-semibold">Row {err.row}{err.item_id ? ` (${err.item_id})` : ''}:</span>{' '}
                        {err.reason}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Material' : 'Add Material'}
        subtitle={
          editingItem
            ? `Editing: ${editingItem.name}`
            : 'Add a new material to the catalog.'
        }
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
            <button
              form="material-form"
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          </div>
        }
      >
        <form id="material-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Item ID</label>
              <input
                required
                disabled={!!editingItem}
                type="text"
                value={formData.item_id}
                onChange={e => setFormData({ ...formData, item_id: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800 min-h-[44px]"
                placeholder="e.g. ITM-001"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Master SKU</label>
              <input
                required
                disabled={!!editingItem}
                type="text"
                value={formData.master_sku}
                onChange={e => setFormData({ ...formData, master_sku: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400 text-slate-800 min-h-[44px]"
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
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 min-h-[44px]"
              placeholder="e.g. 18mm Plywood Board"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 min-h-[44px]"
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
                type="text"
                value={formData.unit}
                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 min-h-[44px]"
                placeholder="e.g. sft, nos, kg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Price per unit (₹)</label>
              <input
                required
                type="number"
                step="0.01"
                min="0"
                value={formData.rate}
                onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none font-semibold text-slate-900 min-h-[44px]"
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
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 min-h-[44px]"
              />
            </div>
          </div>

          {editingItem && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
              <strong>Note:</strong> Editing creates a new catalog entry with today's date, preserving quote history.
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
