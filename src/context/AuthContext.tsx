import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  StaffUser,
  fetchMe,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  preloadAll,
  syncQueue,
  listRows,
} from '@/lib/api';
import { bgStart, bgStop } from '@/lib/bgService';
import { canClubChat, hasGuestCard, setClubFlag } from '@/lib/permissions';

const syncClubFlag = async (u: StaffUser | null) => {
  if (!hasGuestCard(u)) return;
  try {
    const rows = await listRows('guests', { mine: true });
    setClubFlag(Boolean(rows[0]?.club_member));
  } catch {
    /* нет связи — оставляем прежнее значение */
  }
};

interface AuthValue {
  user: StaffUser | null;
  loading: boolean;
  signIn: (login: string, password: string, role?: string) => Promise<void>;
  signUp: (body: {
    name: string;
    phone?: string;
    city?: string;
    login: string;
    password: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  signIn: async () => undefined,
  signUp: async () => undefined,
  signOut: async () => undefined,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then((u) => {
        setUser(u);
        if (u) {
          syncClubFlag(u);
          syncQueue().then(() => preloadAll());
          if (localStorage.getItem('hb_bg_on') === '1') {
            bgStart(canClubChat(u));
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (login: string, password: string, role?: string) => {
    const u = await apiLogin(login, password, role);
    setUser(u);
    await syncClubFlag(u);
    preloadAll();
  };

  const signUp = async (body: {
    name: string;
    phone?: string;
    city?: string;
    login: string;
    password: string;
  }) => {
    const u = await apiSignup(body);
    setUser(u);
    preloadAll();
  };

  const signOut = async () => {
    await bgStop();
    await apiLogout();
    localStorage.removeItem('hb_me');
    localStorage.removeItem('hb_club_member');
    localStorage.removeItem('hb_bg_on');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export default AuthContext;