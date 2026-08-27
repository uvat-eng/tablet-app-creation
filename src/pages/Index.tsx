import Header from '@/components/site/Header';
import Hero from '@/components/site/Hero';
import Section from '@/components/site/Section';
import Booking from '@/components/site/Booking';
import Cards from '@/components/site/Cards';
import Reviews from '@/components/site/Reviews';
import PhotoBlock from '@/components/site/PhotoBlock';

const Index = () => (
  <div className="h-shell min-h-screen overflow-x-hidden">
    <Header />
    <Hero />

    <Section id="booking" index="01 / Календарь" title="Свободные даты" lede="Выберите заезд и выезд — покажем смету и оставим бронь.">
      <Booking />
    </Section>

    <Section id="services" index="02 / Услуги" title="Что входит" lede="Организация охоты и рыбалки под ключ: егерь, лицензии, разделка.">
      <Cards
        items={[
          { title: 'Охота с егерем', note: 'Загон, вышка, с подхода. Сопровождение весь день.', price: 'от 12 000 ₽' },
          { title: 'Оформление лицензий', note: 'Кабан, лось, косуля, птица. Документы готовим сами.', price: 'от 4 000 ₽' },
          { title: 'Рыбалка', note: 'Летняя и зимняя, снасти и лунки на месте.', price: 'от 6 000 ₽' },
          { title: 'Разделка и трофей', note: 'Полевая обработка, заморозка, подготовка головы.', price: 'от 5 000 ₽' },
          { title: 'Питание', note: 'Домашняя кухня три раза в день или самостоятельно.', price: 'от 1 500 ₽' },
          { title: 'Фото- и видеосъёмка', note: 'Съёмка выезда и трофейных кадров.', price: 'от 8 000 ₽' },
        ]}
      />
    </Section>

    <Section id="transport" index="03 / Транспорт" title="Доедем куда угодно" lede="Своя техника до угодий: снег, болото, распутица — не помеха.">
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <PhotoBlock
          src="https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/files/cc402d4d-b0c9-44bd-870a-382f8a245cdd.jpg"
          alt="Техника базы зимой"
          tagLeft="4 ед."
          tagRight="Круглый год"
        />
        <Cards
          min={160}
          items={[
            { title: 'Снегоход', note: 'Двухместный, с санями.', price: 'от 5 000 ₽/день' },
            { title: 'Вездеход', note: 'Гусеничный, до 6 человек.', price: 'от 15 000 ₽/день' },
            { title: 'Квадроцикл', note: 'Летние маршруты по угодьям.', price: 'от 6 000 ₽/день' },
            { title: 'Лодка с мотором', note: 'Река и озёра рядом с базой.', price: 'от 4 000 ₽/день' },
          ]}
        />
      </div>
    </Section>

    <Section id="stay" index="04 / Дом" title="Охотничий дом" lede="Бревенчатый дом на компанию: печь, кухня, спальни, веранда.">
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <PhotoBlock
          src="https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/files/df8a1b7b-5f34-4db1-9885-3fcb2ee52ca3.jpg"
          alt="Охотничий дом"
          tagLeft="8 мест"
          tagRight="120 м²"
        />
        <Cards
          min={160}
          items={[
            { title: 'Дом целиком', note: 'До 8 человек, две спальни, гостиная с камином.', price: 'от 16 000 ₽/сутки' },
            { title: 'Кухня', note: 'Плита, посуда, холодильник, морозильный ларь.' },
            { title: 'Тепло', note: 'Печь и электроотопление, горячая вода.' },
            { title: 'Связь', note: 'Мобильная связь и интернет по базе.' },
          ]}
        />
      </div>
    </Section>

    <Section id="hotel" index="05 / Гостиница" title="Номера" lede="Для тех, кто приезжает без компании или с семьёй.">
      <Cards
        items={[
          { title: 'Одноместный', note: 'Кровать, стол, душ на этаже.', price: 'от 3 000 ₽' },
          { title: 'Двухместный', note: 'Две кровати, санузел в номере.', price: 'от 4 500 ₽' },
          { title: 'Семейный', note: 'Три спальных места, чайная зона.', price: 'от 6 500 ₽' },
        ]}
      />
    </Section>

    <Section id="banya" index="06 / Баня" title="Русская баня на дровах" lede="Парная, купель и комната отдыха. Топим к вашему возвращению.">
      <div className="grid gap-8 lg:grid-cols-2 items-start">
        <PhotoBlock
          src="https://cdn.poehali.dev/projects/980fc694-d631-4b58-8bb8-84299cd838a9/files/79a0a55d-8f5f-4912-a8d7-1dc8697a1a41.jpg"
          alt="Русская баня"
          tagLeft="90° C"
          tagRight="6 человек"
        />
        <Cards
          min={160}
          items={[
            { title: 'Парная', note: 'Дровяная печь, липовый полок, веники.', price: '2 500 ₽/час' },
            { title: 'Купель', note: 'Холодная бочка на улице, круглый год.' },
            { title: 'Комната отдыха', note: 'Стол на компанию, самовар, чай.' },
            { title: 'Банщик', note: 'Парение по заказу.', price: 'от 3 000 ₽' },
          ]}
        />
      </div>
    </Section>

    <Section id="trophy" index="07 / Трофейный зал" title="Трофеи базы" lede="Стена добытых трофеев за годы работы — и место для вашего.">
      <Cards
        items={[
          { title: 'Лось', note: 'Рекорд базы — рога 12 отростков, 2019 год.' },
          { title: 'Кабан', note: 'Секач 210 кг, зимний загон.' },
          { title: 'Косуля', note: 'Осенний сезон, охота с подхода.' },
          { title: 'Медведь', note: 'На овсах, август.' },
          { title: 'Глухарь', note: 'Весенний ток, апрель.' },
          { title: 'Ваш трофей', note: 'Обработаем и подготовим к перевозке.' },
        ]}
      />
    </Section>

    <Section id="locations" index="08 / Локации" title="Угодья вокруг базы" lede="Более 20 000 гектаров закреплённых угодий в получасе езды.">
      <Cards
        items={[
          { title: 'Северный лес', note: 'Смешанный лес, лось и кабан. 12 км от базы.' },
          { title: 'Болотные разливы', note: 'Утка и гусь на перелёте. 18 км.' },
          { title: 'Овсяные поля', note: 'Медведь и кабан на кормовых полях. 7 км.' },
          { title: 'Река', note: 'Рыбалка и лодочные маршруты. 2 км.' },
        ]}
      />
    </Section>

    <Section id="reviews" index="09 / Отзывы" title="Что говорят гости" lede="Приезжают из разных городов, чаще всего — второй и третий раз.">
      <Reviews />
    </Section>

    <Section id="club" index="10 / Клуб" title="Клуб охотников" lede="Постоянным гостям — приоритет на даты и скидка на угодья.">
      <div className="grid gap-8 lg:grid-cols-[1fr_260px] items-start">
        <Cards
          min={180}
          items={[
            { title: 'Приоритет брони', note: 'Даты открытия сезона — сначала членам клуба.' },
            { title: 'Скидка 10%', note: 'На проживание, баню и транспорт.' },
            { title: 'Закрытые выезды', note: 'Клубные охоты и соревнования по стрельбе.' },
          ]}
        />
        <div className="h-dialog self-start">
          Вступление свободное, взнос за год.
          <b> Мест в сезоне — 24.</b>
          <div className="flex gap-2 mt-3">
            <span className="h-chip h-chip-grey">Год</span>
            <span className="h-chip h-chip-mark">15 000 ₽</span>
          </div>
          <a className="h-cta mt-4 w-full text-center" href="#booking">
            Вступить в клуб
          </a>
        </div>
      </div>
    </Section>

    <footer className="h-col h-rule py-12 flex flex-wrap gap-6 justify-between h-label">
      <span>Охотбаза — охота, рыбалка и отдых круглый год</span>
      <span>© {new Date().getFullYear()}</span>
    </footer>
  </div>
);

export default Index;
