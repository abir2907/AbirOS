import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Loader2, Sparkles, MessageSquare, FileText } from 'lucide-react';
import type { Citation } from '@abiros/shared';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { createSession, streamChat } from '@/lib/api';

interface UiMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  status?: string;
  streaming?: boolean;
}

const EXAMPLES = [
  'What is AbirOS and how does it work?',
  'Summarize what I know about authentication.',
  'Explain RAG using my notes.',
];

export function CommandCenterPage() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<string | undefined>(undefined);
  const location = useLocation();
  const prefilledRef = useRef(false);

  // Auto-send a question passed in from the command palette.
  useEffect(() => {
    const q = (location.state as { q?: string } | null)?.q;
    if (q && !prefilledRef.current) {
      prefilledRef.current = true;
      void send(q);
    }
  }, [location.state]);

  const patchLast = (patch: Partial<UiMessage>) =>
    setMessages((prev) => {
      const next = [...prev];
      const i = next.length - 1;
      if (i >= 0) next[i] = { ...next[i]!, ...patch };
      return next;
    });

  async function send(text: string) {
    if (!text.trim() || busy) return;
    setBusy(true);
    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: text },
      { role: 'assistant', content: '', streaming: true, status: 'Starting…' },
    ]);

    try {
      if (!sessionRef.current) sessionRef.current = (await createSession()).id;
      let content = '';
      await streamChat(sessionRef.current, text, (e) => {
        if (e.type === 'token') {
          content += e.value;
          patchLast({ content, status: undefined });
        } else if (e.type === 'citations') {
          patchLast({ citations: e.citations });
        } else if (e.type === 'status') {
          patchLast({ status: e.message });
        } else if (e.type === 'error') {
          patchLast({ content: `${content}\n\n⚠️ ${e.message}`, status: undefined });
        }
      });
    } catch (err) {
      patchLast({ content: `⚠️ ${(err as Error).message}`, status: undefined });
    } finally {
      patchLast({ streaming: false, status: undefined });
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col px-6">
      <div className="flex-1 space-y-6 overflow-y-auto py-8 scrollbar-thin">
        {messages.length === 0 ? (
          <EmptyState onPick={(q) => send(q)} />
        ) : (
          messages.map((m, i) => <MessageBubble key={i} m={m} />)
        )}
      </div>

      <div className="sticky bottom-0 bg-background pb-6 pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2 rounded-xl border bg-card/50 p-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask anything across your knowledge…  (Enter to send, Shift+Enter for newline)"
            className="min-h-10 resize-none border-0 shadow-none focus-visible:ring-0"
            rows={1}
          />
          <Button type="submit" size="icon" disabled={!input.trim() || busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (q: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
        <Sparkles className="size-7" />
      </div>
      <h2 className="text-lg font-semibold">Command Center</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Ask questions across your whole knowledge base. Answers cite the sources they came from.
      </p>
      <div className="mt-6 flex flex-col items-stretch gap-2">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="rounded-lg border px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: UiMessage }) {
  const isUser = m.role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-secondary' : 'bg-primary/10 text-primary',
        )}
      >
        {isUser ? <span className="text-xs font-medium">You</span> : <MessageSquare className="size-4" />}
      </div>
      <div className={cn('min-w-0 max-w-[85%]', isUser && 'text-right')}>
        {isUser ? (
          <div className="inline-block rounded-2xl bg-secondary px-4 py-2 text-sm">{m.content}</div>
        ) : (
          <div className="rounded-2xl bg-card/50 px-4 py-3">
            {m.status && !m.content && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                {m.status}
              </div>
            )}
            {m.content && (
              <div className="prose-chat text-sm leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-3 [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_h1]:mb-2 [&_h1]:text-base [&_h1]:font-semibold">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
            )}
            {m.citations && m.citations.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t pt-3">
                {m.citations.map((c) => (
                  <Badge key={c.n} variant="outline" className="gap-1 text-[11px]" title={c.title}>
                    <FileText className="size-3" />
                    <span className="max-w-40 truncate">
                      [{c.n}] {c.title}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
            {m.streaming && m.content && (
              <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-primary align-middle" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
