import type { ReactNode } from "react";

export default function UtilityHero({ title, lead, trust }: {
  title: ReactNode;
  lead: string;
  trust: string;
}) {
  return <section className="hero utility-hero" id="top">
    <h1>{title}</h1>
    <p>{lead}</p>
    <div className="trust-line"><span>✓</span>{trust}</div>
  </section>;
}
