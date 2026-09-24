import { useCallback, useEffect, useState } from 'react';

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void>;
};

type FsDocument = Document & {
  webkitExitFullscreen?: () => Promise<void>;
  webkitFullscreenElement?: Element | null;
};

interface ImmersiveApi {
  enter: () => Promise<void>;
  exit: () => Promise<void>;
}

const nativeImmersive = (): ImmersiveApi | null => {
  const w = window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
      Plugins?: { Immersive?: ImmersiveApi };
    };
  };
  if (!w.Capacitor?.isNativePlatform?.()) return null;
  return w.Capacitor.Plugins?.Immersive || null;
};

export const useFullscreen = () => {
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (nativeImmersive()) return;
    const doc = document as FsDocument;
    const sync = () => setActive(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
    return () => {
      document.removeEventListener('fullscreenchange', sync);
      document.removeEventListener('webkitfullscreenchange', sync);
    };
  }, []);

  const enter = useCallback(async () => {
    const native = nativeImmersive();
    if (native) {
      await native.enter().catch(() => undefined);
      setActive(true);
      return;
    }
    const el = document.documentElement as FsElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      /* устройство не разрешило полный экран */
    }
  }, []);

  const exit = useCallback(async () => {
    const native = nativeImmersive();
    if (native) {
      await native.exit().catch(() => undefined);
      setActive(false);
      return;
    }
    const doc = document as FsDocument;
    try {
      if (doc.fullscreenElement && doc.exitFullscreen) await doc.exitFullscreen();
      else if (doc.webkitFullscreenElement && doc.webkitExitFullscreen)
        await doc.webkitExitFullscreen();
    } catch {
      /* уже вышли */
    }
  }, []);

  const toggle = useCallback(() => {
    if (active) exit();
    else enter();
  }, [active, enter, exit]);

  return { active, enter, exit, toggle };
};

export default useFullscreen;