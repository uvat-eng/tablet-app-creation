interface PhotoBlockProps {
  src: string;
  alt: string;
  tagLeft?: string;
  tagRight?: string;
}

const PhotoBlock = ({ src, alt, tagLeft, tagRight }: PhotoBlockProps) => (
  <div className="h-frame h-[320px]">
    <div className="h-grid-lines" />
    <div className="h-shot left-[56px] right-[56px] top-[46px] h-[210px]">
      <img src={src} alt={alt} />
    </div>
    {tagLeft && <span className="h-tag top-[268px] left-8">{tagLeft}</span>}
    {tagRight && <span className="h-tag top-[268px] right-8">{tagRight}</span>}
  </div>
);

export default PhotoBlock;
