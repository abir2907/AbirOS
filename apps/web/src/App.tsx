import { Routes, Route, Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ModulePage } from '@/components/ModulePage';
import { RequireAuth } from '@/lib/auth';
import { LoginPage } from '@/modules/auth/LoginPage';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { CommandCenterPage } from '@/modules/chat/CommandCenterPage';
import { SearchPage } from '@/modules/search/SearchPage';
import { KnowledgePage } from '@/modules/knowledge/KnowledgePage';
import { DeveloperPage } from '@/modules/developer/DeveloperPage';
import { LearningPage } from '@/modules/learning/LearningPage';
import { PlannerPage } from '@/modules/planner/PlannerPage';
import { LifePage } from '@/modules/life/LifePage';
import { REGISTERED_MODULES } from '@/modules/registry';
import { Button } from '@/components/ui/button';

const LIVE = new Set([
  'dashboard',
  'chat',
  'search',
  'knowledge',
  'developer',
  'learning',
  'planner',
  'life',
]);

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="chat" element={<CommandCenterPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="knowledge" element={<KnowledgePage />} />
          <Route path="developer" element={<DeveloperPage />} />
          <Route path="learning" element={<LearningPage />} />
          <Route path="planner" element={<PlannerPage />} />
          <Route path="life" element={<LifePage />} />
          {REGISTERED_MODULES.filter((m) => !LIVE.has(m.id)).map((m) => (
            <Route key={m.id} path={m.path.replace(/^\//, '')} element={<ModulePage module={m} />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-muted-foreground/30">404</p>
      <p className="text-sm text-muted-foreground">That route doesn't exist yet.</p>
      <Button asChild variant="secondary">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}
