import { useState, useEffect } from 'react';
import { ArrowRight, Clock, CheckCircle } from 'lucide-react';

export function QuoteDashboard({ role, onLoadQuote }: { role: string, onLoadQuote: (quote: any) => void }) {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/quotes", {
        headers: { "X-User-Role": role }
      });
      const data = await res.json();
      setQuotes(data);
    } catch (err) {
      console.error("Failed to fetch quotes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, [role]);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      <div className="px-8 py-6 border-b border-gray-200 bg-white">
        <h2 className="text-2xl font-bold text-gray-800">My Quotes</h2>
        <p className="text-sm text-gray-500">Retrieve your saved drafts and final quotations.</p>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-500">Loading quotes...</div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 font-semibold text-gray-600">Quote ID</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Customer Name</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Brand</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Status</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 text-right">Total Price</th>
                  <th className="px-6 py-3 font-semibold text-gray-600">Date Created</th>
                  <th className="px-6 py-3 font-semibold text-gray-600 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-900 font-medium">{quote.quote_id}</td>
                    <td className="px-6 py-4 text-gray-800">{quote.customer_name}</td>
                    <td className="px-6 py-4 text-gray-600">{quote.brand}</td>
                    <td className="px-6 py-4">
                      {quote.status === 'Final' ? (
                        <span className="flex items-center space-x-1 text-green-700 bg-green-100 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
                          <CheckCircle className="w-3 h-3" />
                          <span>Final</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-1 text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full text-xs font-medium w-fit">
                          <Clock className="w-3 h-3" />
                          <span>Draft</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-bold text-right">₹{quote.total_price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(quote.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onLoadQuote(quote)}
                        className="flex items-center justify-center space-x-1 text-blue-600 hover:text-blue-800 font-medium px-3 py-1.5 rounded hover:bg-blue-50 transition-colors w-full"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {quotes.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      You haven't saved any quotes yet. 
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
