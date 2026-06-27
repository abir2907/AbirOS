import { useMutation, useQuery } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Lightbulb, Loader2, CalendarRange, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getCorrelations, getWeeklyReview } from '@/lib/api';

export function InsightsTab() {
  const corr = useQuery({ queryKey: ['correlations'], queryFn: getCorrelations });
  const review = useMutation({ mutationFn: getWeeklyReview });

  const insights = corr.data?.insights ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Lightbulb className="size-4" /> Patterns in your life
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {corr.isLoading ? (
            <p className="text-sm text-muted-foreground">Crunching your data…</p>
          ) : insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Not enough data yet. Log a metric (sleep, mood…) for a couple of weeks and patterns
              across your activity will surface here.
            </p>
          ) : (
            insights.map((i, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-lg border bg-card/50 px-4 py-2.5">
                {i.r > 0 ? (
                  <TrendingUp className="size-4 shrink-0 text-emerald-400" />
                ) : (
                  <TrendingDown className="size-4 shrink-0 text-amber-400" />
                )}
                <span className="flex-1 text-sm">{i.text}</span>
                <Badge variant="outline" className="text-[10px]">
                  r={i.r}
                </Badge>
              </div>
            ))
          )}
          <p className="pt-1 text-xs text-muted-foreground">
            Correlation, not causation — these are gentle nudges, not proof.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <CalendarRange className="size-4" /> Weekly review
          </CardTitle>
          <Button size="sm" variant="secondary" onClick={() => review.mutate()} disabled={review.isPending}>
            {review.isPending && <Loader2 className="size-4 animate-spin" />}
            Generate
          </Button>
        </CardHeader>
        <CardContent>
          {review.isError && <p className="text-sm text-destructive">Failed — is Ollama running?</p>}
          {review.data ? (
            <div className="prose-chat text-sm leading-relaxed [&_h1]:mb-1 [&_h1]:text-base [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2 [&_strong]:font-semibold">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{review.data.review}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Generate an AI summary of your past 7 days — commits, learning, spending, and wins.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
