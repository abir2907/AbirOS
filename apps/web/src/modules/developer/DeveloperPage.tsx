import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Github,
  Loader2,
  RefreshCw,
  Search as SearchIcon,
  Star,
  GitCommit,
  FolderGit2,
  GitBranch,
  ExternalLink,
  LayoutGrid,
  MessageSquareText,
  FileText,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  ApiRequestError,
  getAnalyzer,
  listRepos,
  searchCode,
  syncGithub,
  type CodeHit,
} from '@/lib/api';
import { InterviewTab } from './InterviewTab';
import { ResumeTab } from './ResumeTab';
import { TimeMachineTab } from './TimeMachineTab';

const ACCENT = 'hsl(243 80% 67%)';

type DevTab = 'overview' | 'interview' | 'resume' | 'timemachine';

const DEV_TABS: { id: DevTab; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'interview', label: 'Interview Coach', icon: MessageSquareText },
  { id: 'resume', label: 'Resume', icon: FileText },
  { id: 'timemachine', label: 'Time Machine', icon: History },
];

export function DeveloperPage() {
  const [tab, setTab] = useState<DevTab>('overview');
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Developer</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sync GitHub to index your code, then analyze your growth, practice interviews, and build
          your resume.
        </p>
      </header>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {DEV_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <DevOverview />}
      {tab === 'interview' && <InterviewTab />}
      {tab === 'resume' && <ResumeTab />}
      {tab === 'timemachine' && <TimeMachineTab />}
    </div>
  );
}

function DevOverview() {
  const qc = useQueryClient();
  const analyzer = useQuery({ queryKey: ['analyzer'], queryFn: getAnalyzer, retry: false });
  const repos = useQuery({ queryKey: ['repos'], queryFn: listRepos, retry: false });

  const sync = useMutation({
    mutationFn: syncGithub,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analyzer'] });
      qc.invalidateQueries({ queryKey: ['repos'] });
    },
  });

  const insights = analyzer.data;
  const hasData = (repos.data?.repos.length ?? 0) > 0;

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => sync.mutate()} disabled={sync.isPending}>
          {sync.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Sync GitHub
        </Button>
      </div>

      {sync.isError && (
        <p className="mb-4 text-sm text-destructive">
          {sync.error instanceof ApiRequestError ? sync.error.message : 'Sync failed.'}
        </p>
      )}
      {sync.isSuccess && (
        <p className="mb-4 text-sm text-emerald-400">
          Synced {sync.data.repos} repos and {sync.data.commits} new commits for @{sync.data.login}.
        </p>
      )}

      {!hasData && !sync.isPending ? (
        <EmptyState />
      ) : (
        <div className="space-y-8">
          {insights && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Stat icon={FolderGit2} label="Repos" value={insights.repoCount} />
                <Stat icon={GitCommit} label="Commits indexed" value={insights.commitCount} />
                <Stat icon={Star} label="Total stars" value={insights.starCount} />
              </div>

              {insights.languages.length > 0 && (
                <ChartCard title="Languages (by bytes)">
                  <ResponsiveContainer width="100%" height={Math.max(120, insights.languages.length * 28)}>
                    <BarChart
                      data={insights.languages.map((l) => ({ name: l.name, value: l.bytes }))}
                      layout="vertical"
                      margin={{ left: 8, right: 16 }}
                    >
                      <XAxis type="number" hide />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={90}
                        tick={{ fontSize: 12, fill: 'hsl(240 5% 60%)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: 'hsl(240 5% 16% / 0.5)' }}
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [`${(v / 1000).toFixed(1)} KB`, 'code']}
                      />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} fill={ACCENT} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {insights.commitsByMonth.length > 0 && (
                <ChartCard title="Commits over time">
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={insights.commitsByMonth}>
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: 'hsl(240 5% 60%)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'hsl(240 5% 16% / 0.5)' }} contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {insights.commitsByMonth.map((_, i) => (
                          <Cell key={i} fill={ACCENT} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </>
          )}

          <CodeHistorian />

          {repos.data && repos.data.repos.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold">Repositories</h2>
              <div className="space-y-2">
                {repos.data.repos.map((r) => (
                  <a
                    key={r.id}
                    href={r.url ?? '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-lg border bg-card/50 px-4 py-3 transition-colors hover:bg-accent"
                  >
                    <GitBranch className="size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.fullName}</div>
                      {r.description && (
                        <div className="truncate text-xs text-muted-foreground">{r.description}</div>
                      )}
                    </div>
                    {r.primaryLanguage && (
                      <Badge variant="outline" className="text-[10px]">
                        {r.primaryLanguage}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="size-3" /> {r.stars}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  background: 'hsl(240 10% 6%)',
  border: '1px solid hsl(240 5% 16%)',
  borderRadius: 8,
  fontSize: 12,
};

function Stat({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-xl font-semibold">{value.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function CodeHistorian() {
  const [query, setQuery] = useState('');
  const mut = useMutation({ mutationFn: (q: string) => searchCode(q) });
  const hits = mut.data?.hits ?? [];

  return (
    <section>
      <h2 className="mb-1 text-sm font-semibold">Code Historian</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Search every commit message and repo — e.g. “authentication”, “rate limit”, “migration”.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) mut.mutate(query.trim());
        }}
        className="mb-3 flex gap-2"
      >
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Find every… implementation"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" disabled={!query.trim() || mut.isPending}>
          {mut.isPending && <Loader2 className="size-4 animate-spin" />}
          Search
        </Button>
      </form>
      {mut.isSuccess && hits.length === 0 && (
        <p className="text-sm text-muted-foreground">No matches in your synced history.</p>
      )}
      <div className="space-y-1.5">
        {hits.map((h, i) => (
          <CodeResult key={i} hit={h} />
        ))}
      </div>
    </section>
  );
}

function CodeResult({ hit }: { hit: CodeHit }) {
  return (
    <a
      href={hit.url ?? '#'}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 rounded-lg border bg-card/50 px-4 py-2.5 transition-colors hover:bg-accent"
    >
      {hit.kind === 'repo' ? (
        <FolderGit2 className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <GitCommit className="size-4 shrink-0 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm">{hit.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {hit.detail}
          {hit.date && ` · ${new Date(hit.date).toLocaleDateString()}`}
        </div>
      </div>
      <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
    </a>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
        <Github className="size-7" />
      </div>
      <p className="max-w-sm text-sm text-muted-foreground">
        Connect GitHub to index your repos and commits. Add a personal access token as{' '}
        <code>GITHUB_TOKEN</code> in <code>.env</code>, then click <b>Sync GitHub</b>.
      </p>
    </div>
  );
}
