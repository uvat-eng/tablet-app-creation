import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/lib/permissions';
import Login from '@/pages/Login';

interface ProtectedProps {
  children: ReactNode;
  ownerOnly?: boolean;
  section?: string;
}

const Protected = ({ children, ownerOnly = false, section }: ProtectedProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-shell min-h-screen flex items-center justify-center h-mono-cap">
        Загружаем базу…
      </div>
    );
  }

  if (!user) return <Login />;

  const denied = (ownerOnly && user.role !== 'owner') || (section && !can(user, section));

  if (denied) {
    return (
      <div className="h-shell min-h-screen flex items-center justify-center h-mono-cap px-6 text-center">
        Раздел закрыт. Доступ выдаёт владелец хозяйства.
      </div>
    );
  }

  return <>{children}</>;
};

export default Protected;
