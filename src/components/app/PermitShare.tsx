import Icon from '@/components/ui/icon';
import { PermitResult } from '@/lib/api';
import { toast } from 'sonner';

interface Props {
  result: PermitResult;
  guestName: string;
}

const PermitShare = ({ result, guestName }: Props) => {
  const subject = `Путёвка на охоту — ${guestName}`;
  const text =
    `Здравствуйте! Ваша путёвка на охоту готова.\n\n` +
    `Скачать документ: ${result.url}\n\n` +
    `В файле два листа: заявление на выдачу разрешения и путёвка-договор. ` +
    `Распечатайте, подпишите и привезите с собой.\n\nОхотхозяйство «Малышенское»`;

  const mail = () => {
    const to = result.email || '';
    window.location.href =
      `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  };

  const whatsapp = () => {
    const phone = String(result.phone || '').replace(/\D/g, '');
    const num = phone.startsWith('8') ? '7' + phone.slice(1) : phone;
    window.open(
      `https://wa.me/${num}?text=${encodeURIComponent(text)}`,
      '_blank',
      'noopener',
    );
  };

  const telegram = () => {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(result.url)}` +
        `&text=${encodeURIComponent(subject)}`,
      '_blank',
      'noopener',
    );
  };

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: subject, text, url: result.url });
        return;
      } catch {
        /* пользователь закрыл окно выбора */
      }
    }
    await navigator.clipboard.writeText(result.url);
    toast.success('Ссылка скопирована — вставьте в любой мессенджер');
  };

  const print = () => {
    const w = window.open('', '_blank');
    if (!w) {
      toast.error('Браузер заблокировал окно печати');
      return;
    }
    w.document.write(
      `<html><head><meta charset="utf-8"><title>${subject}</title>` +
        `<style>body{font-family:system-ui;padding:40px;max-width:640px}` +
        `a{word-break:break-all}h2{font-size:18px}</style></head><body>` +
        `<h2>${subject}</h2>` +
        `<p>Файл Word с заявлением и путёвкой-договором:</p>` +
        `<p><a href="${result.url}">${result.url}</a></p>` +
        `<p>Откройте файл в Word и распечатайте — так документ выйдет ` +
        `точно по бланку.</p></body></html>`,
    );
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(result.url);
    toast.success('Ссылка скопирована');
  };

  return (
    <div className="border border-[#e2e2df] mt-5">
      <div className="h-label px-3 py-2 bg-[var(--hero-surface)]">
        Путёвка готова — отправьте охотнику
      </div>

      <div className="p-3 flex flex-wrap gap-2">
        <a className="h-cta" href={result.url} target="_blank" rel="noopener noreferrer">
          <Icon name="FileDown" size={15} /> Скачать Word
        </a>
        <button className="h-cta-ghost" onClick={print}>
          <Icon name="Printer" size={15} /> На печать
        </button>
        <button className="h-cta-ghost" onClick={mail}>
          <Icon name="Mail" size={15} />
          {result.email ? 'На почту' : 'Почта (адрес вписать)'}
        </button>
        {result.phone && (
          <button className="h-cta-ghost" onClick={whatsapp}>
            <Icon name="MessageCircle" size={15} /> WhatsApp
          </button>
        )}
        <button className="h-cta-ghost" onClick={telegram}>
          <Icon name="Send" size={15} /> Telegram
        </button>
        <button className="h-cta-ghost" onClick={share}>
          <Icon name="Share2" size={15} /> Поделиться
        </button>
        <button className="h-cta-ghost" onClick={copyLink}>
          <Icon name="Link" size={15} /> Копировать ссылку
        </button>
      </div>

      {!result.email && (
        <div className="px-3 pb-3">
          <p className="h-label leading-relaxed">
            У охотника не указана почта — письмо откроется с пустым адресом.
            Впишите адрес в карточку охотника, чтобы подставлялся сам.
          </p>
        </div>
      )}
    </div>
  );
};

export default PermitShare;
