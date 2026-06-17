import { useState, useEffect } from 'react';
import { ArrowRight, Clock, CheckCircle, FileText } from 'lucide-react';
import { Badge } from './ui/Badge';
import { SkeletonRow } from './ui/Skeleton';

export function QuoteDashboard({ role, onLoadQuote }: { role: string; onLoadQuote: (quote: any) => void }) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/quotes', {
        headers: { 'X-User-Role': role },
      });
      const data = await res.json();
      setQuotes(data);
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [role]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Page Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200 bg-white">
        <h1 className="text-base font-semibold text-slate-900">My Quotes</h1>
        <p className="text-xs text-slate-500 mt-0.5">Retrieve saved drafts and finalized quotations.</p>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {!loading && quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">No quotes saved yet</p>
              <p className="text-xs text-slate-400 mb-4">Head to the Designer Portal to generate and save your first quote.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Quote ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Brand</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-right">Total</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide text-center">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
                  : quotes.map(quote => (
                      <tr key={quote.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-xs text-slate-500">{quote.quote_id}</td>
                        <td className="px-5 py-3.5 text-slate-800 font-medium">{quote.customer_name}</td>
                        <td className="px-5 py-3.5 text-slate-500">{quote.brand}</td>
                        <td className="px-5 py-3.5">
                          {quote.status === 'Final' ? (
                            <Badge variant="final" icon={<CheckCircle className="w-3 h-3" />}>Final</Badge>
                          ) : (
                            <Badge variant="draft" icon={<Clock className="w-3 h-3" />}>Draft</Badge>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-900 font-semibold text-right">
                          ₹{quote.total_price.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {new Date(quote.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            onClick={() => onLoadQuote(quote)}
                            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-xs px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            Open
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
