import { disputesForPage } from "./disputes";
import { ROUTES, type Lang, type Page } from "./routes";

/**
 * What a calculator says about its own unsettled ground, without being asked.
 *
 * The deep-linked callouts elsewhere are conditional by nature: the article 187
 * divergence only shows up on a resignation with a part-year of vacation, and
 * the scale ambiguity only inside the weeks where the two readings differ. A
 * reader whose dates miss all of them would never learn that any of this page's
 * figures rest on a reading somebody could argue with.
 *
 * So the list is unconditional and generated from `RULE_USAGE`: every contested
 * rule this page applies, named in the reader's language, each linking to its
 * entry. A calculator that applies none renders nothing at all rather than an
 * empty reassurance.
 */

const copy = {
  es: {
    title: "Reglas en disputa que toca este cálculo",
    lead: "Estas cifras salen de una lectura que no es la única defendible. Cada una está explicada, con las dos lecturas y la que se aplica aquí.",
    all: "Ver todas las reglas en disputa",
  },
  en: {
    title: "Contested rules this calculation touches",
    lead: "These figures come from a reading that is not the only defensible one. Each is explained, with both readings and the one applied here.",
    all: "See every disputed rule",
  },
} as const;

export default function DisputePanel({ lang, page }: { lang: Lang; page: Page }) {
  const disputes = disputesForPage(page);
  if (disputes.length === 0) return null;
  const t = copy[lang];
  const target = ROUTES[lang].disputed;

  return <div className="source-panel dispute-panel">
    <h2>{t.title}</h2>
    <p>{t.lead}</p>
    <div className="source-links">
      {disputes.map((dispute, index) =>
        <a key={dispute.rule} href={`${target}#${dispute.rule}`}>
          <b>{String(index + 1).padStart(2, "0")}</b>{dispute.question[lang]}<span>→</span>
        </a>)}
    </div>
    <a className="dispute-panel-all" href={target}>{t.all} →</a>
  </div>;
}
