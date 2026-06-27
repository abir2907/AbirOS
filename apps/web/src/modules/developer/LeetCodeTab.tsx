import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, RefreshCw, Search as SearchIcon, Target, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ApiRequestError, getLeetcodeStats, getWeakTopics, searchSolved, syncLeetcode } from '@/lib/api';

export function LeetCodeTab() {
  const stats = useQuery({ queryKey: ['lc-stats'], queryFn: getLeetcodeStats, retry: false });
  const [username, setUsername] = useState('');
  const [query, setQuery] = useState('');
  const sync = useMutation({ mutationFn: () => syncLeetcode(username.trim()), onSuccess: () => stats.refetch() });
  const search = useMutation({ mutationFn: () => searchSolved(query.trim()) });
  const weak = useMutation({ mutationFn: getWeakTopics });

  const s = stats.data ?? sync.data;

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (username.trim()) sync.mutate();
        }}
        className="flex gap-2"
      >
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your LeetCode username" className="flex-1" />
        <Button type="submit" disabled={!username.trim() || sync.isPending}>
          {sync.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Sync
        </Button>
      </form>
      {sync.isError && (
        <p className="text-sm text-destructive">
          {sync.error instanceof ApiRequestError ? sync.error.message : 'Sync failed.'}
        </p>
      )}

      {s && (
        <div className="grid grid-cols-4 gap-2">
          {[
            ['Solved', s.totalSolved],
            ['Easy', s.easy],
            ['Medium', s.medium],
            ['Hard', s.hard],
          ].map(([label, n]) => (
            <Card key={label}>
              <CardContent className="p-3 text-center">
                <div className="text-xl font-semibold">{n}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => weak.mutate()} disabled={weak.isPending}>
          {weak.isPending ? <Loader2 className="size-4 animate-spin" /> : <Target className="size-4" />}
          Weak topics
        </Button>
        {weak.data && <span className="text-sm text-muted-foreground">{weak.data.note}</span>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (query.trim()) search.mutate();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your solved problems…" />
        </div>
        <Button type="submit" disabled={!query.trim()}>Search</Button>
      </form>
      <div className="space-y-1.5">
        {(search.data?.results ?? []).map((r) => (
          <a
            key={r.slug}
            href={`https://leetcode.com/problems/${r.slug}/`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2 text-sm transition-colors hover:bg-accent"
          >
            <span className="flex-1 truncate">{r.title}</span>
            {r.lang && <Badge variant="outline" className="text-[10px]">{r.lang}</Badge>}
            <ExternalLink className="size-3.5 text-muted-foreground" />
          </a>
        ))}
      </div>

      {!s && !sync.isPending && (
        <p className="text-xs text-muted-foreground">
          Enter your public LeetCode username and Sync. Uses LeetCode's public (unofficial) API — solved
          counts, ranking, and recent accepted problems.
        </p>
      )}
    </div>
  );
}
