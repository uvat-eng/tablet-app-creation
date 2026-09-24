import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '@/components/ui/icon';
import { deleteAccount } from '@/lib/api';
import { toast } from 'sonner';

const WHAT_HAPPENS = [
  'Логин и пароль перестают работать сразу — войти больше нельзя.',
  'Через 7 дней стираются имя, телефон, город, паспортные данные, охотничий билет и разрешение на оружие.',
  'Ваши сообщения в чатах остаются, но подписываются как «Удалённый пользователь».',
  'Документы по закрытым охотам хозяйство хранит столько, сколько требует закон.',
  'Передумали — позвоните хозяйству в течение недели, доступ вернут.',
];

const DeleteAccountCard = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const ready = password.length > 0 && confirm.trim().toUpperCase() === 'УДАЛИТЬ';

  const submit = async () => {
    if (!ready || busy) return;
    setBusy(true);
    try {
      await deleteAccount(password, reason);
      toast.success('Доступ закрыт. Данные будут стёрты через 7 дней');
      setTimeout(() => {
        window.location.href = '/';
      }, 900);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Не удалось удалить запись');
      setBusy(false);
    }
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.8em] bg-white';

  return (
    <div className="border border-[#e2e2df]">
      <div className="px-4 py-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon name="UserX" size={18} fallback="Trash2" className="shrink-0" />
          <div>
            <div className="h-head text-[17px]">Удалить учётную запись</div>
            <div className="h-label mt-1">Доступ и личные данные будут стёрты</div>
          </div>
        </div>
        <button className="h-cta-ghost" onClick={() => setOpen((v) => !v)}>
          {open ? 'Отмена' : 'Удалить'}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#e2e2df] p-4">
          <div
            className="px-4 py-3 flex gap-3 mb-4"
            style={{ background: 'var(--hero-surface)' }}
          >
            <Icon
              name="TriangleAlert"
              size={16}
              fallback="Info"
              className="shrink-0 mt-[2px]"
            />
            <div>
              <div className="h-label mb-2">Что произойдёт</div>
              <ul className="space-y-2">
                {WHAT_HAPPENS.map((t) => (
                  <li key={t} className="text-[0.76em] leading-relaxed flex gap-2">
                    <span className="opacity-50 shrink-0">—</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-[0.78em] leading-relaxed mb-4">
            Доступ закроется сразу. В течение 7 дней хозяйство может вернуть запись по
            вашей просьбе — после этого данные стираются безвозвратно.
          </p>

          <label className="block mb-3">
            <span className="h-label block mb-1">Ваш пароль</span>
            <input
              className={input}
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <label className="block mb-3">
            <span className="h-label block mb-1">Почему уходите — по желанию</span>
            <textarea
              className={`${input} resize-none`}
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>

          <label className="block mb-4">
            <span className="h-label block mb-1">
              Напишите слово УДАЛИТЬ для подтверждения
            </span>
            <input
              className={input}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              className="flex items-center gap-2 px-4 py-3 text-[0.8em] tracking-wide text-white"
              style={{ background: ready && !busy ? '#a32b20' : '#c9a09b' }}
              disabled={!ready || busy}
              onClick={submit}
            >
              <Icon name="Trash2" size={15} />
              {busy ? 'Удаляем…' : 'Удалить навсегда'}
            </button>
            <button className="h-cta-ghost" onClick={() => setOpen(false)}>
              Передумал
            </button>
          </div>

          <p className="h-mono-cap mt-4 text-[var(--hero-muted)]">
            Нужна помощь — напишите хозяйству перед удалением
          </p>
          <button
            className="h-label underline mt-2"
            onClick={() => navigate('/my')}
          >
            Написать хозяйству
          </button>
        </div>
      )}
    </div>
  );
};

export default DeleteAccountCard;