import { useRef } from 'react';
import { Upload, FileText, X, Sparkles } from 'lucide-react';

interface DocumentUploaderProps {
  file: File | null;
  previewUrl: string | null;
  notes: string;
  isExtracting: boolean;
  onFileChange: (file: File | null, previewUrl: string | null) => void;
  onNotesChange: (notes: string) => void;
  onExtract: () => void;
  onPreviewClick: () => void;
}

export function DocumentUploader({
  file,
  previewUrl,
  notes,
  isExtracting,
  onFileChange,
  onNotesChange,
  onExtract,
  onPreviewClick,
}: DocumentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
    onFileChange(f, url);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (!f) return;
    const url = f.type.startsWith('image/') ? URL.createObjectURL(f) : null;
    onFileChange(f, url);
  };

  const handleRemove = () => {
    onFileChange(null, null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="w-full flex flex-col">
      <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-white">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Source Document</h2>
      </div>

      <div className="p-5 bg-slate-50 flex flex-col gap-4">
        {!file ? (
          <div
            className="flex-1 border-2 border-dashed border-slate-300 rounded-2xl bg-white flex flex-col items-center justify-center p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors cursor-pointer group min-h-[300px]"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
          >
            <div className="w-14 h-14 bg-slate-100 group-hover:bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 transition-colors">
              <Upload className="w-7 h-7 text-slate-400 group-hover:text-indigo-500 transition-colors" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">Drop your design document here</p>
            <p className="text-xs text-slate-400 mb-5">WhatsApp photos, JPEGs, PNGs, and PDFs</p>
            <label className="bg-indigo-600 text-white px-5 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm">
              Browse Files
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInput}
              />
            </label>
          </div>
        ) : (
          <div className="flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700 truncate">{file.name}</span>
              </div>
              <button
                onClick={handleRemove}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium ml-3 flex-shrink-0 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </button>
            </div>

            <div className="p-4 flex flex-col gap-4">
              <div
                className="min-h-[200px] flex items-center justify-center bg-slate-100 rounded-xl border border-slate-200 overflow-hidden relative cursor-pointer group"
                onClick={previewUrl ? onPreviewClick : undefined}
              >
                {previewUrl ? (
                  <>
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity rounded-xl">
                      <span className="bg-black/60 text-white px-3 py-1.5 rounded-full text-xs font-medium">
                        Click to enlarge
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-slate-400 py-8">
                    <FileText className="w-12 h-12 mb-2" />
                    <span className="text-sm">PDF Document</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Designer Notes
                </label>
                <textarea
                  value={notes}
                  onChange={e => onNotesChange(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none bg-slate-50 placeholder:text-slate-400 text-slate-700"
                  rows={3}
                  placeholder="Specific requirements, handwritten notes, or design preferences..."
                />
              </div>

              <button
                onClick={onExtract}
                disabled={isExtracting}
                className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm text-sm"
              >
                <Sparkles className="w-4 h-4" />
                {isExtracting ? 'Extracting with AI…' : 'Extract & Analyze Document'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
