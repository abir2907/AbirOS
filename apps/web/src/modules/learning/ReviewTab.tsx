import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Loader2, PartyPopper, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getDueFlashcards, reviewFlashcard, type Rating } from '@/lib/api';

const RATINGS: { rating: Rating; label: string; variant: 'destructive' | 'secondary' | 'default' | 'outline' }[] = [
  { rating: 'again', label: 'Again', variant: 'destructive' },
  { rating: 'hard', label: 'Hard', variant: 'secondary' },
  { rating: 'good', label: 'Good', variant: 'default' },
  { rating: 'easy', label: 'Easy', variant: 'outline' },
];

export function ReviewTab() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ['due'], queryFn: getDueFlashcards });
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const review = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: Rating }) => reviewFlashcard(id, rating),
    onSuccess: () => {
      setRevealed(false);
      const cards = data?.cards ?? [];
      if (idx + 1 < cards.length) setIdx(idx + 1);
      else {
        setIdx(0);
        refetch();
      }
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const cards = data?.cards ?? [];
  const current = cards[idx];

  if (!current)
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
        <PartyPopper className="mb-3 size-8 text-primary" />
        <p className="text-sm font-medium">All caught up!</p>
        <p className="mt-1 text-sm text-muted-foreground">
          No flashcards due. Generate some from a source in “Study tools”.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => refetch()}>
          <RotateCcw className="size-4" /> Refresh
        </Button>
      </div>
    );

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {data?.count} due
      </div>
      <Card className="min-h-52">
        <CardContent className="flex min-h-52 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-medium">{current.front}</p>
          {revealed && (
            <>
              <div className="w-full border-t" />
              <p className="text-muted-foreground">{current.back}</p>
            </>
          )}
        </CardContent>
      </Card>

      <div className="mt-4">
        {!revealed ? (
          <Button className="w-full" onClick={() => setRevealed(true)}>
            Show answer
          </Button>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r) => (
              <Button
                key={r.rating}
                variant={r.variant}
                disabled={review.isPending}
                onClick={() => review.mutate({ id: current.id, rating: r.rating })}
              >
                {review.isPending ? <Loader2 className="size-4 animate-spin" /> : r.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
