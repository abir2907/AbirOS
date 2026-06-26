import { Routes, Route, Link } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ModulePage } from '@/components/ModulePage';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { REGISTERED_MODULES } from '@/modules/registry';
import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        {REGISTERED_MODULES.filter((m) => m.path !== '/').map((m) => (
          <Route key={m.id} path={m.path.replace(/^\//, '')} element={<ModulePage module={m} />} />
        ))}
        <Route path="*" element={<NotFound />} />
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
