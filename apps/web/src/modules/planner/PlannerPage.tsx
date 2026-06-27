import { useState } from 'react';
import { CalendarDays, Target, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TodayTab } from './TodayTab';
import { GoalsTab } from './GoalsTab';
import { UniversityTab } from './UniversityTab';

type TabId = 'today' | 'goals' | 'university';

const TABS: { id: TabId; label: string; icon: typeof Target }[] = [
  { id: 'today', label: 'Today', icon: CalendarDays },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'university', label: 'University', icon: GraduationCap },
];

export function PlannerPage() {
  const [tab, setTab] = useState<TabId>('today');

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Plan your day, steer long-term goals, and stay on top of coursework.
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

      {tab === 'today' && <TodayTab />}
      {tab === 'goals' && <GoalsTab />}
      {tab === 'university' && <UniversityTab />}
    </div>
  );
}
