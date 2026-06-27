import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Music,
  BookOpen,
  Trophy,
  MapPin,
  Loader2,
  Plus,
  Trash2,
  Upload,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  addBook,
  addPlace,
  addSport,
  deleteBook,
  deletePlace,
  deleteSport,
  getBooks,
  getMusicTaste,
  getPlaces,
  getSports,
  importMusicTakeout,
  planTrip,
  recommendBook,
  updateBook,
  updatePlace,
} from '@/lib/api';
import { TravelMap } from './TravelMap';

type Tab = 'music' | 'books' | 'sports' | 'travel';
const TABS: { id: Tab; label: string; icon: typeof Music }[] = [
  { id: 'music', label: 'Music', icon: Music },
  { id: 'books', label: 'Books', icon: BookOpen },
  { id: 'sports', label: 'Sports', icon: Trophy },
  { id: 'travel', label: 'Travel', icon: MapPin },
];

export function CollectionsPage() {
  const [tab, setTab] = useState<Tab>('music');
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Collections</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your music, books, sports, and travel — feeds your taste profile and timeline.
        </p>
      </header>
      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'music' && <MusicTab />}
      {tab === 'books' && <BooksTab />}
      {tab === 'sports' && <SportsTab />}
      {tab === 'travel' && <TravelTab />}
    </div>
  );
}

