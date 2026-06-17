import { AlertCircle, RotateCcw } from 'lucide-react';
import type { VisibilitySettings } from '../../App';

interface QuoteItem {
  item_id: string;
  name: string;
  unit: string;
  quantity: number;
  price_per_unit: number;
  line_total: number;
}

interface QuoteResult {
  description: string | null;
  items: QuoteItem[];
  cogs: number;
  total_price: number;
}

interface QuoteScreenProps {
  result: QuoteResult;
  visibilitySettings: VisibilitySettings;
  onStartNew: () => void;
}

const fmt = (val: number) =>
  '₹' + Number(val).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export function QuoteScreen({ result, visibilitySettings, onStartNew }: QuoteScreenProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

          {result.description && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Description</p>
              <p className="text-sm text-slate-700 leading-relaxed">{result.description}</p>
            </div>
          )}

          <div className="bg-indigo-600 rounded-2xl px-5 py-6 text-white text-center">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-70 mb-1">
              Total Estimated Price (incl. GST)
            </p>
            <p className="text-4xl font-bold tracking-tight">{fmt(result.total_price)}</p>
            <p className="text-xs opacity-50 mt-1">Indicative estimate • subject to change</p>
          </div>

          {visibilitySettings.show_bom_to_customer && result.items.length > 0 && (
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Bill of Materials</p>
              </div>
              <div className="divide-y divide-slate-100">
                {result.items.map((item, idx) => (
                  <div key={idx} className="px-4 py-3 flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 leading-tight">{item.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {item.quantity} {item.unit}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900 flex-shrink-0">{fmt(item.line_total)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {visibilitySettings.disclaimer_text && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 leading-relaxed">{visibilitySettings.disclaimer_text}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-slate-200 bg-white px-4 py-4">
        <button
          onClick={onStartNew}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors min-h-[44px]"
        >
          <RotateCcw className="w-4 h-4" />
          Start new quote
        </button>
      </div>
    </div>
  );
}
