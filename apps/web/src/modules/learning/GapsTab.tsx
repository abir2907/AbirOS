import { useQuery } from '@tanstack/react-query';
import { TrendingDown, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getGaps } from '@/lib/api';

export function GapsTab() {
  const { data, isLoading } = useQuery({ queryKey: ['gaps'], queryFn: getGaps });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const gaps = data?.gaps ?? [];
  if (gaps.length === 0)
    return (
      <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
        No gaps yet. Review some flashcards and the topics you struggle with will surface here.
      </div>
    );

  return (
    <div>
      <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <TrendingDown className="size-4" /> Topics ranked by how much you're forgetting (lapses +
        overdue, low ease).
      </p>
      <div className="space-y-2">
        {gaps.map((g) => {
          const weak = g.lapses + g.overdue > 0 || g.avgEase < 2.2;
          return (
            <div
              key={g.sourceId}
              className="flex items-center gap-3 rounded-lg border bg-card/50 px-4 py-3"
            >
              {weak && <AlertTriangle className="size-4 shrink-0 text-amber-400" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{g.title}</div>
                <div className="text-xs text-muted-foreground">
                  {g.cards} cards · ease {g.avgEase}
                </div>
              </div>
              {g.overdue > 0 && <Badge variant="warning">{g.overdue} overdue</Badge>}
              {g.lapses > 0 && <Badge variant="destructive">{g.lapses} lapses</Badge>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
