import { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { can } from '@/lib/permissions';
import { useSettings } from '@/context/SettingsContext';
import Login from '@/pages/Login';
import Setup from '@/pages/Setup';

interface ProtectedProps {
  children: ReactNode;
  ownerOnly?: boolean;
  section?: string;
}

const Protected = ({ children, ownerOnly = false, section }: ProtectedProps) => {
  const { user, loading } = useAuth();
  const { settings, loading: settingsLoading } = useSettings();

  if (loading || settingsLoading) {
    return (
      <div className="h-shell min-h-screen flex items-center justify-center h-mono-cap">
        Загружаем базу…
      </div>
    );
  }

  if (!user) return <Login />;

  if (!settings.configured) {
    if (user.role === 'owner') return <Setup />;
    return (
      <div className="h-shell min-h-screen flex items-center justify-center h-mono-cap px-6 text-center">
        База ещё не настроена. Владелец должен вписать название хозяйства.
      </div>
    );
  }

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