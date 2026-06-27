import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Loader2, Plus, Trash2, Sparkles, BookMarked } from 'lucide-react';
import { STUDY_STATUSES } from '@abiros/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  addStudyItem,
  deleteStudyItem,
  getStudyBacklog,
  suggestNextStudy,
  updateStudyItem,
} from '@/lib/api';

const STATUS_LABEL: Record<string, string> = {
  want_to_study: 'Want to study',
  studying: 'Studying',
  studied: 'Studied',
};

export function BacklogTab() {
  const qc = useQueryClient();
  const backlog = useQuery({ queryKey: ['study'], queryFn: () => getStudyBacklog() });
  const [topic, setTopic] = useState('');

  const add = useMutation({
    mutationFn: () => addStudyItem({ topic: topic.trim() }),
    onSuccess: () => {
      setTopic('');
      qc.invalidateQueries({ queryKey: ['study'] });
    },
  });
  const upd = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateStudyItem(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study'] }),
  });
  const del = useMutation({
    mutationFn: deleteStudyItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['study'] }),
  });
  const suggest = useMutation({ mutationFn: suggestNextStudy });

  const items = backlog.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Things you want to study, are studying, and have studied.</p>
        <Button size="sm" variant="secondary" onClick={() => suggest.mutate()} disabled={suggest.isPending}>
          {suggest.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Suggest next
        </Button>
      </div>

      {suggest.data && (
        <Card>
          <CardContent className="prose-chat p-4 text-sm [&_li]:ml-4 [&_li]:list-disc [&_p]:mb-2">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{suggest.data.suggestion}</ReactMarkdown>
          </CardContent>
        </Card>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (topic.trim()) add.mutate();
        }}
        className="flex gap-2"
      >
        <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Add a topic to study…" />
        <Button type="submit" size="icon" variant="secondary" disabled={!topic.trim()}>
          <Plus className="size-4" />
        </Button>
      </form>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center text-sm text-muted-foreground">
          <BookMarked className="mx-auto mb-2 size-6" />
          Your study backlog is empty. Add a topic above.
        </div>
      ) : (
        <div className="space-y-1.5">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-3 rounded-lg border bg-card/50 px-3 py-2">
              <span className="flex-1 text-sm">{it.topic}</span>
              <select
                value={it.status}
                onChange={(e) => upd.mutate({ id: it.id, status: e.target.value })}
                className="h-7 rounded-md border bg-transparent px-2 text-xs text-muted-foreground"
              >
                {STUDY_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => del.mutate(it.id)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
