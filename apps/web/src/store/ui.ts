import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface UiState {
  sidebarCollapsed: boolean;
  paletteOpen: boolean;
  mobileNavOpen: boolean;
  theme: Theme;
  toggleSidebar: () => void;
  setPaletteOpen: (open: boolean) => void;
  setMobileNav: (open: boolean) => void;
  toggleTheme: () => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('abiros-theme', theme);
}

const initialTheme: Theme =
  (localStorage.getItem('abiros-theme') as Theme | null) ?? 'dark';
applyTheme(initialTheme);

export const useUiStore = create<UiState>((set, get) => ({
  sidebarCollapsed: false,
  paletteOpen: false,
  mobileNavOpen: false,
  theme: initialTheme,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  setMobileNav: (open) => set({ mobileNavOpen: open }),
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    set({ theme: next });
  },
}));
