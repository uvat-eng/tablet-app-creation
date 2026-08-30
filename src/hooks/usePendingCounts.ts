import { useCallback, useEffect, useState } from 'react';
import { listRows } from '@/lib/api';
import { StaffUser } from '@/lib/api';
import { can, canApproveHunts } from '@/lib/permissions';
import { loadUnread } from '@/lib/chatApi';
import { notifyMessages } from '@/lib/notify';

export type PendingCounts = Record<string, number>;

const EMPTY: PendingCounts = {
  'hunt-requests': 0,
  supply: 0,
  'supply-new': 0,
  'my-hunts': 0,
  my: 0,
  hunters: 0,
};

const REFRESH_MS = 120000;
const CHAT_MS = 30000;

export const usePendingCounts = (user: StaffUser | null): PendingCounts => {
  const [counts, setCounts] = useState<PendingCounts>(EMPTY);

  const load = useCallback(async () => {
    if (!user) {
      setCounts(EMPTY);
      return;
    }

    const next: PendingCounts = { ...EMPTY };

    try {
      if (user.role === 'hunter') {
        const mine = await listRows('hunt_requests');
        next['my-hunts'] = mine.filter((r) => String(r.status) === 'approved').length;
        next.my = await loadUnread().catch(() => 0);
      } else {
        next.hunters = await loadUnread().catch(() => 0);
        if (canApproveHunts(user) || can(user, 'hunt-requests')) {
          const reqs = await listRows('hunt_requests');
          next['hunt-requests'] = reqs.filter((r) => String(r.status) === 'pending').length;
        }
        if (can(user, 'supply')) {
          const orders = await listRows('supply_orders');
          next.supply = orders.filter((o) => String(o.status) === 'new').length;
        }
        if (can(user, 'supply-new') && !can(user, 'supply')) {
          const own = await listRows('supply_orders');
          next['supply-new'] = own.filter((o) => String(o.status) === 'approved').length;
        }
      }
    } catch {
      /* нет связи — оставляем как есть */
    }

    notifyMessages(user.role === 'hunter' ? next.my : next.hunters);
    setCounts(next);
  }, [user]);

  const loadChatOnly = useCallback(async () => {
    if (!user) return;
    try {
      const n = await loadUnread();
      notifyMessages(n);
      setCounts((prev) =>
        user.role === 'hunter' ? { ...prev, my: n } : { ...prev, hunters: n },
      );
    } catch {
      /* нет связи */
    }
  }, [user]);

  useEffect(() => {
    load();
    const slow = setInterval(load, REFRESH_MS);
    const fast = setInterval(loadChatOnly, CHAT_MS);
    const onVisible = () => {
      if (!document.hidden) loadChatOnly();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(slow);
      clearInterval(fast);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load, loadChatOnly]);

  return counts;
};

export default usePendingCounts;