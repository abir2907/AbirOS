import { useQuery } from '@tanstack/react-query';
import { Download, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDataset, DATASET_CSV_URL } from '@/lib/api';

export function DatasetTab() {
  const { data, isLoading } = useQuery({ queryKey: ['dataset'], queryFn: getDataset });
  const rows = (data?.rows ?? []).filter(
    (r) => r.commits || r.spend || r.sources_added || r.cards_reviewed || r.journal_entries,
  );
  const preview = rows.slice(-20).reverse();

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <p className="max-w-xl text-sm text-muted-foreground">
          A daily dataset built from your activity (commits, spend, sources added, cards reviewed,
          journal entries) — export it as CSV/JSON to train your own models.
        </p>
        <Button asChild>
          <a href={DATASET_CSV_URL} download>
            <Download className="size-4" /> Download CSV
          </a>
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Building dataset…</p>
      ) : preview.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          <Database className="mx-auto mb-2 size-6" />
          No activity to aggregate yet. Use the other modules and this fills in by day.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {['date', 'commits', 'spend', 'sources', 'reviews', 'journal'].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.date} className="border-t">
                  <td className="px-3 py-1.5">{r.date}</td>
                  <td className="px-3 py-1.5">{r.commits}</td>
                  <td className="px-3 py-1.5">{r.spend.toFixed(2)}</td>
                  <td className="px-3 py-1.5">{r.sources_added}</td>
                  <td className="px-3 py-1.5">{r.cards_reviewed}</td>
                  <td className="px-3 py-1.5">{r.journal_entries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">Showing the last {preview.length} active days.</p>
    </div>
  );
}
