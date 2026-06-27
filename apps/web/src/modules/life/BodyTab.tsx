import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Utensils, Dumbbell, HeartPulse, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  addMeal,
  addWorkout,
  deleteMeal,
  deleteWorkout,
  extractBiomarkers,
  getBiomarkers,
  getDiet,
  getGym,
  listSources,
} from '@/lib/api';

export function BodyTab() {
  return (
    <div className="space-y-6">
      <DietCard />
      <GymCard />
      <HealthCard />
    </div>
  );
}

function DietCard() {
  const qc = useQueryClient();
  const diet = useQuery({ queryKey: ['diet'], queryFn: getDiet });
  const [mealType, setMealType] = useState('lunch');
  const [cal, setCal] = useState('');
  const [prot, setProt] = useState('');
  const add = useMutation({
    mutationFn: () =>
      addMeal({ mealType, calories: cal ? Number(cal) : undefined, proteinG: prot ? Number(prot) : undefined }),
    onSuccess: () => {
      setCal('');
      setProt('');
      qc.invalidateQueries({ queryKey: ['diet'] });
    },
  });
  const del = useMutation({ mutationFn: deleteMeal, onSuccess: () => qc.invalidateQueries({ queryKey: ['diet'] }) });
  const today = (diet.data?.summary ?? []).at(-1);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Utensils className="size-4" /> Diet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {today && (
          <div className="text-sm text-muted-foreground">
            Today: <b className="text-foreground">{Math.round(today.calories)}</b> kcal ·{' '}
            <b className="text-foreground">{Math.round(today.protein)}</b>g protein · {today.meals} meals
          </div>
        )}
        <div className="space-y-1.5">
          {(diet.data?.meals ?? []).slice(0, 6).map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-1.5 text-sm">
              <span className="flex-1">
                {m.mealType}
                {m.calories ? ` · ${Math.round(m.calories)} kcal` : ''}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(m.eatenAt).toLocaleDateString()}</span>
              <Button size="icon" variant="ghost" className="size-6" onClick={() => del.mutate(m.id)}>
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
          className="flex flex-wrap gap-2"
        >
          <select value={mealType} onChange={(e) => setMealType(e.target.value)} className="h-9 rounded-md border bg-transparent px-2 text-sm">
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="snack">Snack</option>
          </select>
          <Input type="number" value={cal} onChange={(e) => setCal(e.target.value)} placeholder="kcal" className="w-24" />
          <Input type="number" value={prot} onChange={(e) => setProt(e.target.value)} placeholder="protein g" className="w-28" />
          <Button type="submit" size="icon" variant="secondary">
            <Plus className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function GymCard() {
  const qc = useQueryClient();
  const gym = useQuery({ queryKey: ['gym'], queryFn: getGym });
  const [type, setType] = useState('strength');
  const [dur, setDur] = useState('');
  const add = useMutation({
    mutationFn: () => addWorkout({ type, durationMin: dur ? Number(dur) : undefined }),
    onSuccess: () => {
      setDur('');
      qc.invalidateQueries({ queryKey: ['gym'] });
    },
  });
  const del = useMutation({ mutationFn: deleteWorkout, onSuccess: () => qc.invalidateQueries({ queryKey: ['gym'] }) });
  const c = gym.data?.consistency;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Dumbbell className="size-4" /> Gym
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {c && (
          <div className="flex gap-2">
            <Badge variant="default">🔥 {c.streak}-day streak</Badge>
            <Badge variant="secondary">{c.total} workouts / 60d</Badge>
          </div>
        )}
        <div className="space-y-1.5">
          {(gym.data?.workouts ?? []).slice(0, 6).map((w) => (
            <div key={w.id} className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-1.5 text-sm">
              <span className="flex-1">
                {w.type}
                {w.durationMin ? ` · ${w.durationMin} min` : ''}
              </span>
              <span className="text-xs text-muted-foreground">{new Date(w.performedAt).toLocaleDateString()}</span>
              <Button size="icon" variant="ghost" className="size-6" onClick={() => del.mutate(w.id)}>
                <Trash2 className="size-3.5 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate();
          }}
          className="flex gap-2"
        >
          <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-md border bg-transparent px-2 text-sm">
            <option value="strength">Strength</option>
            <option value="cardio">Cardio</option>
            <option value="mobility">Mobility</option>
          </select>
          <Input type="number" value={dur} onChange={(e) => setDur(e.target.value)} placeholder="minutes" className="w-28" />
          <Button type="submit" size="icon" variant="secondary">
            <Plus className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function HealthCard() {
  const qc = useQueryClient();
  const bm = useQuery({ queryKey: ['biomarkers'], queryFn: getBiomarkers });
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => listSources(50, 0) });
  const [sourceId, setSourceId] = useState('');
  const extract = useMutation({
    mutationFn: () => extractBiomarkers(sourceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['biomarkers'] }),
  });
  const ready = (sources.data?.items ?? []).filter((s) => s.status === 'ready');

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <HeartPulse className="size-4" /> Health — biomarkers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-300/90">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {bm.data?.disclaimer ?? 'Personal tracker — not medical advice. Consult a doctor for interpretation.'}
        </div>
        <div className="space-y-1.5">
          {(bm.data?.biomarkers ?? []).map((b) => (
            <div key={b.name} className="flex items-center gap-2 rounded-lg border bg-card/50 px-3 py-1.5 text-sm">
              <span className="flex-1">{b.name}</span>
              <span className={b.out_of_range ? 'font-medium text-amber-400' : ''}>
                {b.value}
                {b.unit ? ` ${b.unit}` : ''}
              </span>
              {b.reference_low != null && b.reference_high != null && (
                <span className="text-xs text-muted-foreground">
                  ref {b.reference_low}–{b.reference_high}
                </span>
              )}
              {b.out_of_range && <Badge variant="warning">out of range</Badge>}
            </div>
          ))}
          {bm.data?.biomarkers.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No biomarkers yet. Upload a blood-test PDF in Knowledge, then extract it below.
            </p>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (sourceId) extract.mutate();
          }}
          className="flex gap-2"
        >
          <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className="h-9 flex-1 rounded-md border bg-transparent px-2 text-sm">
            <option value="">Extract biomarkers from a source…</option>
            {ready.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={!sourceId || extract.isPending}>
            {extract.isPending ? <Loader2 className="size-4 animate-spin" /> : 'Extract'}
          </Button>
        </form>
        {extract.isSuccess && (
          <p className="text-xs text-emerald-400">Extracted {extract.data.extracted} biomarker readings.</p>
        )}
      </CardContent>
    </Card>
  );
}
