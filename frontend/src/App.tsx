import { useState, useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { DesignerFlow } from './components/designer/DesignerFlow';
import { AdminDashboard } from './components/AdminDashboard';
import { BusinessAdminSettings } from './components/BusinessAdminSettings';

export type Role = 'Designer' | 'Business Admin' | 'Tech Admin';

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

function App() {
  const [role, setRole] = useState<Role>('Designer');
  const [visibilitySettings, setVisibilitySettings] = useState<VisibilitySettings>(DEFAULT_VISIBILITY);

  useEffect(() => {
    fetch('/api/v1/admin/settings')
      .then(r => r.json())
      .then(data => setVisibilitySettings(data))
      .catch(() => {});
  }, []);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
  };

  return (
    <AppShell role={role} onRoleChange={handleRoleChange}>
      {role === 'Designer' && (
        <DesignerFlow role={role} visibilitySettings={visibilitySettings} />
      )}
      {role === 'Tech Admin' && <AdminDashboard role={role} />}
      {role === 'Business Admin' && (
        <BusinessAdminSettings role={role} onSettingsSaved={setVisibilitySettings} />
      )}
    </AppShell>
  );
}

export default App;
