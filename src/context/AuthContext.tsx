import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  StaffUser,
  fetchMe,
  login as apiLogin,
  signup as apiSignup,
  logout as apiLogout,
  listRows,
  cachedMe,
  pendingCount,
  syncQueue,
} from '@/lib/api';
import { initCache, clearEverything } from '@/lib/localCache';
import { startAutoSync, stopAutoSync } from '@/lib/autoSync';
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
    let alive = true;
    const boot = (u: StaffUser | null) => {
      if (!alive) return;
      setUser(u);
      if (u) {
        syncClubFlag(u);
        startAutoSync();
        if (localStorage.getItem('hb_bg_on') === '1') bgStart(canClubChat(u));
      }
    };
    const guard = setTimeout(() => {
      if (!alive) return;
      const local = cachedMe();
      if (local) setUser((prev) => prev || local);
      setLoading(false);
    }, 10000);
    initCache().then(() => {
      const local = cachedMe();
      if (local) {
        boot(local);
        setLoading(false);
        fetchMe().then((fresh) => {
          if (!alive) return;
          if (!fresh) setUser(null);
          else setUser(fresh);
        });
        return;
      }
      fetchMe()
        .then(boot)
        .finally(() => setLoading(false));
    });
    return () => {
      alive = false;
      clearTimeout(guard);
    };
  }, []);

  const signIn = async (login: string, password: string, role?: string) => {
    const u = await apiLogin(login, password, role);
    setUser(u);
    await syncClubFlag(u);
    startAutoSync();
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
    startAutoSync();
  };

  const signOut = async () => {
    if (pendingCount()) await syncQueue();
    const left = pendingCount();
    if (
      left &&
      !window.confirm(
        `На телефоне ${left} записей, которые ещё не дошли до сервера. ` +
          'Если выйти сейчас, они пропадут. Выйти всё равно?',
      )
    ) {
      return;
    }
    await bgStop();
    stopAutoSync();
    await apiLogout();
    clearEverything();
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