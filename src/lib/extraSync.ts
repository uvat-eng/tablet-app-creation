import { cachedMe, listAccess, listHunterAccess, listStaff } from '@/lib/api';
import { loadThread, loadThreads } from '@/lib/chatApi';
import { loadClubChat } from '@/lib/clubChatApi';
import { flushOutbox, outboxCount, restoreOutbox } from '@/lib/chatOutbox';
import { canClubChat } from '@/lib/permissions';

const quiet = <T,>(p: Promise<T>) => p.catch(() => undefined);

export const flushChats = async () => {
  await restoreOutbox();
  if (outboxCount()) await quiet(flushOutbox());
};

export const refreshExtras = async () => {
  const me = cachedMe();
  if (!me) return;
  await flushChats();
  const jobs: Promise<unknown>[] = [];
  if (me.role === 'hunter') {
    jobs.push(loadThread());
  } else {
    jobs.push(loadThreads(), listStaff(), listHunterAccess());
    if (me.role === 'owner') jobs.push(listAccess());
  }
  if (canClubChat(me)) jobs.push(loadClubChat());
  await Promise.all(jobs.map(quiet));
};
