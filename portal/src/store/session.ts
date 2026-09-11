import { create } from 'zustand';

interface Session {
  apiKey: string;
  role: string;
  userId: string;
  gatewayUrl: string;
  isAdmin: boolean;
}

interface SessionStore extends Session {
  save: (s: Session) => void;
  clear: () => void;
  hydrate: () => boolean;
}

export const useSession = create<SessionStore>((set) => ({
  apiKey: '',
  role: '',
  userId: '',
  gatewayUrl: 'http://localhost:8000',
  isAdmin: false,

  save: (s) => {
    sessionStorage.setItem('shadow_api_key',      s.apiKey);
    sessionStorage.setItem('shadow_role',         s.role);
    sessionStorage.setItem('shadow_user_id',      s.userId);
    sessionStorage.setItem('shadow_gateway_url',  s.gatewayUrl);
    set({ ...s, isAdmin: s.role === 'admin' });
  },

  clear: () => {
    sessionStorage.clear();
    set({ apiKey: '', role: '', userId: '', gatewayUrl: '', isAdmin: false });
  },

  hydrate: () => {
    const apiKey     = sessionStorage.getItem('shadow_api_key')     ?? '';
    const role       = sessionStorage.getItem('shadow_role')        ?? '';
    const userId     = sessionStorage.getItem('shadow_user_id')     ?? '';
    const gatewayUrl = sessionStorage.getItem('shadow_gateway_url') ?? 'http://localhost:8000';
    if (!apiKey) return false;
    set({ apiKey, role, userId, gatewayUrl, isAdmin: role === 'admin' });
    return true;
  },
}));
