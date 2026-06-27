import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search as SearchIcon,
  FileText,
  GitCommit,
  Receipt,
  BookOpen,
  CalendarDays,
  Plus,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { addJournal, getTimeline, type TimelineEvent } from '@/lib/api';

const ICONS: Record<string, typeof FileText> = {
  source: FileText,
  commit: GitCommit,
  expense: Receipt,
  journal: BookOpen,
  event: CalendarDays,
};

export function TimelineTab() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const timeline = useQuery({ queryKey: ['timeline', submitted], queryFn: () => getTimeline(submitted) });

  const byDay = groupByDay(timeline.data?.events ?? []);

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_280px]">
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(q.trim());
          }}
          className="mb-4 flex gap-2"
        >
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search your life timeline…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {timeline.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : byDay.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            Nothing here yet. As you ingest notes, sync GitHub, log expenses, and journal, your life
            timeline fills in.
          </div>
        ) : (
          <div className="space-y-5">
            {byDay.map(([day, events]) => (
              <div key={day}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {new Date(day).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="space-y-1.5">
                  {events.map((e, i) => {
                    const Icon = ICONS[e.type] ?? FileText;
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
                        <Icon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-sm">{e.title}</span>
                        {e.detail && <span className="hidden truncate text-xs text-muted-foreground sm:inline">{e.detail}</span>}
                        <Badge variant="outline" className="text-[10px]">{e.type}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <JournalBox />
    </div>
  );
}

function groupByDay(events: TimelineEvent[]): [string, TimelineEvent[]][] {
  const map = new Map<string, TimelineEvent[]>();
  for (const e of events) {
    const day = e.at.slice(0, 10);
    const arr = map.get(day) ?? [];
    arr.push(e);
    map.set(day, arr);
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function JournalBox() {
  const qc = useQueryClient();
  const [entryOn, setEntryOn] = useState(new Date().toISOString().slice(0, 10));
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');

  const add = useMutation({
    mutationFn: () => addJournal({ entryOn, content: content.trim(), mood: mood ? Number(mood) : undefined }),
    onSuccess: () => {
      setContent('');
      setMood('');
      qc.invalidateQueries({ queryKey: ['timeline'] });
    },
  });

  return (
    <Card className="h-fit">
      <CardContent className="space-y-2 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="size-4" /> Journal
        </div>
        <Input type="date" value={entryOn} onChange={(e) => setEntryOn(e.target.value)} />
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="How was today?" className="min-h-28" />
        <select value={mood} onChange={(e) => setMood(e.target.value)} className="h-9 w-full rounded-md border bg-transparent px-2 text-sm">
          <option value="">Mood (optional)</option>
          <option value="1">😞 1</option>
          <option value="2">🙁 2</option>
          <option value="3">😐 3</option>
          <option value="4">🙂 4</option>
          <option value="5">😄 5</option>
        </select>
        <Button className="w-full" disabled={!content.trim() || add.isPending} onClick={() => add.mutate()}>
          {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Save entry
        </Button>
      </CardContent>
    </Card>
  );
}
