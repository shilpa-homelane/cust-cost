import { useState } from 'react';
import { StartScreen } from './StartScreen';
import { BOMEditor, type BOMRow } from './BOMEditor';
import { QuoteScreen } from './QuoteScreen';
import { useToast } from '../ui/Toast';
import type { VisibilitySettings } from '../../App';

type Step = 'start' | 'bom' | 'quote';

interface QuoteResult {
  description: string | null;
  items: Array<{
    item_id: string;
    name: string;
    unit: string;
    quantity: number;
    price_per_unit: number;
    line_total: number;
  }>;
  cogs: number;
  total_price: number;
}

interface DesignerFlowProps {
  role: string;
  visibilitySettings: VisibilitySettings;
}

export function DesignerFlow({ role, visibilitySettings }: DesignerFlowProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState<Step>('start');
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [bomRows, setBomRows] = useState<BOMRow[]>([]);
  const [description, setDescription] = useState<string | null>(null);
  const [quoteResult, setQuoteResult] = useState<QuoteResult | null>(null);

  const handleUpload = async (file: File) => {
    setIsExtracting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/v1/costing/extract-and-bom', {
        method: 'POST',
        headers: { 'X-User-Role': role },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Extraction failed');

      const rows: BOMRow[] = (data.items || []).map((item: any, i: number) => ({
        rowId: `extracted-${i}`,
        item_id: item.item_id || '',
        name: item.name || '',
        unit: item.unit || '',
        quantity: item.quantity || 1,
        price_per_unit: 0,
      }));

      setBomRows(rows);
      setDescription(data.description || null);
      setStep('bom');
    } catch (err: any) {
      showToast(err.message || 'Could not extract the file. Try building manually.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleBuildManually = () => {
    setBomRows([]);
    setDescription(null);
    setStep('bom');
  };

  const handleGenerate = async (rows: BOMRow[], desc: string) => {
    setIsGenerating(true);
    try {
      const payload = {
        description: desc || null,
        items: rows.map(r => ({
          item_id: r.item_id,
          name: r.name,
          unit: r.unit,
          quantity: r.quantity,
          price_per_unit_override: r.price_per_unit > 0 ? r.price_per_unit : null,
        })),
      };
      const res = await fetch('/api/v1/costing/flat-bom-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Quote generation failed');
      setQuoteResult(data);
      setStep('quote');
    } catch (err: any) {
      showToast(err.message || 'Failed to generate quote.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartNew = () => {
    setBomRows([]);
    setDescription(null);
    setQuoteResult(null);
    setStep('start');
  };

  if (step === 'start') {
    return (
      <StartScreen
        onUpload={handleUpload}
        onBuildManually={handleBuildManually}
        isExtracting={isExtracting}
      />
    );
  }

  if (step === 'bom') {
    return (
      <BOMEditor
        initialRows={bomRows}
        description={description}
        canEditPrice={visibilitySettings.designer_margin_access}
        role={role}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        onStartOver={handleStartNew}
      />
    );
  }

  if (step === 'quote' && quoteResult) {
    return (
      <QuoteScreen
        result={quoteResult}
        visibilitySettings={visibilitySettings}
        onStartNew={handleStartNew}
      />
    );
  }

  return null;
}
