import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ToastProvider } from '../ui/Toast';
import type { Role } from '../../App';

const ROLE_LABELS: Record<Role, string> = {
  Designer: 'Designer',
  'Business Admin': 'Business Admin',
  'Tech Admin': 'Tech Admin',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Designer: 'Quote flow',
  'Business Admin': 'Visibility settings',
  'Tech Admin': 'Catalog management',
};

interface AppShellProps {
  role: Role;
  onRoleChange: (r: Role) => void;
  children: React.ReactNode;
}

export function AppShell({ role, onRoleChange, children }: AppShellProps) {
  const [roleOpen, setRoleOpen] = useState(false);
  const flyoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roleOpen) return;
    const handler = (e: MouseEvent) => {
      if (!flyoutRef.current?.contains(e.target as Node)) setRoleOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [roleOpen]);

  return (
    <ToastProvider>
      <div className="h-screen w-full overflow-hidden flex flex-col bg-slate-50 font-sans">
        <header className="flex-shrink-0 h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">CC</span>
            </div>
            <span className="text-sm font-semibold text-slate-900 tracking-tight hidden sm:block">
              Custom Costing
            </span>
          </div>

          <div className="relative" ref={flyoutRef}>
            <button
              onClick={() => setRoleOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              aria-haspopup="true"
              aria-expanded={roleOpen}
            >
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                <span className="text-indigo-700 text-xs font-semibold">{role.charAt(0)}</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-medium text-slate-800 leading-tight">{ROLE_LABELS[role]}</p>
                <p className="text-[10px] text-slate-400 leading-tight">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${roleOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {roleOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1.5 z-50">
                <p className="px-3 pt-1 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                  Switch role
                </p>
                {(Object.keys(ROLE_LABELS) as Role[]).map(r => (
                  <button
                    key={r}
                    onClick={() => { onRoleChange(r); setRoleOpen(false); }}
                    className={`w-full flex items-start gap-3 px-3 py-2.5 text-sm font-medium transition-colors text-left ${
                      role === r
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-tight">{ROLE_LABELS[r]}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{ROLE_DESCRIPTIONS[r]}</p>
                    </div>
                    {role === r && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
