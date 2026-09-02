import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { FarmSettings, getSettings } from '@/lib/api';
import { buildPayQr, payMissing, payReady, PayData } from '@/lib/payqr';
import { money } from '@/lib/price';

interface Props extends PayData {
  size?: number;
}

const PayQr = ({ size = 118, ...pay }: Props) => {
  const [st, setSt] = useState<FarmSettings | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getSettings()
      .then(setSt)
      .catch(() => setFailed(true));
  }, []);

  if (failed) return null;
  if (!st) return <div style={{ width: size, height: size }} />;

  if (!payReady(st)) {
    return (
      <div
        className="no-print border border-dashed border-[#e2e2df] p-3 text-[0.6em] leading-snug text-[var(--hero-muted)]"
        style={{ maxWidth: size + 60 }}
      >
        QR оплаты не собран — в настройках хозяйства не заполнено:{' '}
        {payMissing(st).join(', ')}.
      </div>
    );
  }

  const value = buildPayQr(st, pay);

  return (
    <div className="text-center" style={{ width: size + 14 }}>
      <div className="border border-black bg-white p-[7px]">
        <QRCode
          value={value}
          size={size}
          level="M"
          style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
        />
      </div>
      <div className="mt-1 text-[8px] uppercase tracking-[0.06em] leading-tight">
        Оплата по QR
      </div>
      {Number(pay.amount) > 0 && (
        <div className="text-[9px] font-bold leading-tight">{money(pay.amount)}</div>
      )}
    </div>
  );
};

export default PayQr;
