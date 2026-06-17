import { DollarSign, AlertCircle } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';
import type { VisibilitySettings } from '../../App';

interface QuoteResponse {
  quote: {
    unit_id: string;
    brand: string;
    unit_description: string;
    finishes_summary: string[];
    total_price_incl_gst: number;
  };
  cost_sheet?: {
    unit_id: string;
    cogs_base: number;
    miscellaneous_overhead: number;
    transportation_cost: number;
    vendor_margin: number;
    brand_margin: number;
    confidence_buffer: number;
    total_cost_excl_gst: number;
    gst_amount: number;
    total_price_incl_gst: number;
    rate_set_version: string;
    feature_library_version: string;
    costed_items: any[];
  };
}

const fmt = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '₹0.00';
  return '₹' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const fmtQty = (val: number | undefined | null, unit: string) => {
  if (val === undefined || val === null) return '0';
  const n = Number(val);
  return `${n % 1 === 0 ? n : n.toFixed(2)} ${unit}`;
};

interface QuotePanelProps {
  isQuoting: boolean;
  quoteResult: QuoteResponse | null;
  extraction: any;
  presentationMode: boolean;
  visibilitySettings: VisibilitySettings;
}

export function QuotePanel({
  isQuoting,
  quoteResult,
  extraction,
  presentationMode,
  visibilitySettings,
}: QuotePanelProps) {
  if (isQuoting) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    );
  }

  if (!quoteResult) {
    if (!extraction || extraction.document_classification?.pdf_type === 'reference_image_only') {
      return null;
    }
    return (
      <div className="px-6 py-4 flex justify-end">
        <div className="text-xs text-slate-400 italic">Quote will generate automatically after extraction…</div>
      </div>
    );
  }

  const { quote, cost_sheet } = quoteResult;

  return (
    <div className="space-y-4 p-6">
      {/* Price Hero */}
      <div className="bg-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 opacity-70" />
          <span className="text-xs font-semibold uppercase tracking-widest opacity-70">Total Estimated Price (incl. GST)</span>
        </div>
        <p className="text-3xl font-bold tracking-tight">{fmt(quote.total_price_incl_gst)}</p>
        <p className="text-xs opacity-60 mt-1">
          {quote.brand} · {quote.unit_id || 'Unit'}
        </p>
      </div>

      {/* Customer-facing itemized BOM (shown in presentation mode when policy allows) */}
      {presentationMode && visibilitySettings.show_bom_to_customer && cost_sheet && cost_sheet.costed_items?.length > 0 && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Materials Summary</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-slate-500">Item</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Qty</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cost_sheet.costed_items.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-800">{item.item_name}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-right">{fmtQty(item.quantity, item.unit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Internal Cost Breakdown */}
      {!presentationMode && visibilitySettings.designer_margin_access && cost_sheet && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-slate-100">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-widest">Internal Cost Breakdown</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold text-slate-500">Item</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500">Qty</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Unit Price</th>
                  <th className="px-4 py-2.5 font-semibold text-slate-500 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cost_sheet.costed_items.map((item: any, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-800">{item.item_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{fmtQty(item.quantity, item.unit)}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-right">{fmt(item.rate)}</td>
                    <td className="px-4 py-2.5 text-slate-800 font-medium text-right">{fmt(item.line_subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t border-slate-200 text-xs font-medium">
                <tr className="border-b border-slate-100">
                  <td colSpan={3} className="px-4 py-2 text-right text-slate-500">COGS Base</td>
                  <td className="px-4 py-2 text-right text-slate-800">{fmt(cost_sheet.cogs_base)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td colSpan={3} className="px-4 py-2 text-right text-slate-500">Misc Overhead (2.5%)</td>
                  <td className="px-4 py-2 text-right text-slate-800">{fmt(cost_sheet.miscellaneous_overhead)}</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td colSpan={3} className="px-4 py-2 text-right text-slate-500">Transportation (3%)</td>
                  <td className="px-4 py-2 text-right text-slate-800">{fmt(cost_sheet.transportation_cost)}</td>
                </tr>
                <tr className="border-b border-slate-100 text-green-700">
                  <td colSpan={3} className="px-4 py-2 text-right">Vendor Margin (15%)</td>
                  <td className="px-4 py-2 text-right">+{fmt(cost_sheet.vendor_margin)}</td>
                </tr>
                <tr className="border-b border-slate-100 text-green-700">
                  <td colSpan={3} className="px-4 py-2 text-right">
                    Brand Margin ({quote.brand === 'HomeLane' ? '40%' : 'Custom'})
                  </td>
                  <td className="px-4 py-2 text-right">+{fmt(cost_sheet.brand_margin)}</td>
                </tr>
                {cost_sheet.confidence_buffer > 0 && (
                  <tr className="border-b border-slate-100 text-amber-700 bg-amber-50 font-semibold">
                    <td colSpan={3} className="px-4 py-2 text-right">Confidence Buffer (10%)</td>
                    <td className="px-4 py-2 text-right">+{fmt(cost_sheet.confidence_buffer)}</td>
                  </tr>
                )}
                <tr className="border-b border-slate-200 bg-slate-100 font-semibold text-slate-900">
                  <td colSpan={3} className="px-4 py-2 text-right">Total Cost (Excl. GST)</td>
                  <td className="px-4 py-2 text-right">{fmt(cost_sheet.total_cost_excl_gst)}</td>
                </tr>
                <tr className="border-b border-slate-200 text-slate-600">
                  <td colSpan={3} className="px-4 py-2 text-right">GST (18%)</td>
                  <td className="px-4 py-2 text-right">{fmt(cost_sheet.gst_amount)}</td>
                </tr>
                <tr className="bg-indigo-50 text-indigo-900 font-bold border-t-2 border-indigo-400">
                  <td colSpan={3} className="px-4 py-2 text-right">Final Customer Quote (Incl. GST)</td>
                  <td className="px-4 py-2 text-right">{fmt(quote.total_price_incl_gst)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Disclaimer — always visible at the bottom */}
      {visibilitySettings.disclaimer_text && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">{visibilitySettings.disclaimer_text}</p>
        </div>
      )}
    </div>
  );
}
