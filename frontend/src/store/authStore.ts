import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDriver: boolean;
  telegramId: number | null;
  initData: string;
  setAuth: (token: string, user: User) => void;
  setUser: (user: User) => void;
  setInitData: (data: string) => void;
  logout: () => void;
}

function safeLocalStorage(): Storage | null {
  try {
    const k = '__test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch {
    return null;
  }
}

function getToken(): string | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try { return ls.getItem('taxigo_token'); } catch { return null; }
}

function getUser(): User | null {
  const ls = safeLocalStorage();
  if (!ls) return null;
  try { return JSON.parse(ls.getItem('taxigo_user') || 'null'); } catch { return null; }
}

const initialToken = getToken();
const initialUser = getUser();

export const useAuthStore = create<AuthState>((set, get) => ({
  token: initialToken,
  user: initialUser,
  isAuthenticated: !!initialToken,
  isAdmin: false,
  isDriver: false,
  telegramId: null,
  initData: '',

  setAuth: (token, user) => {
    try {
      localStorage.setItem('taxigo_token', token);
      localStorage.setItem('taxigo_user', JSON.stringify(user));
    } catch {
      // localStorage unavailable — proceed without persistence
    }
    set({
      token,
      user,
      isAuthenticated: true,
      isAdmin: user.role === 'admin',
      isDriver: user.role === 'driver',
    });
  },

  setUser: (user) => {
    try { localStorage.setItem('taxigo_user', JSON.stringify(user)); } catch {}
    set({ user, isAdmin: user.role === 'admin', isDriver: user.role === 'driver' });
  },

  setInitData: (data) => set({ initData: data }),

  logout: () => {
    try {
      localStorage.removeItem('taxigo_token');
      localStorage.removeItem('taxigo_user');
    } catch {}
    set({ token: null, user: null, isAuthenticated: false, isAdmin: false, isDriver: false });
  },
}));
