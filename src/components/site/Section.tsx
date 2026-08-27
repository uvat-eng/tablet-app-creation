import { ReactNode } from 'react';

interface SectionProps {
  id: string;
  index: string;
  title: string;
  lede?: string;
  children?: ReactNode;
}

const Section = ({ id, index, title, lede, children }: SectionProps) => (
  <section id={id} className="h-col h-rule py-16">
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <div>
        <div className="h-label">{index}</div>
        <h2 className="h-head h-h2 mt-3">{title}</h2>
        {lede && <p className="h-mono-cap mt-4 max-w-[28ch]">{lede}</p>}
      </div>
      <div>{children}</div>
    </div>
  </section>
);

export default Section;
