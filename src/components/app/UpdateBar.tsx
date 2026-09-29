import Icon from '@/components/ui/icon';
import useAppUpdate from '@/hooks/useAppUpdate';

const UpdateBar = () => {
  const { ready, apply } = useAppUpdate();

  if (!ready) return null;

  return (
    <div
      className="fixed left-0 right-0 z-[60] px-4 flex justify-center"
      style={{ bottom: 'calc(1rem + var(--safe-bottom))' }}
    >
      <div
        className="flex items-center gap-3 px-4 py-3 border border-black shadow-lg max-w-[520px] w-full"
        style={{ background: '#1f1f1d', color: '#fff' }}
      >
        <Icon name="ArrowDownCircle" size={18} fallback="Download" className="shrink-0" />
        <span className="text-[0.76em] leading-snug flex-1">
          Вышла новая версия приложения
        </span>
        <button
          onClick={apply}
          className="px-3 py-2 text-[0.72em] uppercase tracking-[0.06em] whitespace-nowrap"
          style={{ background: '#fff', color: '#1f1f1d' }}
        >
          Обновить
        </button>
      </div>
    </div>
  );
};

export default UpdateBar;
