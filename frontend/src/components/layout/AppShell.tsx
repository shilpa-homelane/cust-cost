import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, FileText, BookOpen, Settings, Eye, EyeOff, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { ToastProvider } from '../ui/Toast';
import type { Role } from '../../App';

type View = 'designer' | 'admin' | 'quotes' | 'features' | 'business-settings';

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
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: 'quotes',
    label: 'My Quotes',
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: 'admin',
    label: 'Rate Database',
    icon: <Settings className="w-4 h-4" />,
    roles: ['Procurement Analyst', 'Admin'],
  },
  {
    id: 'features',
    label: 'Feature Library',
    icon: <BookOpen className="w-4 h-4" />,
    roles: ['D2M Analyst', 'Senior Designer', 'Admin'],
  },
  {
    id: 'business-settings',
    label: 'Visibility Settings',
    icon: <SlidersHorizontal className="w-4 h-4" />,
    roles: ['Business Admin', 'Admin'],
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
  const [navOpen, setNavOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  const visibleNav = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(role));

  const handleRoleChange = (newRole: Role) => {
    onRoleChange(newRole);
    const currentNavItem = NAV_ITEMS.find(n => n.id === view);
    if (currentNavItem?.roles && !currentNavItem.roles.includes(newRole)) {
      onViewChange('designer');
    }
  };

  const handleNavSelect = (v: View) => {
    onViewChange(v);
    setNavOpen(false);
  };

  useEffect(() => {
    if (!navOpen) return;
    const handler = (e: MouseEvent) => {
      if (!flyoutRef.current?.contains(e.target as Node)) setNavOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [navOpen]);

  return (
    <ToastProvider>
      <div className="h-screen w-full overflow-hidden flex flex-col bg-slate-50 font-sans">
        {/* Top Header */}
        <header className="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 shadow-sm no-print">
          {/* Left: logo + title + role dropdown */}
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">CC</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 tracking-tight hidden sm:block">Custom Costing</span>

            <select
              value={role}
              onChange={e => handleRoleChange(e.target.value as Role)}
              className="bg-slate-100 text-slate-700 text-xs font-medium rounded-lg px-3 py-1.5 border border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="Designer">Designer</option>
              <option value="Senior Designer">Senior Designer</option>
              <option value="D2M Analyst">D2M Analyst</option>
              <option value="Procurement Analyst">Procurement Analyst</option>
              <option value="Business Admin">Business Admin</option>
              <option value="Admin">Admin</option>
            </select>
          </div>

          {/* Right: presentation toggle + user avatar nav */}
          <div className="flex items-center gap-2">
            {view === 'designer' && (
              <button
                onClick={onTogglePresentation}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  presentationMode
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent'
                }`}
              >
                {presentationMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Presentation {presentationMode ? 'ON' : 'OFF'}</span>
              </button>
            )}

            {/* User avatar + flyout nav */}
            <div className="relative" ref={flyoutRef}>
              <button
                onClick={() => setNavOpen(o => !o)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors group"
                aria-haspopup="true"
                aria-expanded={navOpen}
              >
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-indigo-700 text-xs font-semibold">{role.charAt(0)}</span>
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-slate-800 leading-tight">{role}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">Active session</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${navOpen ? 'rotate-180' : ''}`} />
              </button>

              {navOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                  <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">Navigation</p>
                  {visibleNav.map(item => {
                    const active = view === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNavSelect(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors text-left ${
                          active
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className={active ? 'text-indigo-600' : 'text-slate-400'}>{item.icon}</span>
                        <span>{item.label}</span>
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content — full width, no sidebar */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
