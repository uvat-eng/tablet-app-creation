import { useEffect, useRef } from 'react';
import { onDataChange } from '@/lib/api';

const useDataRefresh = (load: () => unknown, delay = 1200) => {
  const ref = useRef(load);
  ref.current = load;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const off = onDataChange(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        ref.current();
      }, delay);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, [delay]);
};

export default useDataRefresh;
