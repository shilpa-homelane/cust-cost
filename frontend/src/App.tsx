import { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Eye, EyeOff, X } from 'lucide-react';
import { AdminDashboard } from './components/AdminDashboard';
import { QuoteDashboard } from './components/QuoteDashboard';
import { D2MFeatureLibrary } from './components/D2MFeatureLibrary';

export type Role = 'Designer' | 'Senior Designer' | 'D2M Analyst' | 'Procurement Analyst' | 'Admin';

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

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isQuoting, setIsQuoting] = useState(false);
  const [extraction, setExtraction] = useState<any>(null);
  const [quoteResult, setQuoteResult] = useState<QuoteResponse | null>(null);
  const [presentationMode, setPresentationMode] = useState(true);
  const [notes, setNotes] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [view, setView] = useState<'designer' | 'admin' | 'quotes' | 'features'>('designer');
  const [role, setRole] = useState<Role>('Designer');
  const [allFeatures, setAllFeatures] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllFeatures = async () => {
      try {
        const res = await fetch("/api/v1/features");
        const data = await res.json();
        if (res.ok) {
          setAllFeatures(data);
        }
      } catch (err) {
        console.error("Failed to load feature library", err);
      }
    };
    fetchAllFeatures();
  }, [view]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    
    if (selectedFile.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } else {
      setPreviewUrl(null);
    }
    
    setExtraction(null);
    setQuoteResult(null);
  };

  const handleExtractionChange = (section: string, field: string, value: any) => {
    setExtraction((prev: any) => {
      if (!prev) return prev;
      if (section) {
        return { ...prev, [section]: { ...prev[section], [field]: value } };
      } else {
        return { ...prev, [field]: value };
      }
    });
  };

  const togglePremiumFeature = (featureType: string, parameters: any) => {
    setExtraction((prev: any) => {
      if (!prev) return prev;
      const features = prev.premium_features || [];
      const exists = features.some((f: any) => f.feature_type === featureType);
      
      let newFeatures;
      if (exists) {
        newFeatures = features.filter((f: any) => f.feature_type !== featureType);
      } else {
        newFeatures = [...features, { feature_type: featureType, parameters, confidence: "high" }];
      }
      return { ...prev, premium_features: newFeatures };
    });
  };

  useEffect(() => {
    if (!extraction || isExtracting || extraction.document_classification?.pdf_type === "reference_image_only") {
      return;
    }
    const timeoutId = setTimeout(() => {
      handleGenerateQuote(extraction);
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [extraction]);

  const handleExtract = async () => {
    if (!file) return;
    setIsExtracting(true);
    setExtraction(null);
    setQuoteResult(null);

    const formData = new FormData();
    formData.append("file", file);
    if (notes.trim()) {
      formData.append("notes", notes.trim());
    }

    try {
      // Assuming FastAPI is running on localhost:8000
      const res = await fetch("/api/v1/extraction/extract-document", {
        method: "POST",
        headers: { "X-User-Role": role },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Extraction failed");
      }
      setExtraction(data);
    } catch (err: any) {
      console.error("Extraction failed", err);
      alert(err.message || "Failed to extract data. Is the backend running?");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerateQuote = async (dataToQuote: any = extraction) => {
    if (!dataToQuote) return;
    setIsQuoting(true);

    try {
      const res = await fetch("/api/v1/costing/generate-quote", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Role": role
        },
        body: JSON.stringify(dataToQuote),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Quote generation failed");
      }
      setQuoteResult(data);
    } catch (err: any) {
      console.error("Quoting failed", err);
      alert(err.message || "Failed to generate quote.");
    } finally {
      setIsQuoting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!extraction || !quoteResult) return;
    
    const customerName = prompt("Enter Customer Name or Project Reference:") || `Draft - ${new Date().toLocaleDateString()}`;
    
    try {
      const payload = {
        customer_name: customerName,
        brand: extraction.document_classification?.brand || "HomeLane",
        total_price: quoteResult.quote.total_price_incl_gst,
        extraction_data: extraction,
        costing_data: quoteResult
      };
      
      const res = await fetch("/api/v1/quotes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": role
        },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Failed to save draft");
      
      alert("Quote saved successfully!");
      setView('quotes');
    } catch (err) {
      console.error(err);
      alert("Could not save quote");
    }
  };

  const handleLoadQuote = (savedQuote: any) => {
    setExtraction(savedQuote.extraction_data);
    setQuoteResult(savedQuote.costing_data);
    setView('designer');
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-50 flex flex-col font-sans text-gray-900">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm z-20 relative">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
            <h1 className="text-xl font-semibold tracking-tight text-gray-800">Custom Costing</h1>
          </div>
          <nav className="hidden md:flex space-x-1">
            <button 
              onClick={() => setView('designer')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'designer' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Designer Portal
            </button>
            <button 
              onClick={() => setView('quotes')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'quotes' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              My Quotes
            </button>
            {(role === 'Procurement Analyst' || role === 'Admin') && (
              <button 
                onClick={() => setView('admin')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'admin' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Procurement Admin
              </button>
            )}
            {(role === 'D2M Analyst' || role === 'Senior Designer' || role === 'Admin') && (
              <button 
                onClick={() => setView('features')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'features' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Feature Library
              </button>
            )}
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <select 
            value={role}
            onChange={(e) => {
              const newRole = e.target.value as Role;
              setRole(newRole);
              if (newRole !== 'Procurement Analyst' && newRole !== 'Admin' && view === 'admin') {
                setView('designer');
              }
              if (newRole !== 'D2M Analyst' && newRole !== 'Senior Designer' && newRole !== 'Admin' && view === 'features') {
                setView('designer');
              }
            }}
            className="bg-gray-100 text-gray-700 text-sm font-medium rounded-lg px-3 py-2 border-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="Designer">Role: Designer</option>
            <option value="Senior Designer">Role: Senior Designer</option>
            <option value="D2M Analyst">Role: D2M Analyst</option>
            <option value="Procurement Analyst">Role: Procurement Analyst</option>
            <option value="Admin">Role: Admin</option>
          </select>

          {view === 'designer' && (
            <button 
              onClick={() => setPresentationMode(!presentationMode)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                presentationMode ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {presentationMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>Presentation Mode {presentationMode ? 'ON' : 'OFF'}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      {view === 'designer' ? (
        <main className="flex-1 flex overflow-hidden">
          
          {/* Left Pane: Document Viewer */}
          <section className="w-1/2 border-r border-gray-200 bg-gray-100 p-6 overflow-y-auto flex flex-col">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Source Document</h2>
          
          {!file ? (
            <div className="flex-1 border-2 border-dashed border-gray-300 rounded-xl bg-white flex flex-col items-center justify-center p-12 text-center transition-colors hover:border-blue-400">
              <Upload className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-600 font-medium mb-1">Drag and drop or browse to upload</p>
              <p className="text-sm text-gray-400 mb-6">Supports WhatsApp Photos, JPEGs, and PDFs</p>
              <label className="bg-blue-600 text-white px-6 py-2.5 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors shadow-sm font-medium">
                Select File
                <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} />
              </label>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                <p className="font-medium text-gray-800 truncate">{file.name}</p>
                <button onClick={() => { setFile(null); setPreviewUrl(null); setExtraction(null); setQuoteResult(null); }} className="text-sm text-red-500 hover:underline">Remove</button>
              </div>
              <div className="flex-1 p-4 flex flex-col overflow-y-auto">
                <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200 overflow-hidden relative cursor-pointer" onClick={() => previewUrl && setIsModalOpen(true)}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="max-h-full object-contain hover:opacity-90 transition-opacity" />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <FileText className="w-16 h-16 mb-2" />
                      <span>PDF Document</span>
                    </div>
                  )}
                  {previewUrl && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black bg-opacity-20 transition-opacity">
                      <span className="bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-sm">Click to enlarge</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Designer Notes / Customer Requirements</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                    rows={4}
                    placeholder="Enter any specific requirements, handwritten notes translations, or design preferences here..."
                  />
                </div>
                
                <button 
                  onClick={handleExtract}
                  disabled={isExtracting}
                  className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isExtracting ? 'Extracting Features...' : 'Extract & Analyze Document'}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Right Pane: Data & Quote */}
        <section className="w-1/2 bg-white flex flex-col overflow-hidden">
          <div className="p-6 flex-1 overflow-y-auto">
            {isExtracting ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                <p className="text-gray-600 font-medium animate-pulse">Extracting specifications with AI...</p>
              </div>
            ) : extraction ? (
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-800">Extracted Specifications</h2>
                  <span className="bg-green-100 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" /> Extraction Complete
                  </span>
                </div>
                {extraction.document_classification?.num_units_described > 1 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-yellow-800">Multiple Units Detected</h4>
                      <p className="text-sm text-yellow-700 mt-1">Note: This document contains multiple units. This quote has only been generated for Unit 1. Please generate separate quotes for the other units.</p>
                    </div>
                  </div>
                )}

                {extraction.document_classification?.pdf_type === "reference_image_only" && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-red-800">Invalid Document Type</h4>
                      <p className="text-sm text-red-700 mt-1">This looks like an inspiration photo. Dimensions and counts cannot be safely inferred for costing. Please upload a structured sketch or detail sheet.</p>
                    </div>
                  </div>
                )}

                {extraction.human_readable_summary && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-1">AI Reasoning Summary</h4>
                    <p className="text-sm text-blue-700 leading-relaxed">{extraction.human_readable_summary}</p>
                  </div>
                )}
                
                {extraction.consistency_warnings?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-amber-800">Review Required</h4>
                      <ul className="list-disc list-inside text-sm text-amber-700 mt-1 space-y-1">
                        {extraction.consistency_warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Archetype</label>
                    <select 
                      value={extraction.archetype || ''} 
                      onChange={(e) => handleExtractionChange('', 'archetype', e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="wardrobe">Wardrobe</option>
                      <option value="tall_storage_with_shutters">Tall Storage with Shutters</option>
                      <option value="base_storage_with_shutters">Base Storage with Shutters</option>
                      <option value="floating_unit">Floating Unit</option>
                      <option value="open_shelving_frame">Open Shelving Frame</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Carcass Material</label>
                    <input type="text" value={extraction.finishes.carcass_material || ''} onChange={(e) => handleExtractionChange('finishes', 'carcass_material', e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Height (mm)</label>
                    <input type="number" value={extraction.dimensions.height_mm || ''} onChange={(e) => handleExtractionChange('dimensions', 'height_mm', parseFloat(e.target.value) || 0)} className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Shutters</label>
                    <input type="number" value={extraction.counts.shutters || 0} onChange={(e) => handleExtractionChange('counts', 'shutters', parseInt(e.target.value) || 0)} className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>

                <div className="mt-6 border-t border-gray-100 pt-6">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-4">Premium Features</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {allFeatures.map((f: any) => {
                      const isChecked = (extraction.premium_features || []).some((pf: any) => pf.feature_type === f.feature_type);
                      return (
                        <label key={f.feature_type} className={`flex items-start space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                          isChecked ? 'border-indigo-500 bg-indigo-50/10' : 'border-gray-200 bg-white'
                        }`}>
                          <input 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={() => togglePremiumFeature(f.feature_type, f.feature_type === 'curve' ? { radius_mm: 50 } : { area_sft: 5.0, running_length_mm: 1200 })}
                            className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <span className="text-sm font-medium text-gray-800 truncate">{f.name}</span>
                              {!f.is_calibrated && (
                                <span className="text-[9px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.2 rounded flex items-center space-x-0.5 whitespace-nowrap">
                                  <AlertCircle className="w-2.5 h-2.5" />
                                  <span>+10% Buffer</span>
                                </span>
                              )}
                            </div>
                            <span className="block text-xs text-gray-500 truncate mt-0.5">{f.description}</span>
                          </div>
                        </label>
                      );
                    })}
                    {allFeatures.length === 0 && (
                      <p className="col-span-2 text-xs text-gray-400 italic">No cost models registered in feature library.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-12">
                <p className="text-gray-400 font-medium">Upload a design document to extract features and generate a quote.</p>
              </div>
            )}
          </div>

          {/* Sticky Footer for Quoting */}
          <div className="bg-gray-50 border-t border-gray-200 p-6 flex flex-col shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-10 max-h-[50%]">
            {quoteResult ? (
              <div className="w-full">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">Total Quote (incl. GST)</p>
                    <p className="text-3xl font-bold text-gray-900">{formatCurrency(quoteResult.quote.total_price_incl_gst)}</p>
                  </div>
                  <div className="flex space-x-3 ml-6">
                    <button onClick={handleSaveDraft} className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition-colors bg-gray-50">Save Draft</button>
                    <button onClick={() => window.print()} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm no-print">Export PDF</button>
                  </div>
                </div>

                {!presentationMode && quoteResult.cost_sheet && (
                  <div className="mt-4 border-t border-gray-300 pt-4 flex-1 overflow-hidden flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide mb-3 flex-shrink-0">Internal Costing Breakdown</h3>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-y-auto flex-1 min-h-0">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-2 font-medium text-gray-600">Item</th>
                            <th className="px-4 py-2 font-medium text-gray-600">Quantity</th>
                            <th className="px-4 py-2 font-medium text-gray-600 text-right">Unit Price</th>
                            <th className="px-4 py-2 font-medium text-gray-600 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {quoteResult.cost_sheet.costed_items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-800">{item.item_name}</td>
                              <td className="px-4 py-2 text-gray-600">{formatQuantity(item.quantity, item.unit)}</td>
                              <td className="px-4 py-2 text-gray-600 text-right">{formatCurrency(item.rate)}</td>
                              <td className="px-4 py-2 text-gray-800 font-medium text-right">{formatCurrency(item.line_subtotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t border-gray-200 font-semibold">
                          <tr className="border-b border-gray-100">
                            <td colSpan={3} className="px-4 py-2 text-right text-gray-600">COGS Base</td>
                            <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(quoteResult.cost_sheet.cogs_base)}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Misc Overhead (2.5%)</td>
                            <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(quoteResult.cost_sheet.miscellaneous_overhead)}</td>
                          </tr>
                          <tr className="border-b border-gray-100">
                            <td colSpan={3} className="px-4 py-2 text-right text-gray-600">Transportation (3%)</td>
                            <td className="px-4 py-2 text-right text-gray-900">{formatCurrency(quoteResult.cost_sheet.transportation_cost)}</td>
                          </tr>
                          <tr className="border-b border-gray-100 text-green-700">
                            <td colSpan={3} className="px-4 py-2 text-right">Vendor Margin (15%)</td>
                            <td className="px-4 py-2 text-right">+{formatCurrency(quoteResult.cost_sheet.vendor_margin)}</td>
                          </tr>
                          <tr className="border-b border-gray-100 text-green-700">
                            <td colSpan={3} className="px-4 py-2 text-right">Brand Margin ({quoteResult.quote.brand === 'HomeLane' ? '40%' : 'Custom'})</td>
                            <td className="px-4 py-2 text-right">+{formatCurrency(quoteResult.cost_sheet.brand_margin)}</td>
                          </tr>
                          {quoteResult.cost_sheet.confidence_buffer > 0 && (
                            <tr className="border-b border-gray-100 text-amber-700 font-bold bg-amber-50">
                              <td colSpan={3} className="px-4 py-2 text-right">Confidence Buffer (10%)</td>
                              <td className="px-4 py-2 text-right">+{formatCurrency(quoteResult.cost_sheet.confidence_buffer)}</td>
                            </tr>
                          )}
                          <tr className="border-b border-gray-200 bg-gray-100 font-semibold text-gray-900">
                            <td colSpan={3} className="px-4 py-2 text-right">Total Cost (Excl. GST)</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(quoteResult.cost_sheet.total_cost_excl_gst)}</td>
                          </tr>
                          <tr className="border-b border-gray-200 text-gray-600 font-semibold">
                            <td colSpan={3} className="px-4 py-2 text-right">GST (18%)</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(quoteResult.cost_sheet.gst_amount)}</td>
                          </tr>
                          <tr className="bg-blue-50 text-blue-950 font-bold border-t-2 border-blue-500 text-base">
                            <td colSpan={3} className="px-4 py-2 text-right">Final Customer Quote (Incl. GST)</td>
                            <td className="px-4 py-2 text-right">{formatCurrency(quoteResult.quote.total_price_incl_gst)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-full flex justify-end">
                <button 
                  onClick={handleGenerateQuote}
                  disabled={!extraction || isQuoting || extraction.document_classification?.pdf_type === "reference_image_only"}
                  className={`px-8 py-3 rounded-lg font-medium shadow-sm transition-colors ${
                    extraction && !isQuoting && extraction.document_classification?.pdf_type !== "reference_image_only" ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isQuoting ? 'Calculating...' : 'Generate Quote'}
                </button>
              </div>
            )}
          </div>
        </section>

        </main>
      ) : view === 'admin' ? (
        <AdminDashboard role={role} />
      ) : view === 'features' ? (
        <D2MFeatureLibrary role={role} />
      ) : (
        <QuoteDashboard role={role} onLoadQuote={handleLoadQuote} />
      )}

      {/* Full-screen Image Modal */}
      {isModalOpen && previewUrl && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4">
          <button 
            onClick={() => setIsModalOpen(false)}
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
                {extraction.unit_identification?.unit_name || 'Custom Modular Unit'}
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
                <span className="ml-2 text-xs font-medium text-gray-800 capitalize">{extraction.archetype?.replace(/_/g, ' ') || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500">Dimensions (WxDxH):</span>
                <span className="ml-2 text-xs font-medium text-gray-800">
                  {extraction.dimensions?.length_mm || '?'} x {extraction.dimensions?.carcass_depth_mm || '?'} x {extraction.dimensions?.height_mm || '?'} mm
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-xs text-gray-500">Finishes Summary:</span>
                <ul className="list-disc list-inside text-xs text-gray-700 mt-2 pl-2 space-y-1">
                  <li>Carcass Material: <span className="font-medium text-gray-800">{extraction.finishes?.carcass_material || 'Standard Board'}</span></li>
                  <li>Internal Finish: <span className="font-medium text-gray-800">{extraction.finishes?.internal_finish || 'Default White'}</span></li>
                  <li>Primary Shutter Finish: <span className="font-medium text-gray-800">{extraction.finishes?.shutter_finish_primary || 'Default Shutter'}</span></li>
                  {extraction.finishes?.shutter_finish_secondary && (
                    <li>Secondary Shutter Finish: <span className="font-medium text-gray-800">{extraction.finishes?.shutter_finish_secondary}</span></li>
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
                <span className="text-base font-bold text-gray-800">{extraction.counts?.shutters || 0}</span>
              </div>
              <div className="text-center p-2 border-r border-gray-200">
                <span className="block text-xxs text-gray-500 uppercase">Drawers</span>
                <span className="text-base font-bold text-gray-800">{extraction.counts?.drawers || 0}</span>
              </div>
              <div className="text-center p-2">
                <span className="block text-xxs text-gray-500 uppercase">Shelves (Fixed/Adj)</span>
                <span className="text-base font-bold text-gray-800">
                  {(extraction.counts?.fixed_shelves || 0) + (extraction.counts?.adjustable_shelves || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Premium Features List */}
          {extraction.premium_features && extraction.premium_features.length > 0 && (
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
              <p className="text-gray-800 font-medium mt-1">Archetype: {extraction.archetype}</p>
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
    </div>
  );
}

export default App;
