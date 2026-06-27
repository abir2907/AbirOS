import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Bot,
  Brain,
  GitCommit,
  Receipt,
  FileText,
  Target,
  ArrowRight,
} from 'lucide-react';
import { getHealth, getDashboard } from '@/lib/api';
import { notify, notifyPermission } from '@/lib/notify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function StatCard({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: typeof Brain;
  label: string;
  value: string | number;
  to: string;
}) {
  return (
    <Link to={to}>
      <Card className="transition-colors hover:bg-accent">
        <CardContent className="flex items-center gap-3 p-4">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="size-5" />
          </div>
          <div>
            <div className="text-xl font-semibold">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function DashboardPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, refetchInterval: 15_000 });
  const summary = useQuery({ queryKey: ['dashboard'], queryFn: getDashboard, retry: false });

  const db = health.data?.checks.db;
  const ollama = health.data?.checks.ollama;
  const s = summary.data;

  // One reminder per session if cards are due and notifications are enabled.
  useEffect(() => {
    const due = s?.dueFlashcards ?? 0;
    if (due > 0 && notifyPermission() === 'granted' && !sessionStorage.getItem('abiros-notified-due')) {
      notify('AbirOS', `You have ${due} flashcard${due === 1 ? '' : 's'} due for review.`);
      sessionStorage.setItem('abiros-notified-due', '1');
    }
  }, [s?.dueFlashcards]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your day across AbirOS, at a glance.</p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard icon={Brain} label="cards due" value={s?.dueFlashcards ?? '—'} to="/learning" />
        <StatCard icon={GitCommit} label="commits / 30d" value={s?.commits30d ?? '—'} to="/developer" />
        <StatCard icon={Receipt} label="spend this month" value={s ? s.spendThisMonth : '—'} to="/life" />
        <StatCard icon={FileText} label="sources" value={s?.totalSources ?? '—'} to="/knowledge" />
        <StatCard icon={Target} label="active goals" value={s?.goals.active ?? '—'} to="/planner" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Today's plan</CardTitle>
              <Link to="/planner" className="text-xs text-primary">
                Open planner <ArrowRight className="inline size-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {s && s.planToday.items.length > 0 ? (
              s.planToday.items.map((it) => (
                <div key={it.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={it.done ? 'size-4 text-emerald-400' : 'size-4 text-muted-foreground/40'} />
                  <span className={it.done ? 'text-muted-foreground line-through' : ''}>{it.title}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No plan yet — generate one in the Planner.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Recently added</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {s && s.recentSources.length > 0 ? (
              s.recentSources.map((src) => (
                <div key={src.id} className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="truncate">{src.title}</span>
                  <Badge variant="outline" className="ml-auto text-[10px]">{src.type}</Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nothing ingested yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">System status</CardTitle>
            {health.data && (
              <Badge variant={health.data.status === 'ok' ? 'success' : 'warning'}>{health.data.status}</Badge>
            )}
          </div>
          <CardDescription>Local services AbirOS depends on.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          <StatusRow icon={Database} label="Database (Neon + pgvector)" ok={db?.ok} detail={db?.detail} loading={health.isLoading} />
          <StatusRow icon={Bot} label="Ollama (local AI)" ok={ollama?.ok} detail={ollama?.detail} loading={health.isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatusRow({
  icon: Icon,
  label,
  ok,
  detail,
  loading,
}: {
  icon: typeof Database;
  label: string;
  ok?: boolean;
  detail?: string;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/50 px-4 py-3">
      <Icon className="size-5 text-muted-foreground" />
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
      </div>
      {loading ? (
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      ) : ok ? (
        <CheckCircle2 className="size-5 text-emerald-400" />
      ) : (
        <XCircle className="size-5 text-amber-400" />
      )}
    </div>
  );
}
