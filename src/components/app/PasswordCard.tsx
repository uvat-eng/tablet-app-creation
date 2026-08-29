import { useState } from 'react';
import Icon from '@/components/ui/icon';
import { changePassword } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

const PasswordCard = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const changed = done || user?.password_changed;

  const submit = async () => {
    if (newPass !== repeat) {
      toast.error('Новый пароль и повтор не совпадают');
      return;
    }
    if (newPass.length < 5) {
      toast.error('Новый пароль — не короче 5 символов');
      return;
    }
    setBusy(true);
    try {
      await changePassword(oldPass, newPass);
      toast.success('Пароль изменён. На других устройствах вход нужно повторить');
      setOldPass('');
      setNewPass('');
      setRepeat('');
      setOpen(false);
      setDone(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось сменить пароль');
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white';

  return (
    <div className="border border-[#e2e2df]">
      <div className="px-4 py-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon name="KeyRound" size={18} fallback="Lock" className="shrink-0" />
          <div>
            <div className="h-head text-[17px]">Пароль для входа</div>
            <div className="h-label mt-1">
              {changed ? 'Вы задали свой пароль' : 'Сейчас стоит пароль, выданный хозяйством'}
            </div>
          </div>
        </div>
        <button className="h-cta-ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Свернуть' : 'Сменить пароль'}
        </button>
      </div>

      {!changed && !open && (
        <div
          className="px-4 py-3 flex gap-3 border-t border-[#e2e2df]"
          style={{ background: 'var(--hero-surface)' }}
        >
          <Icon name="TriangleAlert" size={16} fallback="Info" className="shrink-0 mt-[2px]" />
          <p className="text-[0.76em] leading-relaxed">
            Придумайте свой пароль — тот, что выдало хозяйство, знают и другие.
          </p>
        </div>
      )}

      {open && (
        <div className="border-t border-[#e2e2df] p-4">
          <label className="block mb-3">
            <span className="h-label block mb-1">Текущий пароль</span>
            <input
              className={input}
              type={show ? 'text' : 'password'}
              value={oldPass}
              autoFocus
              onChange={(e) => setOldPass(e.target.value)}
            />
          </label>

          <label className="block mb-3">
            <span className="h-label block mb-1">Новый пароль</span>
            <input
              className={input}
              type={show ? 'text' : 'password'}
              value={newPass}
              placeholder="не короче 5 символов"
              onChange={(e) => setNewPass(e.target.value)}
            />
          </label>

          <label className="block mb-3">
            <span className="h-label block mb-1">Повторите новый</span>
            <input
              className={input}
              type={show ? 'text' : 'password'}
              value={repeat}
              onChange={(e) => setRepeat(e.target.value)}
            />
          </label>

          <button className="h-label underline mb-4 block" onClick={() => setShow((v) => !v)}>
            {show ? 'Скрыть пароли' : 'Показать пароли'}
          </button>

          <div className="flex flex-wrap gap-2">
            <button className="h-cta" disabled={busy} onClick={submit}>
              {busy ? 'Меняем…' : 'Сохранить новый пароль'}
            </button>
            <button className="h-cta-ghost" onClick={() => setOpen(false)}>
              Отмена
            </button>
          </div>

          <p className="h-mono-cap mt-4 text-[var(--hero-muted)]">
            Логин остаётся прежним. После смены на других устройствах нужно войти заново.
          </p>
        </div>
      )}
    </div>
  );
};

export default PasswordCard;
