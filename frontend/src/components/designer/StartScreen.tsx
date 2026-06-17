import { useRef, useState } from 'react';
import { Upload, PenLine, Sparkles, FileText } from 'lucide-react';

interface StartScreenProps {
  onUpload: (file: File) => void;
  onBuildManually: () => void;
  isExtracting: boolean;
}

export function StartScreen({ onUpload, onBuildManually, isExtracting }: StartScreenProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    if (f) onUpload(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 min-h-0">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-lg font-bold">CC</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Start a Quote</h1>
          <p className="text-sm text-slate-500 mt-1">Upload a design file or build your BOM manually</p>
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          disabled={isExtracting}
          className={`w-full min-h-[120px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 p-6 transition-colors text-center disabled:opacity-60 disabled:cursor-not-allowed ${
            dragOver
              ? 'border-indigo-500 bg-indigo-50'
              : 'border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/40'
          }`}
        >
          {isExtracting ? (
            <>
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Extracting with AI…</p>
                <p className="text-xs text-slate-500 mt-0.5">Analysing your design file</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Upload design file</p>
                <p className="text-xs text-slate-500 mt-0.5">WhatsApp photo, JPEG, PNG, or PDF</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                AI-assisted BOM extraction
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            disabled={isExtracting}
          />
        </button>

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-xs text-slate-400 font-medium">or</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <button
          onClick={onBuildManually}
          disabled={isExtracting}
          className="w-full min-h-[72px] bg-white border border-slate-200 rounded-2xl flex items-center gap-4 px-5 hover:border-slate-300 hover:bg-slate-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-left"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <PenLine className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">Build manually</p>
            <p className="text-xs text-slate-500 mt-0.5">Add materials from the catalog</p>
          </div>
        </button>

        <p className="text-center text-[11px] text-slate-400 pt-2 flex items-center justify-center gap-1">
          <FileText className="w-3 h-3" />
          Quotes are saved automatically for team analytics
        </p>
      </div>
    </div>
  );
}
