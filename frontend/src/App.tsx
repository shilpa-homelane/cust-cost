import { useState, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DesignerView } from './components/designer/DesignerView';
import { AdminDashboard } from './components/AdminDashboard';
import { QuoteDashboard } from './components/QuoteDashboard';
import { D2MFeatureLibrary } from './components/D2MFeatureLibrary';
import { BusinessAdminSettings } from './components/BusinessAdminSettings';

export type Role = 'Designer' | 'Senior Designer' | 'D2M Analyst' | 'Procurement Analyst' | 'Business Admin' | 'Admin';

export interface VisibilitySettings {
  show_bom_to_customer: boolean;
  designer_margin_access: boolean;
  disclaimer_text: string;
}

const DEFAULT_VISIBILITY: VisibilitySettings = {
  show_bom_to_customer: true,
  designer_margin_access: false,
  disclaimer_text:
    'This estimate does not constitute a promise or commitment of any kind and has no legal validity. Prices are indicative and subject to change.',
};

type View = 'designer' | 'admin' | 'quotes' | 'features' | 'business-settings';

function App() {
  const [view, setView] = useState<View>('designer');
  const [role, setRole] = useState<Role>('Designer');
  const [presentationMode, setPresentationMode] = useState(true);
  const [loadedQuote, setLoadedQuote] = useState<any>(null);
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);

  useEffect(() => {
    fetch('/api/v1/admin/settings')
      .then(r => r.json())
      .then(data => setVisibilitySettings(data))
      .catch(() => {});
  }, []);

  const handleLoadQuote = (savedQuote: any) => {
    setLoadedQuote(savedQuote);
    setView('designer');
  };

  return (
    <AppShell
      view={view}
      onViewChange={setView}
      role={role}
      onRoleChange={setRole}
      presentationMode={presentationMode}
      onTogglePresentation={() => setPresentationMode(p => !p)}
    >
      {view === 'designer' && (
        <DesignerView
          role={role}
          presentationMode={presentationMode}
          loadedQuote={loadedQuote}
          visibilitySettings={visibilitySettings}
        />
      )}
      {view === 'admin' && <AdminDashboard role={role} />}
      {view === 'quotes' && <QuoteDashboard role={role} onLoadQuote={handleLoadQuote} />}
      {view === 'features' && <D2MFeatureLibrary role={role} />}
      {view === 'business-settings' && (
        <BusinessAdminSettings
          role={role}
          onSettingsSaved={setVisibilitySettings}
        />
      )}
    </AppShell>
  );
}

export default App;
