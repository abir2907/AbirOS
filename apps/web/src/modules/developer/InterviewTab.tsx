import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Mic, MicOff, Send, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { answerInterview, startInterview } from '@/lib/api';

interface QA {
  q: string;
  a: string;
  scores: Record<string, number>;
  feedback: string;
}

export function InterviewTab() {
  const [topic, setTopic] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [current, setCurrent] = useState('');
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState<QA[]>([]);

  const start = useMutation({
    mutationFn: () => startInterview(topic.trim()),
    onSuccess: (r) => {
      setSessionId(r.sessionId);
      setCurrent(r.question);
      setHistory([]);
      setAnswer('');
    },
  });

  const respond = useMutation({
    mutationFn: () => answerInterview(sessionId!, answer.trim()),
    onSuccess: (r) => {
      setHistory((h) => [...h, { q: current, a: answer, scores: r.scores, feedback: r.feedback }]);
      setCurrent(r.nextQuestion || 'That wraps up this session — start another topic anytime.');
      setAnswer('');
    },
  });

  if (!sessionId) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-4 inline-flex rounded-full bg-primary/10 p-4 text-primary">
          <MessageSquareText className="size-7" />
        </div>
        <h2 className="text-lg font-semibold">Interview Coach</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Pick a topic and practice. Each answer is scored on relevance, confidence, and delivery
          (filler words), with feedback and a follow-up question.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim()) start.mutate();
          }}
          className="mt-6 flex gap-2"
        >
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. React, system design, SQL…" />
          <Button type="submit" disabled={!topic.trim() || start.isPending}>
            {start.isPending && <Loader2 className="size-4 animate-spin" />}
            Start
          </Button>
        </form>
        {start.isError && <p className="mt-3 text-sm text-destructive">Couldn't start — is Ollama running?</p>}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {history.map((qa, i) => (
        <Card key={i} className="bg-card/40">
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">{qa.q}</p>
            <p className="text-sm text-muted-foreground">{qa.a}</p>
            <ScoreBars scores={qa.scores} />
            {qa.feedback && <p className="text-xs text-muted-foreground">💡 {qa.feedback}</p>}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardContent className="space-y-3 p-4">
          <p className="font-medium">{current}</p>
          <AnswerBox value={answer} onChange={setAnswer} />
          <Button className="w-full" disabled={!answer.trim() || respond.isPending} onClick={() => respond.mutate()}>
            {respond.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit answer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreBars({ scores }: { scores: Record<string, number> }) {
  const items: [string, number][] = [
    ['relevance', scores.relevance ?? 0],
    ['confidence', scores.confidence ?? 0],
    ['delivery', scores.delivery ?? 0],
  ];
  return (
    <div className="space-y-1">
      {items.map(([label, v]) => (
        <div key={label} className="flex items-center gap-2 text-xs">
          <span className="w-20 capitalize text-muted-foreground">{label}</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(v)}%` }} />
          </div>
          <span className="w-8 text-right text-muted-foreground">{Math.round(v)}</span>
        </div>
      ))}
      {scores.fillerCount != null && (
        <p className="text-[11px] text-muted-foreground">
          {scores.fillerCount} filler word{scores.fillerCount === 1 ? '' : 's'} · {scores.wordCount} words
        </p>
      )}
    </div>
  );
}

/** Answer textarea with optional Web Speech voice input (free, in-browser). */
function AnswerBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [listening, setListening] = useState(false);
  const recRef = useRef<any>(null);

  const toggle = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.continuous = true;
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = e.resultIndex; i < e.results.length; i++) text += e.results[i][0].transcript;
      onChange((value ? value + ' ' : '') + text.trim());
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your answer… or use the mic to speak it."
        className="min-h-28 pr-12"
      />
      <Button
        type="button"
        size="icon"
        variant={listening ? 'destructive' : 'ghost'}
        onClick={toggle}
        className="absolute right-2 top-2"
        aria-label="Toggle voice input"
      >
        {listening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      </Button>
    </div>
  );
}
