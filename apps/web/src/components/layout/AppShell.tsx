import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  Archive,
  Network,
  FlaskConical,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Dashboard',      icon: LayoutDashboard },
  { to: '/inspection', label: 'Inspection',      icon: ClipboardList },
  { to: '/vault',      label: 'Evidence Vault',  icon: Archive },
  { to: '/graph',      label: 'Knowledge Graph', icon: Network },
  { to: '/spike',      label: 'Spike (Dev)',      icon: FlaskConical },
];

export function AppShell({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex h-screen overflow-hidden bg-mirror-bg">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-mirror-border bg-mirror-surface">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-mirror-border">
          <span className="text-lg font-semibold tracking-tight text-mirror-text">
            MIR<span className="text-mirror-accent">ROR</span>
          </span>
          <p className="text-xs text-mirror-muted mt-0.5">Field Intelligence</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  isActive
                    ? 'bg-mirror-accent/15 text-mirror-accent font-medium'
                    : 'text-mirror-muted hover:text-mirror-text hover:bg-white/5'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Connectivity status */}
        <div className="px-4 py-3 border-t border-mirror-border">
          <div className="flex items-center gap-2 text-xs">
            {isOnline ? (
              <>
                <Wifi size={13} className="text-mirror-success" />
                <span className="text-mirror-success">Online</span>
              </>
            ) : (
              <>
                <WifiOff size={13} className="text-mirror-warning" />
                <span className="text-mirror-warning">Offline — local mode</span>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Offline banner */}
        {!isOnline && (
          <div className="bg-mirror-warning/10 border-b border-mirror-warning/30 px-6 py-2 text-xs text-mirror-warning flex items-center gap-2">
            <WifiOff size={12} />
            Working offline — evidence is saved locally and will sync when connectivity returns.
          </div>
        )}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
