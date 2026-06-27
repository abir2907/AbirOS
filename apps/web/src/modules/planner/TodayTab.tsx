import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Sparkles, Plus, Calendar, Upload, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  addPlanTask,
  generatePlan,
  getCalendar,
  getToday,
  importIcs,
  togglePlanItem,
  type PlanItem,
} from '@/lib/api';

const KIND_COLOR: Record<string, string> = {
  event: 'default',
  study: 'warning',
  assignment: 'destructive',
  goal: 'success',
};

export function TodayTab() {
  const qc = useQueryClient();
  const plan = useQuery({ queryKey: ['today'], queryFn: () => getToday() });
  const [task, setTask] = useState('');

  const gen = useMutation({
    mutationFn: () => generatePlan(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today'] }),
  });
  const add = useMutation({
    mutationFn: () => addPlanTask(plan.data!.date, task.trim()),
    onSuccess: () => {
      setTask('');
      qc.invalidateQueries({ queryKey: ['today'] });
    },
  });
  const toggle = useMutation({
    mutationFn: ({ id, done }: { id: string; done: boolean }) => togglePlanItem(id, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['today'] }),
  });

  const items = plan.data?.items ?? [];

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Today · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
          </h2>
          <Button size="sm" onClick={() => gen.mutate()} disabled={gen.isPending}>
            {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Generate plan
          </Button>
        </div>

        {gen.isError && (
          <p className="mb-3 text-sm text-destructive">Plan generation failed — is Ollama running?</p>
        )}

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
            No plan yet. Click <b>Generate plan</b> (uses your calendar, assignments &amp; goals), or
            add tasks below.
          </div>
        ) : (
          <div className="space-y-1.5">
            {items.map((it) => (
              <PlanRow key={it.id} item={it} onToggle={(done) => toggle.mutate({ id: it.id, done })} />
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (task.trim()) add.mutate();
          }}
          className="mt-3 flex gap-2"
        >
          <Input value={task} onChange={(e) => setTask(e.target.value)} placeholder="Add a task…" />
          <Button type="submit" size="icon" variant="secondary" disabled={!task.trim()}>
            <Plus className="size-4" />
          </Button>
        </form>
      </div>

      <CalendarSidebar />
    </div>
  );
}

function PlanRow({ item, onToggle }: { item: PlanItem; onToggle: (done: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
      <input
        type="checkbox"
        checked={item.done}
        onChange={(e) => onToggle(e.target.checked)}
        className="size-4 accent-[hsl(var(--primary))]"
      />
      {(item.startTime || item.endTime) && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          {item.startTime}
          {item.endTime ? `–${item.endTime}` : ''}
        </span>
      )}
      <span className={cn('flex-1 text-sm', item.done && 'text-muted-foreground line-through')}>
        {item.title}
      </span>
      <Badge variant={(KIND_COLOR[item.kind] as 'default') ?? 'secondary'} className="text-[10px]">
        {item.kind}
      </Badge>
    </div>
  );
}

function CalendarSidebar() {
  const qc = useQueryClient();
  const cal = useQuery({ queryKey: ['calendar'], queryFn: getCalendar });
  const [ics, setIcs] = useState('');
  const [show, setShow] = useState(false);
  const imp = useMutation({
    mutationFn: () => importIcs(ics),
    onSuccess: () => {
      setIcs('');
      setShow(false);
      qc.invalidateQueries({ queryKey: ['calendar'] });
      qc.invalidateQueries({ queryKey: ['today'] });
    },
  });

  const events = (cal.data?.events ?? []).slice(0, 8);

  return (
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Calendar className="size-4" /> Upcoming
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events. Import a calendar below.</p>
        ) : (
          events.map((e) => (
            <div key={e.id} className="text-xs">
              <div className="font-medium">{e.title}</div>
              <div className="text-muted-foreground">
                {new Date(e.startAt).toLocaleString([], {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          ))
        )}
        <button
          onClick={() => setShow((v) => !v)}
          className="flex items-center gap-1 pt-1 text-xs text-primary"
        >
          <Upload className="size-3" /> Import .ics
        </button>
        {show && (
          <div className="space-y-2">
            <Textarea
              value={ics}
              onChange={(e) => setIcs(e.target.value)}
              placeholder="Paste .ics file contents…"
              className="min-h-24 text-xs"
            />
            <Button size="sm" className="w-full" disabled={!ics.trim() || imp.isPending} onClick={() => imp.mutate()}>
              {imp.isPending && <Loader2 className="size-4 animate-spin" />}
              Import
            </Button>
            {imp.isSuccess && (
              <p className="text-xs text-emerald-400">Imported {imp.data.imported} events.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