function MusicTab() {
  const qc = useQueryClient();
  const taste = useQuery({ queryKey: ['music-taste'], queryFn: getMusicTaste, retry: false });
  const imp = useMutation({
    mutationFn: importMusicTakeout,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['music-taste'] }),
  });

  const onFile = async (file: File) => imp.mutate(await file.text());

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <p className="mb-2 text-sm font-medium">Music taste</p>
          {taste.data && taste.data.trackCount > 0 ? (
            <>
              <p className="text-sm text-muted-foreground">{taste.data.summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {taste.data.topArtists.map((a) => (
                  <Badge key={a.name} variant="secondary">
                    {a.name} <span className="ml-1 text-muted-foreground">{a.n}</span>
                  </Badge>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No music yet. Import your YouTube history from Google Takeout below.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 p-4">
          <p className="text-sm font-medium">Import from Google Takeout</p>
          <p className="text-xs text-muted-foreground">
            Takeout → YouTube and YouTube Music → <code>history/watch-history.json</code>. Upload that
            file; AbirOS extracts music (it reads “Artist - Topic” channels and official videos).
          </p>
          <label className="flex cursor-pointer items-center gap-3 rounded-md border border-dashed px-4 py-4 text-sm text-muted-foreground hover:bg-accent">
            {imp.isPending ? <Loader2 className="size-5 animate-spin" /> : <Upload className="size-5" />}
            <span>Choose watch-history.json</span>
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
          {imp.isSuccess && (
            <p className="text-xs text-emerald-400">
              Found {imp.data.parsed} music entries, imported {imp.data.imported} new tracks.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BooksTab() {
  const qc = useQueryClient();
  const books = useQuery({ queryKey: ['books'], queryFn: () => getBooks() });
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const rec = useMutation({ mutationFn: recommendBook });
  const add = useMutation({
    mutationFn: () => addBook({ title: title.trim(), author: author || undefined }),
    onSuccess: () => {
      setTitle('');
      setAuthor('');
      qc.invalidateQueries({ queryKey: ['books'] });
    },
  });
  const upd = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateBook(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }),
  });
  const del = useMutation({ mutationFn: deleteBook, onSuccess: () => qc.invalidateQueries({ queryKey: ['books'] }) });

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => rec.mutate()} disabled={rec.isPending}>
          {rec.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Recommend a book
        </Button>
      </div>
      {rec.data && (
        <Card>
          <CardContent className="prose-chat p-4 text-sm [&_p]:mb-0">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rec.data.recommendation}</ReactMarkdown>
          </CardContent>
        </Card>
      )}
      <div className="space-y-1.5">
        {(books.data?.books ?? []).map((b) => (
          <div key={b.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{b.title}</div>
              {b.author && <div className="truncate text-xs text-muted-foreground">{b.author}</div>}
            </div>
            <select
              value={b.status}
              onChange={(e) => upd.mutate({ id: b.id, status: e.target.value })}
              className="h-7 rounded-md border bg-transparent px-2 text-xs text-muted-foreground"
            >
              <option value="want_to_read">Want to read</option>
              <option value="reading">Reading</option>
              <option value="read">Read</option>
            </select>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => del.mutate(b.id)}>
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        {books.data?.books.length === 0 && <p className="text-sm text-muted-foreground">No books yet.</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim()) add.mutate();
        }}
        className="flex gap-2"
      >
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" className="flex-1" />
        <Input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Author" className="w-40" />
        <Button type="submit" size="icon" variant="secondary" disabled={!title.trim()}>
          <Plus className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function SportsTab() {
  const qc = useQueryClient();
  const sports = useQuery({ queryKey: ['sports'], queryFn: getSports });
  const [kind, setKind] = useState('sport');
  const [label, setLabel] = useState('');
  const add = useMutation({
    mutationFn: () => addSport({ kind, label: label.trim() }),
    onSuccess: () => {
      setLabel('');
      qc.invalidateQueries({ queryKey: ['sports'] });
    },
  });
  const del = useMutation({ mutationFn: deleteSport, onSuccess: () => qc.invalidateQueries({ queryKey: ['sports'] }) });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {(sports.data?.sports ?? []).map((sp) => (
          <Badge key={sp.id} variant="secondary" className="cursor-pointer gap-1" onClick={() => del.mutate(sp.id)} title="Click to remove">
            <span className="text-muted-foreground">{sp.kind}:</span> {sp.label}
            <Trash2 className="size-3 opacity-60" />
          </Badge>
        ))}
        {sports.data?.sports.length === 0 && (
          <p className="text-sm text-muted-foreground">Add the sports, teams, and athletes you follow.</p>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (label.trim()) add.mutate();
        }}
        className="flex gap-2"
      >
        <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-9 rounded-md border bg-transparent px-2 text-sm">
          <option value="sport">Sport</option>
          <option value="team">Team</option>
          <option value="athlete">Athlete</option>
        </select>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Tennis, Real Madrid, Federer" className="flex-1" />
        <Button type="submit" size="icon" variant="secondary" disabled={!label.trim()}>
          <Plus className="size-4" />
        </Button>
      </form>
    </div>
  );
}

function TravelTab() {
  const qc = useQueryClient();
  const places = useQuery({ queryKey: ['places'], queryFn: () => getPlaces() });
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const plan = useMutation({ mutationFn: () => planTrip() });
  const add = useMutation({
    mutationFn: () =>
      addPlace({
        name: name.trim(),
        country: country || undefined,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
      }),
    onSuccess: () => {
      setName('');
      setCountry('');
      setLat('');
      setLng('');
      qc.invalidateQueries({ queryKey: ['places'] });
    },
  });
  const upd = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updatePlace(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['places'] }),
  });
  const del = useMutation({ mutationFn: deletePlace, onSuccess: () => qc.invalidateQueries({ queryKey: ['places'] }) });

  const list = places.data?.places ?? [];

  return (
    <div className="space-y-4">
      <TravelMap places={list} />
      <div className="flex justify-end">
        <Button size="sm" variant="secondary" onClick={() => plan.mutate()} disabled={plan.isPending}>
          {plan.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Plan a trip
        </Button>
      </div>
      {plan.data && (
        <Card>
          <CardContent className="prose-chat p-4 text-sm [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{plan.data.itinerary}</ReactMarkdown>
          </CardContent>
        </Card>
      )}
      <div className="space-y-1.5">
        {list.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate text-sm">
              {p.name}
              {p.country ? `, ${p.country}` : ''}
            </span>
            <select
              value={p.status}
              onChange={(e) => upd.mutate({ id: p.id, status: e.target.value })}
              className="h-7 rounded-md border bg-transparent px-2 text-xs text-muted-foreground"
            >
              <option value="want_to_visit">Want to visit</option>
              <option value="visited">Visited</option>
            </select>
            <Button size="icon" variant="ghost" className="size-7" onClick={() => del.mutate(p.id)}>
              <Trash2 className="size-4 text-muted-foreground" />
            </Button>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">Add places you want to visit.</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) add.mutate();
        }}
        className="flex flex-wrap gap-2"
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Place" className="flex-1" />
        <Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Country" className="w-28" />
        <Input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="lat" className="w-20" />
        <Input value={lng} onChange={(e) => setLng(e.target.value)} placeholder="lng" className="w-20" />
        <Button type="submit" size="icon" variant="secondary" disabled={!name.trim()}>
          <Plus className="size-4" />
        </Button>
      </form>
      <p className="text-xs text-muted-foreground">
        Tip: add lat/lng to see a place on the map (geocoding-by-name can be added later).
      </p>
    </div>
  );
}
