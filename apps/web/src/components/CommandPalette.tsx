import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import { Sparkles, Search as SearchIcon, FileText } from 'lucide-react';
import type { SearchHit } from '@abiros/shared';
import { useUiStore } from '@/store/ui';
import { REGISTERED_MODULES } from '@/modules/registry';
import { search } from '@/lib/api';

/**
 * Global command-K palette: jump between modules, run inline knowledge search,
 * or fire an action ("Ask the AI…", "Search everywhere…").
 */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchHit[]>([]);

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

  // Debounced inline search.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const r = await search(query.trim(), 6);
        setResults(r.hits);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setResults([]);
  };
  const go = (path: string, state?: unknown) => {
    navigate(path, state ? { state } : undefined);
    close();
  };

  const q = query.trim();
  const filteredModules = REGISTERED_MODULES.filter(
    (m) => !q || m.label.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => (o ? setOpen(true) : close())}
      shouldFilter={false}
      label="Command palette"
      className="fixed left-1/2 top-[15%] z-50 w-[92vw] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-2xl"
      overlayClassName="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
    >
      <Command.Input
        autoFocus
        value={query}
        onValueChange={setQuery}
        placeholder="Search your knowledge, ask the AI, or jump to a module…"
        className="w-full border-b bg-transparent px-4 py-3.5 text-sm outline-none placeholder:text-muted-foreground"
      />
      <Command.List className="max-h-[60vh] overflow-y-auto p-2 scrollbar-thin">
        <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
          Type to search or ask.
        </Command.Empty>

        {q && (
          <Command.Group
            heading="Actions"
            className="px-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            <Command.Item
              value={`ask ${q}`}
              onSelect={() => go('/chat', { q })}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
            >
              <Sparkles className="size-4 text-primary" />
              <span className="truncate">
                Ask the AI: <span className="text-muted-foreground">“{q}”</span>
              </span>
            </Command.Item>
            <Command.Item
              value={`search ${q}`}
              onSelect={() => go('/search', { q })}
              className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
            >
              <SearchIcon className="size-4 text-muted-foreground" />
              <span className="truncate">
                Search everywhere: <span className="text-muted-foreground">“{q}”</span>
              </span>
            </Command.Item>
          </Command.Group>
        )}

        {results.length > 0 && (
          <Command.Group
            heading="From your knowledge"
            className="px-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            {results.map((h) => (
              <Command.Item
                key={h.chunkId}
                value={h.chunkId}
                onSelect={() => go(`/knowledge/source/${h.sourceId}`, { chunkId: h.chunkId })}
                className="flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
              >
                <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <div className="truncate font-medium">{h.sourceTitle}</div>
                  <div className="truncate text-xs text-muted-foreground">{h.text}</div>
                </div>
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {filteredModules.length > 0 && (
          <Command.Group
            heading="Go to module"
            className="px-1 text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
          >
            {filteredModules.map((m) => {
              const Icon = m.ui.icon;
              return (
                <Command.Item
                  key={m.id}
                  value={`module ${m.label}`}
                  onSelect={() => go(m.path)}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm aria-selected:bg-accent"
                >
                  <Icon className="size-4 text-muted-foreground" />
                  <span>{m.label}</span>
                </Command.Item>
              );
            })}
          </Command.Group>
        )}
      </Command.List>
    </Command.Dialog>
  );
}
