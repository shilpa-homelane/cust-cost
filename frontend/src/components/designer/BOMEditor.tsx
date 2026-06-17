import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '../ui/Toast';

interface CatalogItem {
  id: number;
  item_id: string;
  name: string;
  unit: string;
  rate: number;
  category: string;
}

export interface BOMRow {
  rowId: string;
  item_id: string;
  name: string;
  unit: string;
  quantity: number;
  price_per_unit: number;
}

interface BOMEditorProps {
  initialRows: BOMRow[];
  description: string | null;
  canEditPrice: boolean;
  role: string;
  onGenerate: (rows: BOMRow[], description: string) => void;
  isGenerating: boolean;
  onStartOver: () => void;
}

let rowCounter = 0;
function newRowId() {
  return `row-${++rowCounter}`;
}

function emptyRow(): BOMRow {
  return {
    rowId: newRowId(),
    item_id: '',
    name: '',
    unit: '',
    quantity: 1,
    price_per_unit: 0,
  };
}

export function BOMEditor({
  initialRows,
  description: initialDescription,
  canEditPrice,
  role,
  onGenerate,
  isGenerating,
  onStartOver,
}: BOMEditorProps) {
  const { showToast } = useToast();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [rows, setRows] = useState<BOMRow[]>(() =>
    initialRows.length > 0 ? initialRows : [emptyRow()]
  );
  const [description, setDescription] = useState(initialDescription || '');

  useEffect(() => {
    fetch('/api/v1/admin/rates?active_only=true', {
      headers: { 'X-User-Role': role },
    })
      .then(r => r.json())
      .then((data: CatalogItem[]) => {
        if (!Array.isArray(data)) return;
        setCatalog(data);
        const byItemId: Record<string, CatalogItem> = {};
        data.forEach(c => { byItemId[c.item_id] = c; });
        setRows(prev =>
          prev.map(r => {
            if (r.item_id && r.price_per_unit === 0 && byItemId[r.item_id]) {
              const cat = byItemId[r.item_id];
              return { ...r, unit: cat.unit, price_per_unit: cat.rate };
            }
            return r;
          })
        );
      })
      .catch(() => {});
  }, [role]);

  const updateRow = (rowId: string, patch: Partial<BOMRow>) => {
    setRows(prev => prev.map(r => (r.rowId === rowId ? { ...r, ...patch } : r)));
  };

  const handleMaterialSelect = (rowId: string, item_id: string) => {
    const cat = catalog.find(c => c.item_id === item_id);
    if (cat) {
      updateRow(rowId, {
        item_id: cat.item_id,
        name: cat.name,
        unit: cat.unit,
        price_per_unit: cat.rate,
      });
    }
  };

  const addRow = () => {
    setRows(prev => [...prev, emptyRow()]);
  };

  const removeRow = (rowId: string) => {
    setRows(prev => {
      if (prev.length === 1) return [emptyRow()];
      return prev.filter(r => r.rowId !== rowId);
    });
  };

  const handleGenerate = () => {
    if (rows.length === 0 || rows.every(r => !r.item_id)) {
      showToast('Add at least one material to generate a quote.', 'error');
      return;
    }
    const unresolved = rows.filter(r => !r.item_id || r.quantity <= 0);
    if (unresolved.length > 0) {
      showToast(
        `${unresolved.length} row${unresolved.length > 1 ? 's' : ''} ${unresolved.length > 1 ? 'are' : 'is'} missing a material or valid quantity. Please resolve before generating.`,
        'error',
      );
      return;
    }
    onGenerate(rows, description);
  };

  const subtotal = rows.reduce((sum, r) => sum + r.quantity * r.price_per_unit, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

          <div className="flex items-center justify-between">
            <button
              onClick={onStartOver}
              className="text-xs text-slate-500 hover:text-indigo-600 font-medium transition-colors min-h-[44px] px-1"
            >
              ← Start over
            </button>
            <p className="text-xs text-slate-400">Edit your bill of materials</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. 3-door wardrobe with soft-close hinges"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 placeholder:text-slate-400 min-h-[44px]"
            />
          </div>

          <div className="space-y-2">
            {rows.map(row => (
              <div
                key={row.rowId}
                className={`border rounded-2xl p-3 space-y-2 shadow-sm ${!row.item_id ? 'border-amber-300 bg-amber-50/40' : 'border-slate-200 bg-white'}`}
              >
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Material
                    </label>
                    <select
                      value={row.item_id}
                      onChange={e => handleMaterialSelect(row.rowId, e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 min-h-[44px]"
                    >
                      <option value="">Select material…</option>
                      {catalog.map(c => (
                        <option key={c.item_id} value={c.item_id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => removeRow(row.rowId)}
                    className="self-end p-2.5 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label="Remove row"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Unit
                    </label>
                    <select
                      value={row.unit}
                      onChange={e => updateRow(row.rowId, { unit: e.target.value })}
                      disabled={!row.item_id}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-700 min-h-[44px] disabled:text-slate-400 disabled:cursor-default"
                    >
                      {row.unit
                        ? <option value={row.unit}>{row.unit}</option>
                        : <option value="">—</option>
                      }
                      {Array.from(new Set(catalog.map(c => c.unit)))
                        .filter(u => u !== row.unit)
                        .map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))
                      }
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Qty
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.quantity}
                      onChange={e =>
                        updateRow(row.rowId, { quantity: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 min-h-[44px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                      Price/unit
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={row.price_per_unit}
                      readOnly={!canEditPrice}
                      onChange={e =>
                        canEditPrice &&
                        updateRow(row.rowId, { price_per_unit: parseFloat(e.target.value) || 0 })
                      }
                      className={`w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none text-slate-800 min-h-[44px] ${
                        canEditPrice
                          ? 'bg-white focus:ring-2 focus:ring-indigo-500'
                          : 'bg-slate-50 text-slate-500 cursor-default'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addRow}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-colors min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            Add material
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 bg-white border-t border-slate-200 px-4 py-4 space-y-3">
        {subtotal > 0 && (
          <p className="text-xs text-slate-400 text-center">
            Catalog subtotal ₹{subtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })} · final price includes markups &amp; GST
          </p>
        )}
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3.5 rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed min-h-[52px]"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating quote…
            </>
          ) : (
            'Generate Quote'
          )}
        </button>
      </div>
    </div>
  );
}
