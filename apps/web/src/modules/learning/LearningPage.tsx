import { useState } from 'react';
import { Brain, Layers, HelpCircle, Network, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReviewTab } from './ReviewTab';
import { StudyToolsTab } from './StudyToolsTab';
import { QuizzesTab } from './QuizzesTab';
import { GapsTab } from './GapsTab';
import { KnowledgeMap } from './KnowledgeMap';

type TabId = 'review' | 'tools' | 'quizzes' | 'map' | 'gaps';

const TABS: { id: TabId; label: string; icon: typeof Brain }[] = [
  { id: 'review', label: 'Review', icon: Brain },
  { id: 'tools', label: 'Study tools', icon: Layers },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
  { id: 'map', label: 'Knowledge map', icon: Network },
  { id: 'gaps', label: 'Gaps', icon: TrendingDown },
];

export function LearningPage() {
  const [tab, setTab] = useState<TabId>('review');

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Learning</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn what you've saved into durable knowledge — summaries, spaced-repetition flashcards,
          quizzes, and a map of how it all connects.
        </p>
      </header>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'review' && <ReviewTab />}
      {tab === 'tools' && <StudyToolsTab />}
      {tab === 'quizzes' && <QuizzesTab />}
      {tab === 'map' && <KnowledgeMap />}
      {tab === 'gaps' && <GapsTab />}
    </div>
  );
}
