import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Loader2, Database, Bot, ArrowRight } from 'lucide-react';
import { getHealth } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/ui';

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

export function DashboardPage() {
  const setPaletteOpen = useUiStore((s) => s.setPaletteOpen);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 15_000,
  });

  const db = data?.checks.db;
  const ollama = data?.checks.ollama;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to AbirOS</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your personal AI operating system. This is Phase 0 — the scaffold. The modules below are
          navigable but empty until their phase ships.
        </p>
      </header>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>System status</CardTitle>
              <CardDescription>Live health of the local services AbirOS depends on.</CardDescription>
            </div>
            {data && (
              <Badge variant={data.status === 'ok' ? 'success' : 'warning'}>{data.status}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isError && (
            <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              Can't reach the API. Is it running on port 4000? Try <code>pnpm dev</code>.
            </div>
          )}
          <StatusRow
            icon={Database}
            label="Database (Neon + pgvector)"
            ok={db?.ok}
            detail={db?.detail}
            loading={isLoading}
          />
          <StatusRow
            icon={Bot}
            label="Ollama (local AI)"
            ok={ollama?.ok}
            detail={ollama?.detail}
            loading={isLoading}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Try the command center</CardTitle>
          <CardDescription>
            Press <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Ctrl</kbd> +{' '}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">K</kbd> anywhere to jump
            between modules. Search &amp; chat come alive in Phase 1.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setPaletteOpen(true)} variant="secondary">
            Open command palette
            <ArrowRight className="size-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
