import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Heart, Trophy, User } from 'lucide-react';
import { INTEREST_CATEGORIES, SENTIMENTS } from '@abiros/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  addAccomplishment,
  addInterest,
  deleteAccomplishment,
  deleteInterest,
  getMeData,
  saveProfile,
  type InterestRow,
} from '@/lib/api';

export function MePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Me</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What AbirOS knows about you. This is compiled into an “About Me” block and given to the
          Command Center so it answers as if it knows you.
        </p>
      </header>
      <ProfileCard />
      <InterestsCard />
      <AccomplishmentsCard />
    </div>
  );
}

function ProfileCard() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me-data'], queryFn: getMeData });
  const [bio, setBio] = useState('');
  const [personality, setPersonality] = useState('');
  const [values, setValues] = useState('');
  const [comms, setComms] = useState('');

  useEffect(() => {
    const p = me.data?.profile;
    if (p) {
      setBio(p.bio ?? '');
      setPersonality(p.personality ?? '');
      setValues((p.coreValues ?? []).join(', '));
      setComms(p.communicationPrefs ?? '');
    }
  }, [me.data?.profile]);

  const save = useMutation({
    mutationFn: () =>
      saveProfile({
        bio,
        personality,
        coreValues: values.split(',').map((v) => v.trim()).filter(Boolean),
        communicationPrefs: comms,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-data'] }),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <User className="size-4" /> Profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="Bio">
          <Textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A few sentences about you." className="min-h-20" />
        </Field>
        <Field label="Personality">
          <Input value={personality} onChange={(e) => setPersonality(e.target.value)} placeholder="e.g. curious, direct, introverted" />
        </Field>
        <Field label="Core values (comma-separated)">
          <Input value={values} onChange={(e) => setValues(e.target.value)} placeholder="craft, honesty, growth" />
        </Field>
        <Field label="How the assistant should talk to me">
          <Input value={comms} onChange={(e) => setComms(e.target.value)} placeholder="be concise; no fluff; challenge me" />
        </Field>
        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending && <Loader2 className="size-4 animate-spin" />}
            Save profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

const SENTIMENT_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  love: 'default',
  like: 'secondary',
  neutral: 'outline',
  dislike: 'destructive',
};

function InterestsCard() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me-data'], queryFn: getMeData });
  const [category, setCategory] = useState<string>('hobby');
  const [label, setLabel] = useState('');
  const [sentiment, setSentiment] = useState('like');

  const add = useMutation({
    mutationFn: () => addInterest({ category, label: label.trim(), sentiment }),
    onSuccess: () => {
      setLabel('');
      qc.invalidateQueries({ queryKey: ['me-data'] });
    },
  });
  const del = useMutation({
    mutationFn: deleteInterest,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-data'] }),
  });

  const interests = me.data?.interests ?? [];
  const byCategory = interests.reduce<Record<string, InterestRow[]>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Heart className="size-4" /> Interests &amp; tastes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Object.keys(byCategory).length === 0 && (
          <p className="text-sm text-muted-foreground">No interests yet — add what you love and hate.</p>
        )}
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat}>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {cat.replace(/_/g, ' ')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {items.map((i) => (
                <Badge
                  key={i.id}
                  variant={SENTIMENT_VARIANT[i.sentiment] ?? 'secondary'}
                  className="cursor-pointer gap-1"
                  onClick={() => del.mutate(i.id)}
                  title="Click to remove"
                >
                  {i.label}
                  <Trash2 className="size-3 opacity-60" />
                </Badge>
              ))}
            </div>
          </div>
        ))}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (label.trim()) add.mutate();
          }}
          className="flex flex-wrap gap-2 border-t pt-3"
        >
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-9 rounded-md border bg-transparent px-2 text-sm">
            {INTEREST_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. jazz, sushi, hiking" className="flex-1" />
          <select value={sentiment} onChange={(e) => setSentiment(e.target.value)} className="h-9 rounded-md border bg-transparent px-2 text-sm">
            {SENTIMENTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button type="submit" size="icon" variant="secondary" disabled={!label.trim()}>
            <Plus className="size-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AccomplishmentsCard() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ['me-data'], queryFn: getMeData });
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [desc, setDesc] = useState('');

  const add = useMutation({
    mutationFn: () =>
      addAccomplishment({ title: title.trim(), description: desc || undefined, happenedOn: when || undefined }),
    onSuccess: () => {
      setTitle('');
      setWhen('');
      setDesc('');
      qc.invalidateQueries({ queryKey: ['me-data'] });
    },
  });
  const del = useMutation({
    mutationFn: deleteAccomplishment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me-data'] }),
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Trophy className="size-4" /> Accomplishments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {(me.data?.accomplishments ?? []).map((a) => (
          <div key={a.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{a.title}</div>
              {(a.happenedOn || a.description) && (
                <div className="truncate text-xs text-muted-foreground">
                  {a.happenedOn ? `${a.happenedOn} · ` : ''}
                  {a.description}
                </div>
              )}
            </div>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => del.mutate(a.id)}>
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        {me.data?.accomplishments.length === 0 && (
          <p className="text-sm text-muted-foreground">Add the things you've done — they become searchable and shape your profile.</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) add.mutate();
          }}
          className="space-y-2 border-t pt-3"
        >
          <div className="flex gap-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What you did" className="flex-1" />
            <Input type="date" value={when} onChange={(e) => setWhen(e.target.value)} className="w-40" />
          </div>
          <div className="flex gap-2">
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Details (optional)" className="flex-1" />
            <Button type="submit" size="icon" variant="secondary" disabled={!title.trim() || add.isPending}>
              {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
