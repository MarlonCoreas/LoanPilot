import type { ReactNode } from "react";

export default function UtilityHero({ title, lead, trust }: {
  title: ReactNode;
  lead: string;
  /** Omitted on a page that applies no statutory rule, which then claims none. */
  trust?: string;
}) {
  return <section className="hero utility-hero" id="top">
    <h1>{title}</h1>
    <p>{lead}</p>
    {trust && <div className="trust-line"><span>✓</span>{trust}</div>}
  </section>;
}
