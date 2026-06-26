import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Sparkles } from 'lucide-react';
import { useUiStore } from '@/store/ui';
import { REGISTERED_MODULES } from '@/modules/registry';

/**
 * Global command-K palette. Phase 0: jump between modules. Phase 1 adds a live
 * "ask the command center" action and inline universal search results.
 */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useUiStore.getState().paletteOpen);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [setOpen]);

  const go = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
      overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    >
      <Command.Input
        autoFocus
        placeholder="Jump to a module, or ask the Command Center…"
        className="w-full border-b bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Command.List className="max-h-80 overflow-y-auto p-2 scrollbar-thin">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
          No matches.
        </Command.Empty>

        <Command.Group
          heading="Command Center"
          className="px-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
        >
          <Command.Item
            value="ask ai command center chat"
            onSelect={() => go('/chat')}
            className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
          >
            <Sparkles className="size-4 text-primary" />
            Ask the AI anything…
            <span className="ml-auto text-xs text-muted-foreground">Command Center</span>
          </Command.Item>
        </Command.Group>

        <Command.Group
          heading="Go to module"
          className="px-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
        >
          {REGISTERED_MODULES.map((m) => {
            const Icon = m.ui.icon;
            return (
              <Command.Item
                key={m.id}
                value={`${m.label} ${m.description}`}
                onSelect={() => go(m.path)}
                className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
              >
                <Icon className="size-4 text-muted-foreground" />
                <span>{m.label}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {m.phase === 0 ? 'ready' : `Phase ${m.phase}`}
                </span>
              </Command.Item>
            );
          })}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
