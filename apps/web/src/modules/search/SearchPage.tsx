import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Search as SearchIcon, Loader2, FileText } from 'lucide-react';
import type { SearchHit } from '@abiros/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { search, ApiRequestError } from '@/lib/api';

export function SearchPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const mut = useMutation({
    mutationFn: (q: string) => search(q, 10),
    onSuccess: () => setSubmitted(true),
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) mut.mutate(query.trim());
  };

  const hits = mut.data?.hits ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hybrid semantic + keyword search across everything you've ingested.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mb-6 flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search your knowledge…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <Button type="submit" disabled={!query.trim() || mut.isPending}>
          {mut.isPending && <Loader2 className="size-4 animate-spin" />}
          Search
        </Button>
      </form>

      {mut.isError && (
        <p className="text-sm text-destructive">
          {mut.error instanceof ApiRequestError ? mut.error.message : 'Search failed.'}
        </p>
      )}

      {submitted && !mut.isPending && hits.length === 0 && (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          No matches. Try different words, or add more sources in Knowledge.
        </div>
      )}

      <div className="space-y-3">
        {hits.map((h) => (
          <ResultCard key={h.chunkId} hit={h} />
        ))}
      </div>
    </div>
  );
}

function ResultCard({ hit }: { hit: SearchHit }) {
  return (
    <div className="rounded-lg border bg-card/50 p-4">
      <div className="mb-2 flex items-center gap-2">
        <FileText className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{hit.sourceTitle}</span>
        <Badge variant="outline" className="text-[10px]">
          {hit.sourceType}
        </Badge>
        <span className="ml-auto text-xs text-muted-foreground">
          score {hit.score.toFixed(3)}
        </span>
      </div>
      <p className="line-clamp-4 text-sm text-muted-foreground">{hit.text}</p>
    </div>
  );
}
