import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/ui/icon';
import { BlockedUser, loadBlocked, unblockUser } from '@/lib/moderationApi';
import { toast } from 'sonner';

const BlockedList = () => {
  const [items, setItems] = useState<BlockedUser[]>([]);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setItems(await loadBlocked());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const drop = async (staffId: number, name: string) => {
    try {
      await unblockUser(staffId);
      toast.success(`${name} снова виден в чатах`);
      load();
    } catch {
      toast.error('Не получилось — проверьте связь');
    }
  };

  return (
    <div className="border border-[#e2e2df]">
      <div className="px-4 py-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon name="UserMinus" size={18} fallback="Ban" className="shrink-0" />
          <div>
            <div className="h-head text-[17px]">Скрытые участники</div>
            <div className="h-label mt-1">
              {items.length
                ? `Вы не видите сообщения: ${items.length}`
                : 'Вы никого не скрывали'}
            </div>
          </div>
        </div>
        {items.length > 0 && (
          <button className="h-cta-ghost" onClick={() => setOpen((v) => !v)}>
            {open ? 'Свернуть' : 'Показать'}
          </button>
        )}
      </div>

      {open && items.length > 0 && (
        <div className="border-t border-[#e2e2df]">
          {items.map((b, i) => (
            <div
              key={b.staffId}
              className="flex flex-wrap gap-2 items-center justify-between px-4 py-3"
              style={{ borderTop: i ? '1px solid #e2e2df' : 'none' }}
            >
              <span className="text-[0.8em]">{b.name || 'Участник'}</span>
              <button
                className="h-label underline"
                onClick={() => drop(b.staffId, b.name || 'Участник')}
              >
                Показывать снова
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BlockedList;
