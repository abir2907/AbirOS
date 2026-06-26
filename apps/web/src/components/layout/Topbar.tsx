import { useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/ui';
import { useLogout, useMe } from '@/lib/auth';

export function Topbar() {
  const navigate = useNavigate();
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const me = useMe();
  const logout = useLogout();

  const onLogout = async () => {
    await logout.mutateAsync();
    navigate('/login', { replace: true });
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <button
        onClick={() => setPaletteOpen(true)}
        className="flex h-9 flex-1 items-center gap-2 rounded-md border bg-card/50 px-3 text-sm text-muted-foreground transition-colors hover:bg-accent md:max-w-md"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Search or ask anything…</span>
        <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          Ctrl K
        </kbd>
      </button>

      <div className="flex-1" />

      {me.data && (
        <span className="hidden text-sm text-muted-foreground sm:inline">{me.data.username}</span>
      )}
      <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
        {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </Button>
      <Button variant="ghost" size="icon" onClick={onLogout} aria-label="Log out">
        <LogOut className="size-4" />
      </Button>
    </header>
  );
}
