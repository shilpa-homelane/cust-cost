import { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DesignerView } from './components/designer/DesignerView';
import { AdminDashboard } from './components/AdminDashboard';
import { QuoteDashboard } from './components/QuoteDashboard';
import { D2MFeatureLibrary } from './components/D2MFeatureLibrary';

export type Role = 'Designer' | 'Senior Designer' | 'D2M Analyst' | 'Procurement Analyst' | 'Admin';

type View = 'designer' | 'admin' | 'quotes' | 'features';

function App() {
  const [view, setView] = useState<View>('designer');
  const [role, setRole] = useState<Role>('Designer');
  const [presentationMode, setPresentationMode] = useState(true);
  const [loadedQuote, setLoadedQuote] = useState<any>(null);

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
        />
      )}
      {view === 'admin' && <AdminDashboard role={role} />}
      {view === 'quotes' && <QuoteDashboard role={role} onLoadQuote={handleLoadQuote} />}
      {view === 'features' && <D2MFeatureLibrary role={role} />}
    </AppShell>
  );
}

export default App;
