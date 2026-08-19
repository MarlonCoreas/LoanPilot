/**
 * El titular de cada utilidad va partido en dos: la primera mitad en negro y
 * la segunda —`accent`— en verde, sobre su propia línea. El corte es una
 * decisión de redacción, no de tipografía, así que lo elige cada página.
 */
export default function UtilityHero({ title, accent, lead, trust }: {
  title: string;
  accent: string;
  lead: string;
  /** Omitted on a page that applies no statutory rule, which then claims none. */
  trust?: string;
}) {
  return <section className="hero utility-hero" id="top">
    <h1>{title}<br /><em>{accent}</em></h1>
    <p>{lead}</p>
    {trust && <div className="trust-line"><span>✓</span>{trust}</div>}
  </section>;
}
