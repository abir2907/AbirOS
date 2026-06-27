import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, Plus, Upload, Repeat, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { addExpense, getExpenseInsights, importExpensesCsv } from '@/lib/api';

const ACCENT = 'hsl(243 80% 67%)';

export function ExpensesTab() {
  const qc = useQueryClient();
  const insights = useQuery({ queryKey: ['expense-insights'], queryFn: getExpenseInsights });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['expense-insights'] });
    qc.invalidateQueries({ queryKey: ['timeline'] });
  };
  const data = insights.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold">{(data?.totalSpend ?? 0).toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">total tracked spend</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-semibold text-primary">{data?.forecastNextMonth ?? 0}</div>
            <div className="text-xs text-muted-foreground">forecast next month</div>
          </CardContent>
        </Card>
      </div>

      {data && data.categories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={Math.max(120, data.categories.length * 30)}>
              <BarChart data={data.categories.map((c) => ({ name: c.category, value: c.total }))} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12, fill: 'hsl(240 5% 60%)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'hsl(240 5% 16% / 0.5)' }} contentStyle={{ background: 'hsl(240 10% 6%)', border: '1px solid hsl(240 5% 16%)', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {data.categories.map((_, i) => (
                    <Cell key={i} fill={ACCENT} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Repeat className="size-4" /> Detected subscriptions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(data?.recurring ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">None detected yet.</p>
            ) : (
              data!.recurring.map((r) => (
                <div key={r.merchant} className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2 text-sm">
                  <span className="flex-1 capitalize">{r.merchant}</span>
                  <Badge variant="outline" className="text-[10px]">{r.cadence}</Badge>
                  <span className="text-muted-foreground">{r.amount}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="size-4" /> Unusual charges
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {(data?.unusual ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing out of the ordinary.</p>
            ) : (
              data!.unusual.map((u) => (
                <div key={u.id} className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-2 text-sm">
                  <span className="flex-1">{u.merchant ?? 'expense'}</span>
                  <span className="text-xs text-muted-foreground">{u.spentOn}</span>
                  <Badge variant="warning">{u.amount}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <AddAndImport onChange={refresh} />
    </div>
  );
}

function AddAndImport({ onChange }: { onChange: () => void }) {
  const [spentOn, setSpentOn] = useState('');
  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('');
  const [csv, setCsv] = useState('');
  const [showImport, setShowImport] = useState(false);

  const add = useMutation({
    mutationFn: () =>
      addExpense({ spentOn, amount: Number(amount), merchant: merchant || undefined, category: category || undefined }),
    onSuccess: () => {
      setAmount('');
      setMerchant('');
      setCategory('');
      onChange();
    },
  });
  const imp = useMutation({
    mutationFn: () => importExpensesCsv(csv),
    onSuccess: () => {
      setCsv('');
      setShowImport(false);
      onChange();
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Add expense</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (spentOn && amount) add.mutate();
          }}
          className="flex flex-wrap gap-2"
        >
          <Input type="date" value={spentOn} onChange={(e) => setSpentOn(e.target.value)} className="w-40" />
          <Input type="number" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="w-28" />
          <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Merchant" className="flex-1" />
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="w-32" />
          <Button type="submit" size="icon" variant="secondary" disabled={!spentOn || !amount}>
            <Plus className="size-4" />
          </Button>
        </form>

        <button onClick={() => setShowImport((v) => !v)} className="flex items-center gap-1 text-xs text-primary">
          <Upload className="size-3" /> Import CSV (date, amount, merchant, category)
        </button>
        {showImport && (
          <div className="space-y-2">
            <Textarea value={csv} onChange={(e) => setCsv(e.target.value)} placeholder="Paste CSV…" className="min-h-24 text-xs" />
            <Button size="sm" disabled={!csv.trim() || imp.isPending} onClick={() => imp.mutate()}>
              {imp.isPending && <Loader2 className="size-4 animate-spin" />}
              Import
            </Button>
            {imp.isSuccess && (
              <p className="text-xs text-emerald-400">
                Imported {imp.data.imported} ({imp.data.skipped} skipped).
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
