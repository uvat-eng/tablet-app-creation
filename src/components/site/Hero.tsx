const Hero = () => (
  <section className="h-col pb-24">
    <h1 className="h-head h-h1 mt-[78px] h-fade h-d2">
      Охотничья база
      <br />
      на берегу тайги.
    </h1>

    <p className="h-mono-cap mt-11 max-w-[27ch] h-fade h-d3">
      Дом, гостиница, баня и транспорт. Егерь, лицензии и трофей — под ключ.
    </p>

    <div className="mt-[26px] flex flex-wrap gap-3 h-fade h-d3">
      <a className="h-cta" href="#booking">
        Забронировать даты
      </a>
      <a className="h-cta-ghost" href="#services">
        Смотреть услуги
      </a>
    </div>

    <div className="h-frame mt-[42px] h-[420px] h-fade h-d4">
      <div className="h-grid-lines" />

      <div className="h-shot left-[108px] right-[108px] top-[78px] h-[210px]">
        <img
          src="https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/files/df8a1b7b-5f34-4db1-9885-3fcb2ee52ca3.jpg"
          alt="Охотничий дом зимой"
        />
      </div>
      <span className="h-tag top-[172px] left-11">64° С.Ш.</span>
      <span className="h-tag top-[172px] right-11">12 мест</span>

      <div className="h-dialog absolute left-1/2 top-12 -translate-x-1/2 w-[244px]">
        Заезд 12 фев, 3 ночи. Дом + баня, егерь.
        <b> Свободно.</b>
        <div className="flex gap-2 mt-2">
          <span className="h-chip h-chip-grey">Смета</span>
          <span className="h-chip h-chip-mark">48 000 ₽</span>
        </div>
      </div>

      <div className="absolute right-[14px] top-[14px] flex flex-col items-end gap-[5px]">
        <i className="block h-[14px] w-[52px]" style={{ background: 'var(--hero-x-panel)' }} />
        <i className="block h-[14px] w-[14px]" style={{ background: 'var(--hero-x-panel)' }} />
        <i className="block h-[22px] w-[14px]" style={{ background: 'var(--hero-x-panel)' }} />
      </div>

      <div
        className="absolute left-1/2 bottom-[26px] -translate-x-1/2 w-[420px] max-w-[90%] flex flex-col gap-[6px] p-[6px_8px]"
        style={{ background: 'var(--hero-x-panel)' }}
      >
        <div className="flex items-center gap-[6px]">
          <span className="h-cell w-[34px]" />
          <span className="h-cell w-[26px]" />
          <span className="h-cell w-[26px]" />
          <span className="h-cell flex-1" />
          <span className="h-cell w-[18px]" />
          <span className="h-cell w-[18px]" />
          <span className="h-cell h-cell-o w-[12px]" />
        </div>
        <div className="flex items-center gap-[6px]">
          <span className="h-cell w-[22px]" />
          <span className="h-cell flex-1" />
          <span className="h-cell h-cell-g w-[30px]" />
          <span className="h-cell w-[16px]" />
        </div>
      </div>
    </div>
  </section>
);

export default Hero;
