import { useState, useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { DocumentUploader } from './DocumentUploader';
import { ExtractionPanel } from './ExtractionPanel';
import { QuotePanel } from './QuotePanel';
import { useToast } from '../ui/Toast';
import type { Role } from '../../App';

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

const formatCurrency = (val: number | undefined | null) => {
  if (val === undefined || val === null) return '₹0.00';
  return '₹' + Number(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatQuantity = (val: number | undefined | null, unit: string) => {
  if (val === undefined || val === null) return '0';
  const num = Number(val);
  const formatted = num % 1 === 0 ? num.toString() : num.toFixed(2);
  return `${formatted} ${unit}`;
};

interface DesignerViewProps {
  role: Role;
  presentationMode: boolean;
  loadedQuote: any;
}

const DEFAULT_SPLIT = 60;

export function DesignerView({ role, presentationMode, loadedQuote }: DesignerViewProps) {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [extraction, setExtraction] = useState<any>(null);
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [splitPct, setSplitPct] = useState(DEFAULT_SPLIT);
  const rightPaneRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !rightPaneRef.current) return;
      const rect = rightPaneRef.current.getBoundingClientRect();
      const offsetY = ev.clientY - rect.top;
      const pct = Math.min(Math.max((offsetY / rect.height) * 100, 20), 80);
      setSplitPct(pct);
    };

    const onMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  const handleDividerDoubleClick = useCallback(() => {
    setSplitPct(DEFAULT_SPLIT);
  }, []);

  useEffect(() => {
    if (!loadedQuote) return;
    setExtraction(loadedQuote.extraction_data ?? null);
    setQuoteResult(loadedQuote.costing_data ?? null);
    setFile(null);
    setPreviewUrl(null);
    setNotes('');
  }, [loadedQuote]);

  useEffect(() => {
    fetch('/api/v1/features')
      .then(r => r.json())
      .then(data => setAllFeatures(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to load features', err));
  }, []);

  useEffect(() => {
    if (!extraction || isExtracting || extraction.document_classification?.pdf_type === 'reference_image_only') return;
    const id = setTimeout(() => handleGenerateQuote(extraction), 500);
    return () => clearTimeout(id);
  }, [extraction]);

  const handleFileChange = (f: File | null, url: string | null) => {
    setFile(f);
    setPreviewUrl(url);
    setExtraction(null);
    setQuoteResult(null);
  };

  const handleExtractionChange = (section: string, field: string, value: any) => {
    setExtraction((prev: any) => {
      if (!prev) return prev;
      if (section) return { ...prev, [section]: { ...prev[section], [field]: value } };
      return { ...prev, [field]: value };
    });
  };

  const togglePremiumFeature = (featureType: string, parameters: any) => {
    setExtraction((prev: any) => {
      if (!prev) return prev;
      const features = prev.premium_features || [];
      const exists = features.some((f: any) => f.feature_type === featureType);
      const newFeatures = exists
        ? features.filter((f: any) => f.feature_type !== featureType)
        : [...features, { feature_type: featureType, parameters, confidence: 'high' }];
      return { ...prev, premium_features: newFeatures };
    });
  };

  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setExtraction(null);
    setQuoteResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (notes.trim()) formData.append('notes', notes.trim());

    try {
      const res = await fetch('/api/v1/extraction/extract-document', {
        method: 'POST',
        headers: { 'X-User-Role': role },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Extraction failed');
      setExtraction(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to extract data. Is the backend running?', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateQuote = async (dataToQuote: any = extraction) => {
    if (!dataToQuote) return;
    setIsQuoting(true);
    try {
      const res = await fetch('/api/v1/costing/generate-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
        body: JSON.stringify(dataToQuote),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Quote generation failed');
      setQuoteResult(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to generate quote.', 'error');
    } finally {
      setIsQuoting(false);
    }
  };

  const handleSaveDraft = async (customerName: string) => {
    if (!extraction || !quoteResult) return;
    const payload = {
      customer_name: customerName,
      brand: extraction.document_classification?.brand || 'HomeLane',
      total_price: quoteResult.quote.total_price_incl_gst,
      extraction_data: extraction,
      costing_data: quoteResult,
    };
    const res = await fetch('/api/v1/quotes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to save draft');
  };

  return (
    <>
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane */}
        <div className="w-1/2 border-r border-slate-200 flex flex-col overflow-hidden">
          <DocumentUploader
            file={file}
            previewUrl={previewUrl}
            notes={notes}
            isExtracting={isExtracting}
            onFileChange={handleFileChange}
            onNotesChange={setNotes}
            onExtract={handleExtract}
            onPreviewClick={() => setIsImageModalOpen(true)}
          />
        </div>

        {/* Right Pane */}
        <div ref={rightPaneRef} className="w-1/2 bg-white flex flex-col overflow-hidden">
          {/* Specs Section — resizable top portion */}
          <div className="min-h-0 flex flex-col overflow-hidden" style={{ height: `${splitPct}%` }}>
            <div className="flex-shrink-0 px-6 py-3 border-b border-slate-100 bg-white">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Extracted Specifications</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <ExtractionPanel
                isExtracting={isExtracting}
                extraction={extraction}
                allFeatures={allFeatures}
                onExtractionChange={handleExtractionChange}
                onTogglePremiumFeature={togglePremiumFeature}
              />
            </div>
          </div>

          {/* Drag Divider */}
          <div
            className="flex-shrink-0 h-1.5 bg-slate-200 hover:bg-indigo-400 active:bg-indigo-500 cursor-row-resize flex items-center justify-center group transition-colors duration-150 select-none"
            onMouseDown={handleDividerMouseDown}
            onDoubleClick={handleDividerDoubleClick}
            title="Drag to resize · Double-click to reset"
            aria-label="Resize divider between Specs and Quote panels"
            role="separator"
            aria-orientation="horizontal"
          >
            <div className="w-8 h-0.5 rounded-full bg-slate-400 group-hover:bg-white group-active:bg-white transition-colors duration-150" />
          </div>

          {/* Quote Section — resizable bottom portion */}
          <div className="min-h-0 flex flex-col overflow-hidden bg-slate-50" style={{ height: `${100 - splitPct}%` }}>
            <div className="flex-shrink-0 px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Quote</h2>
              {quoteResult && (
                <span className="text-xs font-semibold text-slate-400">
                  {formatCurrency(quoteResult.quote.total_price_incl_gst)}
                  <span className="font-normal ml-1">incl. GST</span>
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <QuotePanel
                isQuoting={isQuoting}
                quoteResult={quoteResult}
                extraction={extraction}
                presentationMode={presentationMode}
                onSaveDraft={handleSaveDraft}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen Image Modal */}
      {isImageModalOpen && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 no-print">
          <button
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 p-2 bg-black bg-opacity-50 rounded-full"
          >
            <X className="w-8 h-8" />
          </button>
          <img src={previewUrl} alt="Full Screen Preview" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Customer-facing Quote PDF (Only printed, hidden on screen) */}
      {quoteResult && (
        <div className={`printable-area p-8 max-w-4xl mx-auto bg-white text-gray-800 ${presentationMode ? 'print:block' : 'hidden'}`} style={{ display: 'none' }}>
          {/* Brand Header */}
          <div className="flex justify-between items-start border-b-2 border-gray-200 pb-6 mb-6">
            <div>
              {quoteResult.quote.brand === "HomeLane" ? (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-orange-600 tracking-tight">HomeLane.</span>
                  <span className="text-xs uppercase bg-orange-100 text-orange-700 font-semibold px-2 py-0.5 rounded">Custom Estimate</span>
                </div>
              ) : quoteResult.quote.brand === "DesignCafe" ? (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-teal-700 tracking-tight">Design Cafe</span>
                  <span className="text-xs uppercase bg-teal-100 text-teal-700 font-semibold px-2 py-0.5 rounded">Custom Estimate</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-bold text-indigo-600 tracking-tight">Custom Costing</span>
                  <span className="text-xs uppercase bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded">Estimate</span>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">Interior Design Cost Estimation Sheet</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-900 uppercase">Estimated Quote</h2>
              <p className="text-xs text-gray-500 mt-1">ID: {quoteResult.quote.unit_id || 'N/A'}</p>
            </div>
          </div>

          {/* Project & Client Info Grid */}
          <div className="grid grid-cols-2 gap-6 mb-8 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Project details</p>
              <h3 className="text-sm font-semibold text-gray-800 mt-1">
                {extraction?.unit_identification?.unit_name || 'Custom Modular Unit'}
              </h3>
              <p className="text-xs text-gray-600 mt-1">Brand: {quoteResult.quote.brand}</p>
              <p className="text-xs text-gray-600">Generated: {new Date().toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase">Prepared by</p>
              <p className="text-xs text-gray-800 font-medium mt-1">Designer Portal ({role})</p>
              <p className="text-xs text-gray-600">SSO Role Identifier: {role}</p>
            </div>
          </div>

          {/* Core Specifications */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Unit Specifications</h3>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <span className="text-xs text-gray-500">Archetype:</span>
                <span className="ml-2 text-xs font-medium text-gray-800 capitalize">{extraction?.archetype?.replace(/_/g, ' ') || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500">Dimensions (WxDxH):</span>
                <span className="ml-2 text-xs font-medium text-gray-800">
                  {extraction?.dimensions?.length_mm || '?'} x {extraction?.dimensions?.carcass_depth_mm || '?'} x {extraction?.dimensions?.height_mm || '?'} mm
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500">Finishes Summary:</span>
                <ul className="list-disc list-inside text-xs text-gray-700 mt-2 pl-2 space-y-1">
                  <li>Carcass Material: <span className="font-medium text-gray-800">{extraction?.finishes?.carcass_material || 'Standard Board'}</span></li>
                  <li>Internal Finish: <span className="font-medium text-gray-800">{extraction?.finishes?.internal_finish || 'Default White'}</span></li>
                  <li>Primary Shutter Finish: <span className="font-medium text-gray-800">{extraction?.finishes?.shutter_finish_primary || 'Default Shutter'}</span></li>
                  {extraction?.finishes?.shutter_finish_secondary && (
                    <li>Secondary Shutter Finish: <span className="font-medium text-gray-800">{extraction.finishes.shutter_finish_secondary}</span></li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Component Summary */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Components & Counts</h3>
            <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
              <div className="text-center p-2 border-r border-gray-200">
                <span className="block text-xxs text-gray-500 uppercase">Shutters</span>
                <span className="text-base font-bold text-gray-800">{extraction?.counts?.shutters || 0}</span>
              </div>
              <div className="text-center p-2 border-r border-gray-200">
                <span className="block text-xxs text-gray-500 uppercase">Drawers</span>
                <span className="text-base font-bold text-gray-800">{extraction?.counts?.drawers || 0}</span>
              </div>
              <div className="text-center p-2">
                <span className="block text-xxs text-gray-500 uppercase">Shelves (Fixed/Adj)</span>
                <span className="text-base font-bold text-gray-800">
                  {(extraction?.counts?.fixed_shelves || 0) + (extraction?.counts?.adjustable_shelves || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Premium Features List */}
          {extraction?.premium_features && extraction.premium_features.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider border-b border-gray-200 pb-2 mb-4">Premium / Custom Detailing</h3>
              <ul className="divide-y divide-gray-100">
                {extraction.premium_features.map((feature: any, index: number) => (
                  <li key={index} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-gray-800 capitalize">
                        {(feature.feature_type || feature.feature || '').replace(/_/g, ' ')}
                      </span>
                      <span className="ml-2 text-xxs text-gray-500">
                        {JSON.stringify(feature.parameters || {})}
                      </span>
                    </div>
                    <span className="text-xxs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded font-medium">Included</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Pricing Highlight Box */}
          <div className={`p-6 rounded-xl border mb-8 text-center ${
            quoteResult.quote.brand === "HomeLane" ? "bg-orange-50 border-orange-200" :
            quoteResult.quote.brand === "DesignCafe" ? "bg-teal-50 border-teal-200" :
            "bg-indigo-50 border-indigo-200"
          }`}>
            <p className="text-xs font-medium text-gray-600 mb-1">Total Estimated Price (incl. GST)</p>
            <p className="text-3xl font-extrabold text-gray-900">{formatCurrency(quoteResult.quote.total_price_incl_gst)}</p>
            <p className="text-xxs text-gray-500 mt-2">Inclusive of GST @ 18%, materials, labor, overheads, transportation, and delivery.</p>
          </div>

          {/* Fine Print / Footer */}
          <div className="border-t border-gray-200 pt-6 text-center text-xxs text-gray-400">
            <p className="mb-1">This is an automated modular furniture cost estimation generated by the Custom Costing Tool.</p>
            <p className="mb-1">Estimate valid for 30 days. Final pricing is subject to technical verification by the D2M site team.</p>
            <p>© {new Date().getFullYear()} {quoteResult.quote.brand || 'HomeLane/DesignCafe'}. All rights reserved.</p>
          </div>
        </div>
      )}

      {/* Internal Cost Sheet PDF (Only printed, hidden on screen) */}
      {quoteResult && quoteResult.cost_sheet && (
        <div className={`printable-area p-8 max-w-4xl mx-auto bg-white text-gray-800 ${!presentationMode ? 'print:block' : 'hidden'}`} style={{ display: 'none' }}>
          <div className="flex justify-between items-start border-b-2 border-red-200 pb-6 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-red-700 tracking-tight">INTERNAL COST SHEET</span>
                <span className="text-xs uppercase bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded">CONFIDENTIAL</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Full Bill of Materials (BOM) & Margin Breakdown</p>
            </div>
            <div className="text-right">
              <h2 className="text-lg font-bold text-gray-900 uppercase">Cost Audit Sheet</h2>
              <p className="text-xs text-gray-500 mt-1">ID: {quoteResult.cost_sheet.unit_id || 'N/A'}</p>
            </div>
          </div>

          {/* Audit Details */}
          <div className="grid grid-cols-3 gap-6 mb-8 bg-gray-50 p-4 rounded-lg border border-gray-100 text-xxs">
            <div>
              <p className="font-semibold text-gray-500 uppercase">Unit specifications</p>
              <p className="text-gray-800 font-medium mt-1">Archetype: {extraction?.archetype}</p>
              <p className="text-gray-600">Brand: {quoteResult.quote.brand}</p>
              <p className="text-gray-600">Timestamp: {new Date().toLocaleString()}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 uppercase">System Versions</p>
              <p className="text-gray-800 font-medium mt-1">Rate Set: {quoteResult.cost_sheet.rate_set_version || 'v1.0'}</p>
              <p className="text-gray-600">Feature Lib: {quoteResult.cost_sheet.feature_library_version || 'v1.0'}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-500 uppercase">Audited By</p>
              <p className="text-gray-800 font-medium mt-1">Role: {role}</p>
              <p className="text-gray-600">Designer: SSO Identifier</p>
            </div>
          </div>

          {/* Detailed Costed BOM */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider mb-3">Costed Bill of Materials (BOM)</h3>
            <table className="w-full text-xxs text-left border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="p-2 border-r border-gray-200">Category</th>
                  <th className="p-2 border-r border-gray-200">Item Name</th>
                  <th className="p-2 border-r border-gray-200 text-center">SKU</th>
                  <th className="p-2 border-r border-gray-200 text-right">Quantity</th>
                  <th className="p-2 border-r border-gray-200 text-right">Wastage %</th>
                  <th className="p-2 border-r border-gray-200 text-right">Unit Rate</th>
                  <th className="p-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {quoteResult.cost_sheet.costed_items && quoteResult.cost_sheet.costed_items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-2 border-r border-gray-200 font-medium capitalize">{item.category}</td>
                    <td className="p-2 border-r border-gray-200 text-gray-600">{item.item_name}</td>
                    <td className="p-2 border-r border-gray-200 text-center font-mono text-gray-500">{item.master_sku}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{formatQuantity(item.quantity, item.unit)}</td>
                    <td className="p-2 border-r border-gray-200 text-right">{item.wastage_pct}%</td>
                    <td className="p-2 border-r border-gray-200 text-right">{formatCurrency(item.rate)}</td>
                    <td className="p-2 text-right font-medium">{formatCurrency(item.line_subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Margins & Adjustments Summary */}
          <div className="mb-8 flex justify-end">
            <table className="w-1/2 text-xxs border border-gray-200">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="p-2 font-medium bg-gray-50">Base Material & Labor COGS:</td>
                  <td className="p-2 text-right font-semibold">{formatCurrency(quoteResult.cost_sheet.cogs_base)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-2 font-medium bg-gray-50">Misc Overhead (2.5%):</td>
                  <td className="p-2 text-right">{formatCurrency(quoteResult.cost_sheet.miscellaneous_overhead)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-2 font-medium bg-gray-50">Transportation (3%):</td>
                  <td className="p-2 text-right">{formatCurrency(quoteResult.cost_sheet.transportation_cost)}</td>
                </tr>
                <tr className="border-b border-gray-100 text-green-700 font-medium">
                  <td className="p-2 font-medium bg-gray-50">Vendor Margin (15%):</td>
                  <td className="p-2 text-right">+{formatCurrency(quoteResult.cost_sheet.vendor_margin)}</td>
                </tr>
                <tr className="border-b border-gray-100 text-green-700 font-medium">
                  <td className="p-2 font-medium bg-gray-50">Brand Margin ({quoteResult.quote.brand === 'HomeLane' ? '40%' : 'Custom'}):</td>
                  <td className="p-2 text-right">+{formatCurrency(quoteResult.cost_sheet.brand_margin)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="p-2 font-medium bg-gray-50">Confidence Buffer:</td>
                  <td className="p-2 text-right">{formatCurrency(quoteResult.cost_sheet.confidence_buffer)}</td>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-100 font-semibold text-gray-900">
                  <td className="p-2">Total Cost (Excl. GST):</td>
                  <td className="p-2 text-right">{formatCurrency(quoteResult.cost_sheet.total_cost_excl_gst)}</td>
                </tr>
                <tr className="border-b border-gray-200 text-gray-600">
                  <td className="p-2">GST (18%):</td>
                  <td className="p-2 text-right">{formatCurrency(quoteResult.cost_sheet.gst_amount)}</td>
                </tr>
                <tr className="bg-red-50 text-red-950 font-bold border-t-2 border-red-700 text-xs">
                  <td className="p-2">Final Customer Quote:</td>
                  <td className="p-2 text-right text-xs">{formatCurrency(quoteResult.quote.total_price_incl_gst)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Footer warning */}
          <div className="border-t border-red-300 pt-6 text-center text-xxs text-red-600 font-semibold uppercase tracking-wider">
            <p>Confidential Internal Use Only. Do not distribute or display to customers.</p>
          </div>
        </div>
      )}
    </>
  );
}
