import { useState } from 'react';
import { Activity, Receipt, History, Database, Lightbulb, HeartPulse } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalyticsTab } from './AnalyticsTab';
import { ExpensesTab } from './ExpensesTab';
import { TimelineTab } from './TimelineTab';
import { DatasetTab } from './DatasetTab';
import { InsightsTab } from './InsightsTab';
import { BodyTab } from './BodyTab';

type TabId = 'analytics' | 'body' | 'expenses' | 'insights' | 'timeline' | 'dataset';

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: 'analytics', label: 'Analytics', icon: Activity },
  { id: 'body', label: 'Body', icon: HeartPulse },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
  { id: 'timeline', label: 'Life Replay', icon: History },
  { id: 'dataset', label: 'Dataset', icon: Database },
];

export function LifePage() {
  const [tab, setTab] = useState<TabId>('analytics');

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Life</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your metrics, catch wasteful spending, replay any day, and export your life as data.
        </p>
      </header>

      <div className="mb-6 flex gap-1 border-b">
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

      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'body' && <BodyTab />}
      {tab === 'expenses' && <ExpensesTab />}
      {tab === 'insights' && <InsightsTab />}
      {tab === 'timeline' && <TimelineTab />}
      {tab === 'dataset' && <DatasetTab />}
    </div>
  );
}
