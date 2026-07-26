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

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('taxigo_token'),
  user: JSON.parse(localStorage.getItem('taxigo_user') || 'null'),
  isAuthenticated: !!localStorage.getItem('taxigo_token'),
  isAdmin: false,
  isDriver: false,
  telegramId: null,
  initData: '',

  setAuth: (token, user) => {
    localStorage.setItem('taxigo_token', token);
    localStorage.setItem('taxigo_user', JSON.stringify(user));
    set({
      token,
      user,
      isAuthenticated: true,
      isAdmin: user.role === 'admin',
      isDriver: user.role === 'driver',
    });
  },

  setUser: (user) => {
    localStorage.setItem('taxigo_user', JSON.stringify(user));
    set({ user, isAdmin: user.role === 'admin', isDriver: user.role === 'driver' });
  },

  setInitData: (data) => set({ initData: data }),

  logout: () => {
    localStorage.removeItem('taxigo_token');
    localStorage.removeItem('taxigo_user');
    set({ token: null, user: null, isAuthenticated: false, isAdmin: false, isDriver: false });
  },
}));
