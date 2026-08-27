interface SearchBarProps {
  value: string;
  onChange: (v: string) => void;
  count?: number;
  placeholder?: string;
}

const SearchBar = ({ value, onChange, count, placeholder = 'Поиск по таблице' }: SearchBarProps) => (
  <div className="mb-3 flex flex-wrap items-center gap-3">
    <input
      className="border border-[#e2e2df] px-3 py-2 text-[0.72em] bg-white w-full max-w-[320px]"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
    {value && (
      <button className="h-label underline" onClick={() => onChange('')}>
        Сбросить
      </button>
    )}
    {typeof count === 'number' && <span className="h-label">Найдено: {count}</span>}
  </div>
);

export default SearchBar;
