import { useCallback, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Icon from '@/components/ui/icon';
import { Row, listHunterAccess, saveHunterAccess, revokeHunterAccess } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  guests: Row[];
}

const translit = (name: string) => {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ы: 'y', э: 'e',
    ю: 'yu', я: 'ya', ь: '', ъ: '',
  };
  return name
    .toLowerCase()
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .slice(0, 30);
};

const randomPass = () => Math.random().toString(36).slice(-8);

const HunterAccessDialog = ({ open, onOpenChange, guests }: Props) => {
  const [access, setAccess] = useState<Row[]>([]);
  const [guestId, setGuestId] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setAccess(await listHunterAccess());
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const members = useMemo(() => guests.filter((g) => g.club_member), [guests]);

  const current = useMemo(
    () => access.find((a) => String(a.guest_id) === guestId && a.active),
    [access, guestId],
  );

  const pick = (id: string) => {
    setGuestId(id);
    const has = access.find((a) => String(a.guest_id) === id);
    const guest = guests.find((g) => String(g.id) === id);
    setLogin(String(has?.login || (guest ? translit(String(guest.name)) : '')));
    setPassword(has?.active ? '' : randomPass());
  };

  const submit = async () => {
    if (!guestId) {
      toast.error('Выберите охотника');
      return;
    }
    setBusy(true);
    try {
      await saveHunterAccess({
        guest_id: Number(guestId),
        login: login.trim(),
        password: password.trim(),
      });
      toast.success(
        current ? 'Доступ обновлён' : `Доступ выдан. Логин: ${login}, пароль: ${password}`,
        { duration: 12000 },
      );
      setPassword('');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось выдать доступ');
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!guestId) return;
    setBusy(true);
    try {
      await revokeHunterAccess(Number(guestId));
      toast.success('Доступ закрыт');
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось закрыть');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Доступ в кабинет охотника</DialogTitle>
        </DialogHeader>

        <p className="h-label leading-relaxed">
          Охотник заходит в то же приложение своим логином и видит только свой кабинет:
          карту, локации, биотехнию, добычу и документы.
        </p>

        <div className="grid gap-4 mt-4">
          <label>
            <span className="h-label block mb-1">Член клуба</span>
            <select
              className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
              value={guestId}
              onChange={(e) => pick(e.target.value)}
            >
              <option value="">Выберите охотника</option>
              {members.map((g) => {
                const has = access.find((a) => String(a.guest_id) === String(g.id) && a.active);
                return (
                  <option key={String(g.id)} value={String(g.id)}>
                    {String(g.name)}
                    {has ? ' — доступ есть' : ''}
                  </option>
                );
              })}
            </select>
          </label>

          {guestId && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="h-label block mb-1">Логин</span>
                <input
                  className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                  value={login}
                  onChange={(e) => setLogin(e.target.value)}
                />
              </label>
              <label>
                <span className="h-label block mb-1">
                  {current ? 'Новый пароль (если менять)' : 'Пароль'}
                </span>
                <span className="flex gap-2">
                  <input
                    className="w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={current ? 'оставьте пустым' : ''}
                  />
                  <button
                    className="h-cta-ghost shrink-0"
                    onClick={() => setPassword(randomPass())}
                  >
                    <Icon name="Shuffle" size={14} />
                  </button>
                </span>
              </label>
            </div>
          )}

          {guestId && password && (
            <div className="border border-[#e2e2df] p-4 bg-[var(--hero-surface)]">
              <div className="h-label mb-1">Передайте охотнику</div>
              <div className="text-[0.8em]">
                Логин: <b>{login}</b> · Пароль: <b>{password}</b>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-6">
          <button className="h-cta" onClick={submit} disabled={busy || !guestId}>
            <Icon name="KeyRound" size={15} />
            {busy ? 'Сохраняем…' : current ? 'Обновить доступ' : 'Выдать доступ'}
          </button>
          {current && (
            <button className="h-cta-ghost" onClick={revoke} disabled={busy}>
              Закрыть доступ
            </button>
          )}
          <button className="h-cta-ghost" onClick={() => onOpenChange(false)}>
            Готово
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HunterAccessDialog;
