interface CardItem {
  title: string;
  note?: string;
  price?: string;
}

const Cards = ({ items, min = 200 }: { items: CardItem[]; min?: number }) => (
  <div
    className="grid gap-px"
    style={{
      gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
      background: '#e2e2df',
      border: '1px solid #e2e2df',
    }}
  >
    {items.map((it) => (
      <div key={it.title} className="bg-white p-5">
        <div className="h-head text-[19px] leading-tight">{it.title}</div>
        {it.note && <div className="h-mono-cap mt-3">{it.note}</div>}
        {it.price && (
          <div className="mt-4">
            <span className="h-chip h-chip-mark">{it.price}</span>
          </div>
        )}
      </div>
    ))}
  </div>
);

export default Cards;
