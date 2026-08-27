import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import Login from '@/pages/Login';

const Protected = ({ children, ownerOnly = false }: { children: ReactNode; ownerOnly?: boolean }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-shell min-h-screen flex items-center justify-center h-mono-cap">
        Загружаем базу…
      </div>
    );
  }

  if (!user) return <Login />;

  if (ownerOnly && user.role !== 'owner') {
    return (
      <div className="h-shell min-h-screen flex items-center justify-center h-mono-cap px-6 text-center">
        Раздел доступен только владельцу хозяйства.
      </div>
    );
  }

  return <>{children}</>;
};

export default Protected;
