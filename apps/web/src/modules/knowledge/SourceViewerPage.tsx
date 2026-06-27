import { useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getSource, getSourceChunks } from '@/lib/api';

export function SourceViewerPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const targetChunk = (location.state as { chunkId?: string } | null)?.chunkId;
  const source = useQuery({ queryKey: ['source', id], queryFn: () => getSource(id!), enabled: !!id });
  const chunks = useQuery({
    queryKey: ['source-chunks', id],
    queryFn: () => getSourceChunks(id!),
    enabled: !!id,
  });
  const targetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (targetChunk && targetRef.current) {
      targetRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [targetChunk, chunks.data]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-3">
        <Link to="/knowledge">
          <ArrowLeft className="size-4" /> Knowledge
        </Link>
      </Button>

      <header className="mb-3 flex items-center gap-3">
        <FileText className="size-5 shrink-0 text-muted-foreground" />
        <h1 className="min-w-0 truncate text-xl font-semibold">{source.data?.title ?? 'Source'}</h1>
        {source.data && <Badge variant="outline">{source.data.type}</Badge>}
      </header>

      {source.data?.tags && source.data.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {source.data.tags.map((t) => (
            <Badge key={t} variant="secondary" className="text-[11px]">
              {t}
            </Badge>
          ))}
        </div>
      )}

      {chunks.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {(chunks.data?.chunks ?? []).map((c) => {
            const isTarget = c.id === targetChunk;
            return (
              <div
                key={c.id}
                ref={isTarget ? targetRef : undefined}
                className={cn(
                  'whitespace-pre-wrap rounded-lg border p-4 text-sm leading-relaxed',
                  isTarget ? 'border-primary bg-primary/5' : 'bg-card/40',
                )}
              >
                {c.text}
              </div>
            );
          })}
          {chunks.data?.chunks.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No text chunks yet (it may still be processing, or it's an image with no detected text).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
