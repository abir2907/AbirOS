import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2, Plus, Target, TrendingUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  createGoal,
  deleteGoal,
  getGoalDetail,
  getGoals,
  simulateGoal,
  toggleStep,
} from '@/lib/api';

export function GoalsTab() {
  const qc = useQueryClient();
  const goals = useQuery({ queryKey: ['goals'], queryFn: getGoals });
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');

  const create = useMutation({
    mutationFn: () => createGoal({ title: title.trim(), targetDate: target || undefined }),
    onSuccess: (g) => {
      setTitle('');
      setTarget('');
      qc.invalidateQueries({ queryKey: ['goals'] });
      setSelected(g.id);
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) create.mutate();
          }}
          className="mb-3 space-y-2 rounded-lg border p-3"
        >
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="New goal…" />
          <Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
          <Button type="submit" size="sm" className="w-full" disabled={!title.trim()}>
            <Plus className="size-4" /> Add goal
          </Button>
        </form>

        <div className="space-y-1.5">
          {(goals.data?.goals ?? []).map((g) => (
            <button
              key={g.id}
              onClick={() => setSelected(g.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                selected === g.id ? 'border-primary bg-primary/10' : 'hover:bg-accent',
              )}
            >
              <Target className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{g.title}</span>
            </button>
          ))}
          {goals.data?.goals.length === 0 && (
            <p className="text-sm text-muted-foreground">No goals yet — add one to simulate it.</p>
          )}
        </div>
      </div>

      {selected ? (
        <GoalDetail id={selected} onDeleted={() => setSelected(null)} />
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          Select a goal to see its roadmap and success probability.
        </div>
      )}
    </div>
  );
}

function GoalDetail({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const qc = useQueryClient();
  const detail = useQuery({ queryKey: ['goal', id], queryFn: () => getGoalDetail(id) });

  const sim = useMutation({
    mutationFn: () => simulateGoal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goal', id] }),
  });
  const step = useMutation({
    mutationFn: ({ sid, done }: { sid: string; done: boolean }) => toggleStep(sid, done),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goal', id] }),
  });
  const del = useMutation({
    mutationFn: () => deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals'] });
      onDeleted();
    },
  });

  if (detail.isLoading || !detail.data)
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  const g = detail.data;
  const latest = g.snapshots.at(-1);

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{g.title}</h2>
          {g.targetDate && (
            <p className="text-sm text-muted-foreground">Target: {g.targetDate}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => sim.mutate()} disabled={sim.isPending}>
            {sim.isPending ? <Loader2 className="size-4 animate-spin" /> : <TrendingUp className="size-4" />}
            Simulate
          </Button>
          <Button size="icon" variant="ghost" onClick={() => del.mutate()} aria-label="Delete goal">
            <Trash2 className="size-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {latest && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold text-primary">{Math.round(latest.probability)}%</span>
              <span className="text-sm text-muted-foreground">success probability</span>
            </div>
            {latest.rationale && <p className="mt-1 text-sm text-muted-foreground">{latest.rationale}</p>}
            {g.snapshots.length > 1 && (
              <ResponsiveContainer width="100%" height={120} className="mt-3">
                <LineChart data={g.snapshots.map((s) => ({ t: new Date(s.capturedAt).toLocaleDateString(), p: s.probability }))}>
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: 'hsl(240 5% 60%)' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip contentStyle={{ background: 'hsl(240 10% 6%)', border: '1px solid hsl(240 5% 16%)', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="p" stroke="hsl(243 80% 67%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      <h3 className="mb-2 text-sm font-semibold">Roadmap</h3>
      {g.steps.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No steps yet. Click <b>Simulate</b> to generate a roadmap.
        </p>
      ) : (
        <div className="space-y-1.5">
          {g.steps.map((stp) => (
            <label key={stp.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
              <input
                type="checkbox"
                checked={stp.done}
                onChange={(e) => step.mutate({ sid: stp.id, done: e.target.checked })}
                className="size-4 accent-[hsl(var(--primary))]"
              />
              <span className={cn('text-sm', stp.done && 'text-muted-foreground line-through')}>
                {stp.title}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
