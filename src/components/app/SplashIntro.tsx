import { useEffect, useState } from 'react';

const KEY = 'hb_splash_seen';
const TOTAL = 6200;

const SplashIntro = () => {
  const [phase, setPhase] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(KEY) === '1') {
      setGone(true);
      return;
    }
    sessionStorage.setItem(KEY, '1');

    const t1 = setTimeout(() => setPhase(1), 120);
    const t2 = setTimeout(() => setPhase(2), 2100);
    const t3 = setTimeout(() => setPhase(3), 3000);
    const t4 = setTimeout(() => setPhase(4), TOTAL - 600);
    const t5 = setTimeout(() => setGone(true), TOTAL);

    return () => {
      [t1, t2, t3, t4, t5].forEach(clearTimeout);
    };
  }, []);

  if (gone) return null;

  const met = phase >= 2;

  return (
    <div
      onClick={() => setGone(true)}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#C6E97A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: phase >= 4 ? 0 : 1,
        transition: 'opacity .6s ease-out',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 'min(86vw, 460px)',
          aspectRatio: '960 / 582',
          transform: met ? 'scale(1)' : 'scale(0.96)',
          transition: 'transform .9s cubic-bezier(.2,.8,.2,1)',
        }}
      >
        <img
          src="/splash/wolf-left.png"
          alt=""
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '50%',
            height: '100%',
            objectFit: 'fill',
            transform: phase >= 1 && met ? 'translateX(0)' : 'translateX(-210%)',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'transform 1.9s cubic-bezier(.16,.84,.24,1), opacity .5s',
          }}
        />
        <img
          src="/splash/wolf-right.png"
          alt=""
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: '50%',
            height: '100%',
            objectFit: 'fill',
            transform: phase >= 1 && met ? 'translateX(0)' : 'translateX(210%)',
            opacity: phase >= 1 ? 1 : 0,
            transition: 'transform 1.9s cubic-bezier(.16,.84,.24,1), opacity .5s',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: '-14%',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,.85) 0%, rgba(255,255,255,0) 62%)',
            opacity: phase === 2 ? 1 : 0,
            transform: phase >= 2 ? 'scale(1.25)' : 'scale(.5)',
            transition: 'opacity .9s ease-out, transform .9s ease-out',
            pointerEvents: 'none',
          }}
        />
      </div>

      <div
        style={{
          marginTop: '7%',
          textAlign: 'center',
          opacity: phase >= 3 ? 1 : 0,
          transform: phase >= 3 ? 'translateY(0)' : 'translateY(14px)',
          transition: 'opacity .8s ease-out, transform .8s ease-out',
        }}
      >
        <div
          style={{
            fontSize: 'clamp(20px, 6vw, 30px)',
            fontWeight: 700,
            letterSpacing: '.16em',
            color: '#1f1f1d',
            textTransform: 'uppercase',
          }}
        >
          Малышенское
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 'clamp(9px, 2.6vw, 12px)',
            letterSpacing: '.28em',
            color: '#3f4a2a',
            textTransform: 'uppercase',
          }}
        >
          Охотничье хозяйство
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 'calc(env(safe-area-inset-bottom) + 26px)',
          width: 'min(52vw, 220px)',
          height: 2,
          background: 'rgba(31,31,29,.16)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            background: '#1f1f1d',
            transformOrigin: 'left',
            transform: phase >= 1 ? 'scaleX(1)' : 'scaleX(0)',
            transition: `transform ${TOTAL - 700}ms linear`,
          }}
        />
      </div>
    </div>
  );
};

export default SplashIntro;