import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { attemptQuiz, getQuiz, listQuizzes, type AttemptResult } from '@/lib/api';

export function QuizzesTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const quizzes = useQuery({ queryKey: ['quizzes'], queryFn: listQuizzes });

  if (selected) return <TakeQuiz id={selected} onBack={() => setSelected(null)} />;

  if (quizzes.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const list = quizzes.data?.quizzes ?? [];
  if (list.length === 0)
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No quizzes yet. Generate one from a source in “Study tools”.
      </div>
    );

  return (
    <div className="space-y-2">
      {list.map((q) => (
        <button
          key={q.id}
          onClick={() => setSelected(q.id)}
          className="flex w-full items-center gap-3 rounded-lg border bg-card/50 px-4 py-3 text-left transition-colors hover:bg-accent"
        >
          <div className="flex-1">
            <div className="text-sm font-medium">{q.title}</div>
            <div className="text-xs text-muted-foreground">
              {new Date(q.createdAt).toLocaleString()}
            </div>
          </div>
          <span className="text-xs text-muted-foreground">Take →</span>
        </button>
      ))}
    </div>
  );
}

function TakeQuiz({ id, onBack }: { id: string; onBack: () => void }) {
  const quiz = useQuery({ queryKey: ['quiz', id], queryFn: () => getQuiz(id) });
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<AttemptResult | null>(null);
  const submit = useMutation({
    mutationFn: () =>
      attemptQuiz(
        id,
        (quiz.data?.questions ?? []).map((_, i) => answers[i] ?? -1),
      ),
    onSuccess: setResult,
  });

  if (quiz.isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const questions = quiz.data?.questions ?? [];

  return (
    <div className="mx-auto max-w-2xl">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-3">
        <ArrowLeft className="size-4" /> All quizzes
      </Button>
      <h2 className="mb-4 text-lg font-semibold">{quiz.data?.quiz.title}</h2>

      {result && (
        <div className="mb-4 rounded-lg border bg-card/50 p-4 text-center">
          <div className="text-2xl font-semibold">
            {result.score} / {result.total}
          </div>
          <div className="text-sm text-muted-foreground">
            {Math.round((result.score / result.total) * 100)}% correct
          </div>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, qi) => (
          <Card key={q.id}>
            <CardContent className="p-4">
              <p className="mb-3 text-sm font-medium">
                {qi + 1}. {q.question}
              </p>
              <div className="space-y-1.5">
                {q.options.map((opt, oi) => {
                  const chosen = answers[qi] === oi;
                  const res = result?.results[qi];
                  const isAnswer = res && res.answerIndex === oi;
                  const isWrongChoice = res && res.chosen === oi && !res.correct;
                  return (
                    <button
                      key={oi}
                      disabled={!!result}
                      onClick={() => setAnswers((a) => ({ ...a, [qi]: oi }))}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                        !result && chosen && 'border-primary bg-primary/10',
                        !result && !chosen && 'hover:bg-accent',
                        isAnswer && 'border-emerald-500/50 bg-emerald-500/10',
                        isWrongChoice && 'border-destructive/50 bg-destructive/10',
                      )}
                    >
                      {isAnswer && <CheckCircle2 className="size-4 text-emerald-400" />}
                      {isWrongChoice && <XCircle className="size-4 text-destructive" />}
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
              {result?.results[qi]?.explanation && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {result.results[qi]!.explanation}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {!result && (
        <Button
          className="mt-4 w-full"
          disabled={Object.keys(answers).length < questions.length || submit.isPending}
          onClick={() => submit.mutate()}
        >
          {submit.isPending && <Loader2 className="size-4 animate-spin" />}
          Submit
        </Button>
      )}
    </div>
  );
}
