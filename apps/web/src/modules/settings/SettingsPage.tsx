import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Github,
  Database,
  Download,
  AlertTriangle,
  Check,
  X,
  Loader2,
  Bell,
  Brain,
  Trash2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  getSettings,
  getUsage,
  setEnabledModules,
  purgeData,
  DATASET_CSV_URL,
  getMemories,
  addMemory,
  deleteMemory,
} from '@/lib/api';
import { notifyPermission, notifySupported, requestNotifyPermission } from '@/lib/notify';

export function SettingsPage() {
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ['settings'], queryFn: getSettings });
  const usage = useQuery({ queryKey: ['usage'], queryFn: getUsage });

  const toggleMod = useMutation({
    mutationFn: (modules: string[]) => setEnabledModules(modules),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });

  const s = settings.data;

  const flip = (id: string) => {
    if (!s) return;
    const set = new Set(s.enabledModules);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    toggleMod.mutate([...set]);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Providers, integrations, usage, and data.</p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Bot className="size-4" /> AI providers</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <Row label="LLM provider" value={s?.providers.llm} />
          <Row label="Chat model" value={s?.providers.chatModel} />
          <Row label="Embedding provider" value={s?.providers.embedding} />
          <Row label="Embedding model" value={s?.providers.embedModel} />
          <Row label="Ollama URL" value={s?.providers.ollamaBaseUrl} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Github className="size-4" /> Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            GitHub
            {s?.integrations.github ? (
              <Badge variant="success" className="gap-1"><Check className="size-3" /> connected</Badge>
            ) : (
              <Badge variant="secondary" className="gap-1"><X className="size-3" /> set GITHUB_TOKEN in .env</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <NotificationsCard />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Database className="size-4" /> Database usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
            {(usage.data?.usage ?? []).map((u) => (
              <div key={u.table} className="flex justify-between">
                <span className="text-muted-foreground">{u.table}</span>
                <span>{u.rows.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Row counts — watch these on the Neon free tier.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Enabled modules</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {(s?.allModules ?? []).map((id) => {
            const on = s?.enabledModules.includes(id);
            return (
              <button
                key={id}
                onClick={() => flip(id)}
                disabled={toggleMod.isPending}
                className={`rounded-full border px-3 py-1 text-xs capitalize transition-colors ${
                  on ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'
                }`}
              >
                {id}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <MemoryCard />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm"><Download className="size-4" /> Data export</CardTitle>
        </CardHeader>
        <CardContent>
          <Button asChild variant="secondary">
            <a href={DATASET_CSV_URL} download>Download activity dataset (CSV)</a>
          </Button>
        </CardContent>
      </Card>

      <DangerZone />
    </div>
  );
}

function MemoryCard() {
  const qc = useQueryClient();
  const memories = useQuery({ queryKey: ['memories'], queryFn: getMemories });
  const [text, setText] = useState('');
  const add = useMutation({
    mutationFn: () => addMemory(text.trim()),
    onSuccess: () => {
      setText('');
      qc.invalidateQueries({ queryKey: ['memories'] });
    },
  });
  const del = useMutation({
    mutationFn: deleteMemory,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memories'] }),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="size-4" /> Assistant memory
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Facts the Command Center remembers about you across chats. The AI can add these itself, or
          add your own.
        </p>
        {(memories.data?.memories ?? []).map((mm) => (
          <div key={mm.id} className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2 text-sm">
            <span className="flex-1">{mm.content}</span>
            {mm.source === 'assistant' && (
              <Badge variant="outline" className="text-[10px]">
                auto
              </Badge>
            )}
            <Button size="icon" variant="ghost" className="size-7" onClick={() => del.mutate(mm.id)}>
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        {memories.data?.memories.length === 0 && (
          <p className="text-sm text-muted-foreground">No memories yet.</p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) add.mutate();
          }}
          className="flex gap-2"
        >
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Remember that I…" />
          <Button type="submit" size="icon" variant="secondary" disabled={!text.trim()}>
            <Plus className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function NotificationsCard() {
  const [perm, setPerm] = useState(notifyPermission());
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bell className="size-4" /> Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        {!notifySupported() ? (
          <span className="text-sm text-muted-foreground">Not supported in this browser.</span>
        ) : perm === 'granted' ? (
          <Badge variant="success" className="gap-1">
            <Check className="size-3" /> reminders on
          </Badge>
        ) : (
          <Button
            variant="secondary"
            onClick={async () => {
              await requestNotifyPermission();
              setPerm(notifyPermission());
            }}
          >
            Enable due-card reminders
          </Button>
        )}
        <span className="text-xs text-muted-foreground">
          A local reminder when flashcards are due (no data leaves your device).
        </span>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? '—'}</span>
    </div>
  );
}

function DangerZone() {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState('');
  const purge = useMutation({
    mutationFn: purgeData,
    onSuccess: () => {
      setConfirm('');
      qc.invalidateQueries();
    },
  });

  return (
    <Card className="border-destructive/40">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm text-destructive">
          <AlertTriangle className="size-4" /> Danger zone
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Permanently delete <b>all</b> your content (sources, chats, flashcards, expenses,
          everything). Your account and settings stay. Type <b>DELETE</b> to confirm.
        </p>
        <div className="flex gap-2">
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" className="max-w-40" />
          <Button variant="destructive" disabled={confirm !== 'DELETE' || purge.isPending} onClick={() => purge.mutate()}>
            {purge.isPending && <Loader2 className="size-4 animate-spin" />}
            Purge all data
          </Button>
        </div>
        {purge.isSuccess && <p className="mt-2 text-sm text-emerald-400">All content purged.</p>}
      </CardContent>
    </Card>
  );
}
