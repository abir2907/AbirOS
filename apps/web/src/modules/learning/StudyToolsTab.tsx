import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Loader2, Sparkles, Layers, HelpCircle } from 'lucide-react';
import type { SourceSummary } from '@abiros/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  generateFlashcards,
  generateQuiz,
  listSources,
  summarizeSource,
  type SummaryRow,
} from '@/lib/api';

export function StudyToolsTab() {
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => listSources(50, 0) });
  const ready = (sources.data?.items ?? []).filter((s) => s.status === 'ready');

  if (sources.isLoading) return <p className="text-sm text-muted-foreground">Loading sources…</p>;
  if (ready.length === 0)
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No ready sources yet. Add and ingest something in Knowledge first.
      </div>
    );

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Turn any source into a summary, flashcards, or a quiz.
      </p>
      {ready.map((s) => (
        <SourceTools key={s.id} source={s} />
      ))}
    </div>
  );
}

function SourceTools({ source }: { source: SourceSummary }) {
  const qc = useQueryClient();
  const [summary, setSummary] = useState<SummaryRow | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const sum = useMutation({
    mutationFn: () => summarizeSource(source.id),
    onSuccess: (s) => setSummary(s),
  });
  const cards = useMutation({
    mutationFn: () => generateFlashcards(source.id),
    onSuccess: (r) => {
      setNote(`Created ${r.created} flashcards — review them in the Review tab.`);
      qc.invalidateQueries({ queryKey: ['due'] });
    },
  });
  const quiz = useMutation({
    mutationFn: () => generateQuiz(source.id),
    onSuccess: () => {
      setNote('Quiz created — take it in the Quizzes tab.');
      qc.invalidateQueries({ queryKey: ['quizzes'] });
    },
  });

  const busy = sum.isPending || cards.isPending || quiz.isPending;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{source.title}</div>
            <div className="text-xs text-muted-foreground">{source.type}</div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => sum.mutate()} disabled={busy}>
            {sum.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Summarize
          </Button>
          <Button size="sm" variant="ghost" onClick={() => cards.mutate()} disabled={busy}>
            {cards.isPending ? <Loader2 className="size-4 animate-spin" /> : <Layers className="size-4" />}
            Flashcards
          </Button>
          <Button size="sm" variant="ghost" onClick={() => quiz.mutate()} disabled={busy}>
            {quiz.isPending ? <Loader2 className="size-4 animate-spin" /> : <HelpCircle className="size-4" />}
            Quiz
          </Button>
        </div>

        {note && <p className="mt-3 text-xs text-emerald-400">{note}</p>}
        {(sum.isError || cards.isError || quiz.isError) && (
          <p className="mt-3 text-xs text-destructive">
            Generation failed — is Ollama running with the chat model pulled?
          </p>
        )}
        {summary && (
          <div className="mt-3 rounded-lg bg-muted/50 p-3">
            <p className="text-sm">{summary.text}</p>
            {summary.keyPoints.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {summary.keyPoints.map((k, i) => (
                  <Badge key={i} variant="outline" className="text-[11px]">
                    {k}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
