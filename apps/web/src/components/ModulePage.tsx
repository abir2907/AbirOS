import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { RegisteredModule } from '@/modules/registry';

interface ModulePageProps {
  module: RegisteredModule;
  children?: ReactNode;
}

/** Standard page header + tailored empty state used by every module shell. */
export function ModulePage({ module, children }: ModulePageProps) {
  const Icon = module.ui.icon;
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Icon className="size-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{module.label}</h1>
            <Badge variant={module.phase === 0 ? 'success' : 'secondary'}>
              {module.phase === 0 ? 'available' : `Phase ${module.phase}`}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
        </div>
      </header>

      {children ?? <EmptyState module={module} />}
    </div>
  );
}

function EmptyState({ module }: { module: RegisteredModule }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
      <div className="mb-4 rounded-full bg-muted p-4 text-muted-foreground">
        <module.ui.icon className="size-7" />
      </div>
      <p className="max-w-md text-sm text-muted-foreground">{module.ui.hint}</p>
      {module.ui.comingSoon.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Sparkles className="size-3.5" />
            Coming in Phase {module.phase}
          </div>
          <div className="flex max-w-lg flex-wrap justify-center gap-2">
            {module.ui.comingSoon.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
