import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Link2,
  StickyNote,
  Upload,
  Trash2,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import type { SourceSummary } from '@abiros/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  deleteSource,
  ingestFile,
  ingestNote,
  ingestUrl,
  listSources,
  ApiRequestError,
} from '@/lib/api';

type Tab = 'note' | 'url' | 'pdf';

export function KnowledgePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add anything to your second brain. Everything is chunked, embedded, and made searchable.
        </p>
      </header>
      <AddSource />
      <SourceList />
    </div>
  );
}

function AddSource() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('note');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      if (tab === 'note') return ingestNote(title.trim(), content.trim());
      if (tab === 'url') return ingestUrl(url.trim());
      if (!file) throw new Error('Choose a PDF first.');
      return ingestFile(file);
    },
    onSuccess: () => {
      setTitle('');
      setContent('');
      setUrl('');
      setFile(null);
      setError(null);
      qc.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : (e as Error).message),
  });

  const tabs: { id: Tab; label: string; icon: typeof StickyNote }[] = [
    { id: 'note', label: 'Note', icon: StickyNote },
    { id: 'url', label: 'Web page', icon: Link2 },
    { id: 'pdf', label: 'PDF', icon: FileText },
  ];

  const canSubmit =
    tab === 'note' ? title.trim() && content.trim() : tab === 'url' ? url.trim() : !!file;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="text-base">Add a source</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <t.icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'note' && (
          <div className="space-y-2">
            <Input placeholder="Note title" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea
              placeholder="Write or paste anything…"
              className="min-h-32"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        )}
        {tab === 'url' && (
          <Input
            placeholder="https://example.com/article"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        )}
        {tab === 'pdf' && (
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground hover:bg-accent">
            <Upload className="size-5" />
            <span>{file ? file.name : 'Choose a PDF (max 25 MB)'}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end">
          <Button onClick={() => mut.mutate()} disabled={!canSubmit || mut.isPending}>
            {mut.isPending && <Loader2 className="size-4 animate-spin" />}
            Ingest
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ s }: { s: SourceSummary }) {
  if (s.status === 'ready')
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle2 className="size-3" /> ready
      </Badge>
    );
  if (s.status === 'failed')
    return (
      <Badge variant="destructive" className="gap-1" title={s.error ?? undefined}>
        <XCircle className="size-3" /> failed
      </Badge>
    );
  if (s.status === 'processing')
    return (
      <Badge variant="warning" className="gap-1">
        <Loader2 className="size-3 animate-spin" /> processing
      </Badge>
    );
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="size-3" /> pending
    </Badge>
  );
}

function SourceList() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['sources'],
    queryFn: () => listSources(50, 0),
    // Poll while anything is still processing.
    refetchInterval: (q) =>
      q.state.data?.items.some((s) => s.status === 'pending' || s.status === 'processing')
        ? 2000
        : false,
  });
  const del = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading sources…</p>;
  if (isError)
    return <p className="text-sm text-muted-foreground">Couldn't load sources — is the API up?</p>;
  if (!data || data.items.length === 0)
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No sources yet. Add a note, web page, or PDF above to get started.
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {data.total} source{data.total === 1 ? '' : 's'}
      </div>
      {data.items.map((s) => (
        <div
          key={s.id}
          className="flex items-center gap-3 rounded-lg border bg-card/50 px-4 py-3"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{s.title}</div>
            <div className="text-xs text-muted-foreground">
              {s.type} · {new Date(s.createdAt).toLocaleString()}
            </div>
          </div>
          <StatusBadge s={s} />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => del.mutate(s.id)}
            aria-label="Delete source"
          >
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}
