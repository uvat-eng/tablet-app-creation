import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { StaffUser, fetchMe, login as apiLogin, logout as apiLogout } from '@/lib/api';

interface AuthValue {
  user: StaffUser | null;
  loading: boolean;
  signIn: (login: string, password: string, role?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue>({
  user: null,
  loading: true,
  signIn: async () => undefined,
  signOut: async () => undefined,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (login: string, password: string, role?: string) => {
    const u = await apiLogin(login, password, role);
    setUser(u);
  };

  const signOut = async () => {
    await apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);

export default AuthContext;