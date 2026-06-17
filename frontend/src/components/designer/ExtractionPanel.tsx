import { CheckCircle, AlertCircle } from 'lucide-react';
  import { SkeletonExtraction } from '../ui/Skeleton';
  import { Badge } from '../ui/Badge';

  interface ExtractionPanelProps {
    isExtracting: boolean;
    extraction: any;
    allFeatures: any[];
    onExtractionChange: (section: string, field: string, value: any) => void;
    onTogglePremiumFeature: (featureType: string, parameters: any) => void;
  }

  export function ExtractionPanel({
    isExtracting,
    extraction,
    allFeatures,
    onExtractionChange,
    onTogglePremiumFeature,
  }: ExtractionPanelProps) {
    if (isExtracting) {
      return (
        <div className="p-6">
          <SkeletonExtraction />
        </div>
      );
    }

    if (!extraction) return null;

    return (
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Extracted Specifications</h2>
          <Badge variant="success" icon={<CheckCircle className="w-3 h-3" />}>
            Extraction Complete
          </Badge>
        </div>

        {/* Alerts */}
        {extraction.document_classification?.num_units_described > 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Multiple Units Detected</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                This document contains multiple units. Quote generated for Unit 1 only. Generate separate quotes for remaining units.
              </p>
            </div>
          </div>
        )}

        {extraction.document_classification?.pdf_type === 'reference_image_only' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-red-800">Invalid Document Type</p>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                This looks like an inspiration photo. Dimensions can't be inferred. Please upload a structured sketch or detail sheet.
              </p>
            </div>
          </div>
        )}

        {/* AI Summary */}
        {extraction.human_readable_summary && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-indigo-800 mb-1">AI Reasoning Summary</p>
            <p className="text-xs text-indigo-700 leading-relaxed">{extraction.human_readable_summary}</p>
          </div>
        )}

        {/* Consistency warnings */}
        {extraction.consistency_warnings?.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Review Required</p>
              <ul className="list-disc list-inside text-xs text-amber-700 mt-1 space-y-0.5">
                {extraction.consistency_warnings.map((w: string, i: number) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Spec Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Archetype</label>
            <select
              value={extraction.archetype || ''}
              onChange={e => onExtractionChange('', 'archetype', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="wardrobe">Wardrobe</option>
              <option value="tall_storage_with_shutters">Tall Storage with Shutters</option>
              <option value="base_storage_with_shutters">Base Storage with Shutters</option>
              <option value="floating_unit">Floating Unit</option>
              <option value="open_shelving_frame">Open Shelving Frame</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Carcass Material</label>
            <input
              type="text"
              value={extraction.finishes?.carcass_material || ''}
              onChange={e => onExtractionChange('finishes', 'carcass_material', e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Height (mm)</label>
            <input
              type="number"
              value={extraction.dimensions?.height_mm || ''}
              onChange={e => onExtractionChange('dimensions', 'height_mm', parseFloat(e.target.value) || 0)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Shutters</label>
            <input
              type="number"
              value={extraction.counts?.shutters || 0}
              onChange={e => onExtractionChange('counts', 'shutters', parseInt(e.target.value) || 0)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Premium Features */}
        <div className="border-t border-slate-100 pt-5">
          <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-widest mb-3">Premium Features</h3>
          {allFeatures.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No cost models registered in feature library.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {allFeatures.map((f: any) => {
                const isChecked = (extraction.premium_features || []).some(
                  (pf: any) => pf.feature_type === f.feature_type
                );
                return (
                  <label
                    key={f.feature_type}
                    className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                      isChecked
                        ? 'border-indigo-300 bg-indigo-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() =>
                        onTogglePremiumFeature(
                          f.feature_type,
                          f.feature_type === 'curve'
                            ? { radius_mm: 50 }
                            : { area_sft: 5.0, running_length_mm: 1200 }
                        )
                      }
                      className="mt-0.5 h-4 w-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-slate-800">{f.name}</span>
                        {!f.is_calibrated && (
                          <Badge variant="experimental" icon={<AlertCircle className="w-2.5 h-2.5" />}>
                            +10% Buffer
                          </Badge>
                        )}
                      </div>
                      <span className="block text-[11px] text-slate-500 mt-0.5 truncate">{f.description}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }
  