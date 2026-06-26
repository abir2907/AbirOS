import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Hexagon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLogin, useMe } from '@/lib/auth';
import { ApiRequestError } from '@/lib/api';

export function LoginPage() {
  const navigate = useNavigate();
  const me = useMe();
  const loginMut = useLogin();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Already logged in → bounce to the app.
  if (me.data) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await loginMut.mutateAsync({ username, password });
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiRequestError ? err.message : 'Login failed. Check the API is running.',
      );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex items-center gap-2">
            <Hexagon className="size-7 text-primary" />
            <span className="text-2xl font-semibold tracking-tight">AbirOS</span>
          </div>
          <CardTitle className="text-base font-medium">Sign in</CardTitle>
          <CardDescription>Your personal AI operating system.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <Input
              placeholder="Username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
            <Input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loginMut.isPending}>
              {loginMut.isPending && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Single-user. Set your password with <code>pnpm setup:password</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
