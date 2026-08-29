import Icon from '@/components/ui/icon';

interface Props {
  url: unknown;
}

const ReceiptLink = ({ url }: Props) => {
  const src = String(url || '');
  if (!src) return null;
  return (
    <a
      href={src}
      target="_blank"
      rel="noreferrer"
      title="Открыть чек"
      className="inline-flex items-center gap-1 h-label underline"
      onClick={(e) => e.stopPropagation()}
    >
      <Icon name="ReceiptText" size={13} fallback="Receipt" />
      чек
    </a>
  );
};

export default ReceiptLink;
