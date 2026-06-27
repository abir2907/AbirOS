import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Activity, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { addMetricPoint, createMetric, getMetric, getMetrics } from '@/lib/api';

export function AnalyticsTab() {
  const qc = useQueryClient();
  const metrics = useQuery({ queryKey: ['metrics'], queryFn: getMetrics });
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');

  const create = useMutation({
    mutationFn: () => createMetric(name.trim(), unit.trim() || undefined),
    onSuccess: (m) => {
      setName('');
      setUnit('');
      qc.invalidateQueries({ queryKey: ['metrics'] });
      setSelected(m.id);
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-[260px_1fr]">
      <div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
          className="mb-3 space-y-2 rounded-lg border p-3"
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Metric (e.g. Sleep)" />
          <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit (e.g. hours)" />
          <Button type="submit" size="sm" className="w-full" disabled={!name.trim()}>
            <Plus className="size-4" /> Add metric
          </Button>
        </form>
        <div className="space-y-1.5">
          {(metrics.data?.metrics ?? []).map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                selected === m.id ? 'border-primary bg-primary/10' : 'hover:bg-accent',
              )}
            >
              <Activity className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{m.name}</span>
              {m.last_value != null && (
                <span className="text-xs text-muted-foreground">
                  {m.last_value}
                  {m.unit ? ` ${m.unit}` : ''}
                </span>
              )}
            </button>
          ))}
          {metrics.data?.metrics.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No metrics yet. Track sleep, gym, mood, coding minutes, anything.
            </p>
          )}
        </div>
      </div>

      {selected ? (
        <MetricDetail id={selected} />
      ) : (
        <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          Select a metric to chart it and see a simple forecast.
        </div>
      )}
    </div>
  );
}

function MetricDetail({ id }: { id: string }) {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ['metric', id], queryFn: () => getMetric(id) });
  const [value, setValue] = useState('');

  const add = useMutation({
    mutationFn: () => addMetricPoint(id, Number(value)),
    onSuccess: () => {
      setValue('');
      qc.invalidateQueries({ queryKey: ['metric', id] });
      qc.invalidateQueries({ queryKey: ['metrics'] });
    },
  });

  if (data.isLoading || !data.data) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const d = data.data;
  const chart = [
    ...d.points.map((p, i) => ({ i, value: p.value })),
    ...d.forecast.map((f, i) => ({ i: d.points.length + i, forecast: f })),
  ];

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {d.metric.name} <span className="text-sm text-muted-foreground">avg {d.stats.average}</span>
        </h2>
      </div>

      {d.points.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chart}>
            <XAxis dataKey="i" hide />
            <YAxis tick={{ fontSize: 11, fill: 'hsl(240 5% 60%)' }} axisLine={false} tickLine={false} width={32} />
            <Tooltip contentStyle={{ background: 'hsl(240 10% 6%)', border: '1px solid hsl(240 5% 16%)', borderRadius: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="value" stroke="hsl(243 80% 67%)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="forecast" stroke="hsl(160 70% 45%)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-muted-foreground">No data points yet — log one below.</p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim() && !Number.isNaN(Number(value))) add.mutate();
        }}
        className="mt-4 flex gap-2"
      >
        <Input
          type="number"
          step="any"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={`Today's ${d.metric.name.toLowerCase()}…`}
        />
        <Button type="submit" disabled={!value.trim() || add.isPending}>
          {add.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Log'}
        </Button>
      </form>
      <p className="mt-2 text-xs text-muted-foreground">
        Green dashed line = simple 7-step trend forecast.
      </p>
    </div>
  );
}
