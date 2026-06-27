import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PanelLeftClose, PanelLeft, Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/ui';
import { REGISTERED_MODULES } from '@/modules/registry';
import { getSettings } from '@/lib/api';

// Dashboard + Settings are always available regardless of toggles.
const ALWAYS = new Set(['dashboard', 'settings']);

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings, staleTime: 60_000 });

  const enabled = settings.data?.enabledModules;
  const modules = enabled
    ? REGISTERED_MODULES.filter((m) => ALWAYS.has(m.id) || enabled.includes(m.id))
    : REGISTERED_MODULES;

  return (
    <aside
      className={cn(
        'z-40 flex h-[100dvh] shrink-0 flex-col border-r bg-card backdrop-blur transition-transform duration-200',
        'fixed inset-y-0 left-0 w-60 md:static md:translate-x-0 md:bg-card/40',
        collapsed ? 'md:w-16' : 'md:w-60',
        mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <Hexagon className="size-6 shrink-0 text-primary" />
        <span className={cn('text-lg font-semibold tracking-tight', collapsed && 'md:hidden')}>
          AbirOS
        </span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        {modules.map((m) => {
          const Icon = m.ui.icon;
          return (
            <NavLink
              key={m.id}
              to={m.path}
              end={m.path === '/'}
              onClick={() => setMobileNav(false)}
              title={collapsed ? m.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  collapsed && 'md:justify-center md:px-0',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              <span className={cn('truncate', collapsed && 'md:hidden')}>{m.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="hidden border-t p-2 md:block">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={toggleSidebar}
          className={cn('w-full text-muted-foreground', !collapsed && 'justify-start')}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          <span className={cn(collapsed && 'hidden')}>Collapse</span>
        </Button>
      </div>
    </aside>
  );
}
