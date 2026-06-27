import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, FileText, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { analyzeResume, ApiRequestError, generateResume, getResume, listResumes, tailorResume } from '@/lib/api';

export function ResumeTab() {
  const qc = useQueryClient();
  const versions = useQuery({ queryKey: ['resumes'], queryFn: listResumes });
  const [selected, setSelected] = useState<string | null>(null);
  const [jd, setJd] = useState('');

  const gen = useMutation({
    mutationFn: generateResume,
    onSuccess: (v) => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
      setSelected(v.id);
    },
  });
  const tailor = useMutation({
    mutationFn: () => tailorResume(selected!, jd.trim()),
    onSuccess: (v) => {
      setJd('');
      qc.invalidateQueries({ queryKey: ['resumes'] });
      setSelected(v.id);
    },
  });
  const analyze = useMutation({ mutationFn: () => analyzeResume(jd.trim() || undefined) });
  const current = useQuery({
    queryKey: ['resume', selected],
    queryFn: () => getResume(selected!),
    enabled: !!selected,
  });

  return (
    <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div>
        <Button className="mb-3 w-full" onClick={() => gen.mutate()} disabled={gen.isPending}>
          {gen.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Generate from GitHub
        </Button>
        {gen.isError && (
          <p className="mb-2 text-xs text-destructive">
            {gen.error instanceof ApiRequestError ? gen.error.message : 'Failed.'}
          </p>
        )}
        <div className="space-y-1.5">
          {(versions.data?.versions ?? []).map((v) => (
            <button
              key={v.id}
              onClick={() => setSelected(v.id)}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                selected === v.id ? 'border-primary bg-primary/10' : 'hover:bg-accent',
              )}
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate">{v.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(v.createdAt).toLocaleDateString()}
              </span>
            </button>
          ))}
          {versions.data?.versions.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No resume yet. Generate one from your synced GitHub activity.
            </p>
          )}
        </div>
      </div>

      <div>
        {current.data ? (
          <>
            <Card className="mb-4">
              <CardContent className="prose-chat p-5 text-sm [&_h1]:mb-1 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:mt-3 [&_h2]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.data.content}</ReactMarkdown>
              </CardContent>
            </Card>
            <div className="rounded-lg border p-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Wand2 className="size-4" /> Tailor to a job description
              </div>
              <Textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste a job description…"
                className="mb-2 min-h-24"
              />
              <div className="flex gap-2">
                <Button disabled={!jd.trim() || tailor.isPending} onClick={() => tailor.mutate()}>
                  {tailor.isPending && <Loader2 className="size-4 animate-spin" />}
                  Tailor resume
                </Button>
                <Button variant="secondary" disabled={analyze.isPending} onClick={() => analyze.mutate()}>
                  {analyze.isPending && <Loader2 className="size-4 animate-spin" />}
                  Analyze{jd.trim() ? ' vs JD' : ''}
                </Button>
              </div>
              {analyze.data && (
                <div className="mt-3 space-y-2 rounded-md bg-muted/40 p-3 text-sm">
                  {analyze.data.result.overall != null && (
                    <div className="font-medium">Overall: {analyze.data.result.overall}/100</div>
                  )}
                  {analyze.data.result.gaps?.length ? (
                    <div>
                      <span className="text-muted-foreground">Gaps:</span> {analyze.data.result.gaps.join('; ')}
                    </div>
                  ) : null}
                  {analyze.data.result.suggestedBullets?.length ? (
                    <div>
                      <span className="text-muted-foreground">Suggested bullets:</span>
                      <ul className="ml-4 list-disc">
                        {analyze.data.result.suggestedBullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {analyze.data.result.alignment && (
                    <div className="text-muted-foreground">{analyze.data.result.alignment}</div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
            Generate or select a resume to view it here.
          </div>
        )}
      </div>
    </div>
  );
}
