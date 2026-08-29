import { useCallback, useEffect, useState } from 'react';
import { listRows } from '@/lib/api';
import { StaffUser } from '@/lib/api';
import { can, canApproveHunts } from '@/lib/permissions';

export type PendingCounts = Record<string, number>;

const EMPTY: PendingCounts = {
  'hunt-requests': 0,
  supply: 0,
  'supply-new': 0,
  'my-hunts': 0,
};

const REFRESH_MS = 120000;

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
      } else {
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

    setCounts(next);
  }, [user]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  return counts;
};

export default usePendingCounts;