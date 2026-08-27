import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Row } from '@/lib/api';
import { SECTIONS, ROLES, DEFAULT_PERMISSIONS, parsePermissions } from '@/lib/permissions';

interface Values {
  name: string;
  login: string;
  role: string;
  password: string;
  active: boolean;
  permissions: string[];
}

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Row | null;
  onSubmit: (values: Row) => void;
}

const PermissionsDialog = ({ open, onOpenChange, initial, onSubmit }: PermissionsDialogProps) => {
  const [v, setV] = useState<Values>({
    name: '',
    login: '',
    role: 'staff',
    password: '',
    active: true,
    permissions: DEFAULT_PERMISSIONS.staff,
  });

  useEffect(() => {
    if (!open) return;
    const role = String(initial?.role || 'staff');
    const saved = parsePermissions(initial?.permissions);
    setV({
      name: String(initial?.name || ''),
      login: String(initial?.login || ''),
      role,
      password: '',
      active: initial ? Boolean(initial.active) : true,
      permissions: saved.length ? saved : DEFAULT_PERMISSIONS[role] || [],
    });
  }, [open, initial]);

  const toggle = (key: string) =>
    setV((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((k) => k !== key)
        : [...prev.permissions, key],
    }));

  const setRole = (role: string) =>
    setV((prev) => ({ ...prev, role, permissions: DEFAULT_PERMISSIONS[role] || [] }));

  const submit = () => {
    const payload: Row = {
      name: v.name,
      role: v.role,
      permissions: v.permissions.join(','),
      active: v.active,
    };
    if (!initial?.id) payload.login = v.login.trim().toLowerCase();
    if (v.password) payload.password = v.password;
    onSubmit(payload);
  };

  const input = 'w-full border border-[#e2e2df] px-3 py-2 text-[0.75em] bg-white';
  const isOwner = String(initial?.role) === 'owner';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px] rounded-none border-black">
        <DialogHeader>
          <DialogTitle className="h-head text-[22px]">
            {initial?.id ? 'Сотрудник' : 'Новый сотрудник'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 max-h-[62vh] overflow-y-auto pr-1">
          <label className="block">
            <span className="h-label block mb-1">Имя</span>
            <input
              className={input}
              value={v.name}
              onChange={(e) => setV({ ...v, name: e.target.value })}
            />
          </label>

          {!initial?.id && (
            <label className="block">
              <span className="h-label block mb-1">Логин (латиницей)</span>
              <input
                className={input}
                value={v.login}
                onChange={(e) => setV({ ...v, login: e.target.value })}
              />
            </label>
          )}

          <div>
            <span className="h-label block mb-2">Роль</span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ROLES)
                .filter(([value]) => value !== 'owner')
                .map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    disabled={isOwner}
                    className={v.role === value ? 'h-cta' : 'h-cta-ghost'}
                    onClick={() => setRole(value)}
                  >
                    {label}
                  </button>
                ))}
            </div>
            {isOwner && <div className="h-label mt-2">Роль владельца изменить нельзя</div>}
          </div>

          <label className="block">
            <span className="h-label block mb-1">
              {initial?.id ? 'Новый пароль (если меняем)' : 'Пароль'}
            </span>
            <input
              className={input}
              value={v.password}
              onChange={(e) => setV({ ...v, password: e.target.value })}
            />
          </label>

          {!isOwner && (
            <div>
              <span className="h-label block mb-2">Доступ к разделам</span>
              <div className="grid gap-1" style={{ gridTemplateColumns: '1fr 1fr' }}>
                {SECTIONS.map((s) => (
                  <label key={s.key} className="flex items-center gap-2 text-[0.72em] py-1">
                    <input
                      type="checkbox"
                      className="w-4 h-4 accent-black"
                      checked={v.permissions.includes(s.key)}
                      onChange={() => toggle(s.key)}
                    />
                    {s.label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {initial?.id && !isOwner && (
            <label className="flex items-center gap-2 text-[0.72em]">
              <input
                type="checkbox"
                className="w-4 h-4 accent-black"
                checked={v.active}
                onChange={(e) => setV({ ...v, active: e.target.checked })}
              />
              Доступ открыт
            </label>
          )}
        </div>

        <DialogFooter className="gap-2">
          <button className="h-cta-ghost" onClick={() => onOpenChange(false)}>
            Отмена
          </button>
          <button className="h-cta" onClick={submit}>
            Сохранить
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PermissionsDialog;
