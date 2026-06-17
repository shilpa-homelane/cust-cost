import { LayoutDashboard, FileText, BookOpen, Settings, Eye, EyeOff } from 'lucide-react';
import { ToastProvider } from '../ui/Toast';
import type { Role } from '../../App';

type View = 'designer' | 'admin' | 'quotes' | 'features';

interface NavItem {
  id: View;
  label: string;
  icon: React.ReactNode;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'designer',
    label: 'Designer Portal',
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    id: 'quotes',
    label: 'My Quotes',
    icon: <FileText className="w-5 h-5" />,
  },
  {
    id: 'admin',
    label: 'Rate Database',
    icon: <Settings className="w-5 h-5" />,
    roles: ['Procurement Analyst', 'Admin'],
  },
  {
    id: 'features',
    label: 'Feature Library',
    icon: <BookOpen className="w-5 h-5" />,
    roles: ['D2M Analyst', 'Senior Designer', 'Admin'],
  },
];

interface AppShellProps {
  view: View;
  onViewChange: (v: View) => void;
  role: Role;
  onRoleChange: (r: Role) => void;
  presentationMode: boolean;
  onTogglePresentation: () => void;
  children: React.ReactNode;
}

export function AppShell({
  view,
  onViewChange,
  role,
  onRoleChange,
  presentationMode,
  onTogglePresentation,
  children,
}: AppShellProps) {
  const visibleNav = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(role));

  const handleRoleChange = (newRole: Role) => {
    onRoleChange(newRole);
    const hasAccess = NAV_ITEMS.find(n => n.id === view);
    if (hasAccess?.roles && !hasAccess.roles.includes(newRole)) {
      onViewChange('designer');
    }
  };

  return (
    <ToastProvider>
      <div className="h-screen w-full overflow-hidden flex flex-col bg-slate-50 font-sans">
        {/* Top Header */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">CC</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 tracking-tight hidden sm:block">Custom Costing</span>
          </div>

          <div className="flex items-center gap-2">
            {view === 'designer' && (
              <button
                onClick={onTogglePresentation}
                className={`no-print flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  presentationMode
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {presentationMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Presentation {presentationMode ? 'ON' : 'OFF'}</span>
              </button>
            )}

            <select
              value={role}
              onChange={e => handleRoleChange(e.target.value as Role)}
              className="bg-slate-100 text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Designer">Designer</option>
              <option value="Senior Designer">Senior Designer</option>
              <option value="D2M Analyst">D2M Analyst</option>
              <option value="Procurement Analyst">Procurement Analyst</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar */}
          <aside className="flex-shrink-0 w-56 bg-white border-r border-slate-200 flex flex-col py-3 no-print">
            <nav className="flex-1 px-2 space-y-0.5">
              {visibleNav.map(item => {
                const active = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                      active
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="px-3 pb-2 pt-3 border-t border-slate-100 mt-2">
              <div className="flex items-center gap-2 px-2 py-2">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-700 text-xs font-semibold">{role.charAt(0)}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 truncate">{role}</p>
                  <p className="text-[10px] text-slate-400">Active session</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-hidden flex flex-col">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
