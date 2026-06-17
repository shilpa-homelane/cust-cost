import React, { useState, useEffect } from 'react';
import { Save, Shield } from 'lucide-react';
import { useToast } from './ui/Toast';

interface VisibilitySettings {
  show_bom_to_customer: boolean;
  designer_margin_access: boolean;
  disclaimer_text: string;
}

const DEFAULT_SETTINGS: VisibilitySettings = {
  show_bom_to_customer: true,
  designer_margin_access: false,
  disclaimer_text:
    'This estimate does not constitute a promise or commitment of any kind and has no legal validity. Prices are indicative and subject to change.',
};

interface BusinessAdminSettingsProps {
  role: string;
  onSettingsSaved?: (settings: VisibilitySettings) => void;
}

export function BusinessAdminSettings({ role, onSettingsSaved }: BusinessAdminSettingsProps) {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<VisibilitySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/v1/admin/settings', {
          headers: { 'X-User-Role': role },
        });
        if (!res.ok) throw new Error('Failed to load settings');
        const data = await res.json();
        setSettings(data);
      } catch (err) {
        showToast('Could not load visibility settings.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-User-Role': role },
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to save settings');
      }
      const data = await res.json();
      setSettings(data);
      onSettingsSaved?.(data);
      showToast('Visibility settings saved.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Could not save settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-shrink-0 px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-center">
        <div>
          <h1 className="text-base font-semibold text-slate-900">Visibility Policy Settings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Control what designers and customers can see on a quote.
          </p>
        </div>
        <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
          <Shield className="w-4 h-4 text-indigo-600" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-slate-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSave} className="max-w-2xl space-y-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-3">
                Quote Visibility Toggles
              </p>

              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.show_bom_to_customer}
                    onChange={e =>
                      setSettings(s => ({ ...s, show_bom_to_customer: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700 transition-colors">
                    Show itemized BOM to customer
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When enabled, designers are permitted to show the full bill of materials
                    breakdown to customers. When disabled, only the total price is shown.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-4 cursor-pointer group">
                <div className="mt-0.5 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={settings.designer_margin_access}
                    onChange={e =>
                      setSettings(s => ({ ...s, designer_margin_access: e.target.checked }))
                    }
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 group-hover:text-indigo-700 transition-colors">
                    Designer margin access
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    When enabled, designers can view internal cost and margin figures on the
                    quote screen (never visible to customers regardless of this setting).
                  </p>
                </div>
              </label>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest border-b border-slate-100 pb-3">
                Disclaimer Text
              </p>
              <label className="block">
                <p className="text-sm font-medium text-slate-900 mb-1.5">
                  Legal disclaimer shown at the bottom of every quote
                </p>
                <p className="text-xs text-slate-500 mb-2">
                  This text always appears on the quote screen — it will be captured in any
                  customer-facing screenshot.
                </p>
                <textarea
                  rows={4}
                  value={settings.disclaimer_text}
                  onChange={e => setSettings(s => ({ ...s, disclaimer_text: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-slate-800 resize-none"
                  placeholder="Enter disclaimer text…"
                />
              </label>
              {settings.disclaimer_text && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs text-slate-500 italic">
                  <span className="text-slate-400 not-italic font-medium mr-1">Preview:</span>
                  {settings.disclaimer_text}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
