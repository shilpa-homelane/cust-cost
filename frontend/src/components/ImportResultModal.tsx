import { CheckCircle, XCircle, SkipForward } from 'lucide-react';
import { Modal } from './ui/Modal';

export interface ImportResult {
  rows_added: number;
  rows_skipped: number;
  errors: { row: number; item_id?: string; reason: string }[];
}

interface ImportResultModalProps {
  result: ImportResult | null;
  onClose: () => void;
}

export function ImportResultModal({ result, onClose }: ImportResultModalProps) {
  const errorCount = result?.errors.length ?? 0;

  return (
    <Modal
      open={!!result}
      onClose={onClose}
      title="CSV Import Results"
      subtitle={
        result
          ? `${result.rows_added} added · ${result.rows_skipped} skipped · ${errorCount} error${errorCount !== 1 ? 's' : ''}`
          : ''
      }
      footer={
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors min-h-[44px]"
          >
            Done
          </button>
        </div>
      }
    >
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center justify-center bg-green-50 border border-green-100 rounded-xl p-3 text-center">
              <CheckCircle className="w-5 h-5 text-green-500 mb-1" />
              <span className="text-2xl font-bold text-green-700">{result.rows_added}</span>
              <span className="text-xs text-green-600 mt-0.5">Added</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <SkipForward className="w-5 h-5 text-amber-500 mb-1" />
              <span className="text-2xl font-bold text-amber-700">{result.rows_skipped}</span>
              <span className="text-xs text-amber-600 mt-0.5">Skipped</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <XCircle className="w-5 h-5 text-red-400 mb-1" />
              <span className="text-2xl font-bold text-red-600">{errorCount}</span>
              <span className="text-xs text-red-500 mt-0.5">Errors</span>
            </div>
          </div>
          {result.rows_skipped > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              Skipped rows already have an active entry in the catalog. The append-only history is preserved.
            </p>
          )}
          {errorCount > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Row errors</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {result.errors.map((err, i) => (
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
  );
}
