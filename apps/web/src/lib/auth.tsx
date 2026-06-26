import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { getMe, login, logout, type Me } from './api';

/** Current user; errors (401) mean "not logged in". */
export function useMe() {
  return useQuery<Me>({ queryKey: ['me'], queryFn: getMe, retry: false, staleTime: 60_000 });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      login(username, password),
    onSuccess: (me) => qc.setQueryData(['me'], me),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => qc.setQueryData(['me'], null),
  });
}

/** Route guard: redirects to /login unless a valid session exists. */
export function RequireAuth() {
  const { data, isLoading, isError } = useMe();
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !data) return <Navigate to="/login" replace />;
  return <Outlet />;
}
