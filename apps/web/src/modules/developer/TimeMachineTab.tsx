import { useQuery } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { GitBranch, History } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getTimeMachine } from '@/lib/api';

export function TimeMachineTab() {
  const { data, isLoading } = useQuery({ queryKey: ['time-machine'], queryFn: getTimeMachine, retry: false });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data || data.cumulative.length === 0)
    return (
      <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
        <History className="mx-auto mb-2 size-6" />
        Sync GitHub first — then replay your growth as a developer over time.
      </div>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cumulative commits over time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.cumulative}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(243 80% 67%)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(243 80% 67%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(240 5% 60%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'hsl(240 5% 60%)' }} axisLine={false} tickLine={false} width={36} />
              <Tooltip contentStyle={{ background: 'hsl(240 10% 6%)', border: '1px solid hsl(240 5% 16%)', borderRadius: 8, fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="hsl(243 80% 67%)" strokeWidth={2} fill="url(#g)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Project milestones</h3>
        <div className="space-y-2">
          {data.milestones.map((m, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-card/50 px-4 py-2.5">
              <GitBranch className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-sm">{m.title}</span>
              {m.detail && <Badge variant="outline" className="text-[10px]">{m.detail}</Badge>}
              {m.date && (
                <span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
