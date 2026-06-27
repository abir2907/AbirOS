import { useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, LogOut, Menu, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/ui';
import { useLogout, useMe } from '@/lib/auth';
import { useOnline } from '@/lib/offline';

export function Topbar() {
  const navigate = useNavigate();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const setMobileNav = useUiStore((s) => s.setMobileNav);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const me = useMe();
  const logout = useLogout();
  const online = useOnline();

  const onLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur sm:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNav(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </Button>

      <button
        onClick={() => setPaletteOpen(true)}
        className="flex h-9 flex-1 items-center gap-2 rounded-md border bg-card/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent md:max-w-md"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Search or ask anything…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="hidden flex-1 md:block" />

      {!online && (
        <span
          className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-xs text-amber-400"
          title="Offline — notes you add are queued and sync when you reconnect"
        >
          <WifiOff className="size-3" /> offline
        </span>
      )}
      {me.data && <span className="hidden text-sm text-muted-foreground sm:inline">{me.data.username}</span>}
      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Log out">
        <LogOut className="size-4" />
      </Button>
    </header>
  );
}
