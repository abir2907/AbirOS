import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeft, Hexagon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/ui';
import { REGISTERED_MODULES } from '@/modules/registry';

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'flex h-screen shrink-0 flex-col border-r bg-card/40 transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4">
        <Hexagon className="size-6 shrink-0 text-primary" />
        {!collapsed && <span className="text-lg font-semibold tracking-tight">AbirOS</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2 scrollbar-thin">
        {REGISTERED_MODULES.map((m) => {
          const Icon = m.ui.icon;
          return (
            <NavLink
              key={m.id}
              to={m.path}
              end={m.path === '/'}
              title={collapsed ? m.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  collapsed && 'justify-center px-0',
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{m.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          onClick={toggleSidebar}
          className={cn('w-full text-muted-foreground', !collapsed && 'justify-start')}
        >
          {collapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!collapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
