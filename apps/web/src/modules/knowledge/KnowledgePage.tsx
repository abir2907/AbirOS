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
  Tag,
  FolderGit2,
  Plus,
} from 'lucide-react';
import type { SourceSummary } from '@abiros/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  createProject,
  deleteSource,
  ingestFile,
  ingestNote,
  ingestUrl,
  linkSource,
  listProjects,
  listSources,
  listTags,
  ApiRequestError,
} from '@/lib/api';
import { queueNote } from '@/lib/offline';

type Tab = 'note' | 'url' | 'file';

export function KnowledgePage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Knowledge</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add anything to your second brain — notes, web pages, PDFs, or screenshots (OCR'd). Each
          source is chunked, embedded, auto-tagged, and made searchable.
        </p>
      </header>
      <AddSource />
      <ProjectsPanel />
      <TagCloud />
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

  const [offlineMsg, setOfflineMsg] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: async (): Promise<'offline' | unknown> => {
      if (tab === 'note') {
        const t = title.trim();
        const c = content.trim();
        // Capture offline → queue locally and sync on reconnect.
        if (!navigator.onLine) {
          queueNote(t, c);
          return 'offline';
        }
        try {
          return await ingestNote(t, c);
        } catch (e) {
          if (!navigator.onLine) {
            queueNote(t, c);
            return 'offline';
          }
          throw e;
        }
      }
      if (tab === 'url') return ingestUrl(url.trim());
      if (!file) throw new Error('Choose a file first.');
      return ingestFile(file);
    },
    onSuccess: (res) => {
      setTitle('');
      setContent('');
      setUrl('');
      setFile(null);
      setError(null);
      setOfflineMsg(res === 'offline' ? 'Saved offline — it will sync when you reconnect.' : null);
      if (res !== 'offline') qc.invalidateQueries({ queryKey: ['sources'] });
    },
    onError: (e) => setError(e instanceof ApiRequestError ? e.message : (e as Error).message),
  });

  const tabs: { id: Tab; label: string; icon: typeof StickyNote }[] = [
    { id: 'note', label: 'Note', icon: StickyNote },
    { id: 'url', label: 'Web page', icon: Link2 },
    { id: 'file', label: 'PDF / Image', icon: FileText },
  ];

  const canSubmit =
    tab === 'note' ? title.trim() && content.trim() : tab === 'url' ? url.trim() : !!file;

  return (
    <Card className="mb-6">
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
        {tab === 'file' && (
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-6 text-sm text-muted-foreground hover:bg-accent">
            <Upload className="size-5" />
            <span>{file ? file.name : 'Choose a PDF or image — screenshots are OCR’d (max 25 MB)'}</span>
            <input
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
        {offlineMsg && <p className="text-sm text-emerald-400">{offlineMsg}</p>}

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

function ProjectsPanel() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['projects'], queryFn: listProjects, retry: false });
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: () => createProject({ name: name.trim() }),
    onSuccess: () => {
      setName('');
      qc.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <FolderGit2 className="size-4" /> Projects
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {data?.projects.map((p) => (
          <Badge key={p.id} variant="secondary">
            {p.name}
          </Badge>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
          className="flex items-center gap-1.5"
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project…"
            className="h-7 w-40 text-xs"
          />
          <Button type="submit" size="icon" variant="ghost" className="size-7" disabled={!name.trim()}>
            <Plus className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

function TagCloud() {
  const { data } = useQuery({ queryKey: ['tags'], queryFn: listTags, retry: false });
  if (!data || data.tags.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Tag className="size-4" /> Auto-tags
      </div>
      <div className="flex flex-wrap gap-1.5">
        {data.tags.map((t) => (
          <Badge key={t.name} variant="outline" className="text-[11px]">
            {t.name} <span className="ml-1 text-muted-foreground">{t.count}</span>
          </Badge>
        ))}
      </div>
    </div>
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
    refetchInterval: (q) =>
      q.state.data?.items.some((s) => s.status === 'pending' || s.status === 'processing')
        ? 2000
        : false,
  });
  const projects = useQuery({ queryKey: ['projects'], queryFn: listProjects, retry: false });
  const del = useMutation({
    mutationFn: deleteSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });
  const link = useMutation({
    mutationFn: ({ sourceId, projectId }: { sourceId: string; projectId: string | null }) =>
      linkSource(sourceId, projectId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sources'] }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading sources…</p>;
  if (isError)
    return <p className="text-sm text-muted-foreground">Couldn't load sources — is the API up?</p>;
  if (!data || data.items.length === 0)
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No sources yet. Add a note, web page, PDF, or screenshot above to get started.
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {data.total} source{data.total === 1 ? '' : 's'}
      </div>
      {data.items.map((s) => (
        <div key={s.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-4 py-3">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{s.title}</div>
            <div className="text-xs text-muted-foreground">
              {s.type} · {new Date(s.createdAt).toLocaleString()}
            </div>
          </div>
          <select
            value={s.projectId ?? ''}
            onChange={(e) => link.mutate({ sourceId: s.id, projectId: e.target.value || null })}
            className="h-7 max-w-32 rounded-md border bg-transparent px-2 text-xs text-muted-foreground focus:outline-none"
            title="Assign to project"
          >
            <option value="">No project</option>
            {projects.data?.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
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
