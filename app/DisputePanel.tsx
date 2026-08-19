import { unsettledForPage } from "./disputes";
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
 * So the list is unconditional and generated from `RULE_USAGE`: every unsettled
 * rule this page applies, named in the reader's language, each linking to its
 * entry. A calculator that applies none renders nothing at all rather than an
 * empty reassurance.
 *
 * BOTH KINDS, and the tag says which. A disagreement between a text and a
 * practice is one thing; a figure no document fixes is another, and the second
 * is the one a reader would never guess at — the divisor behind every daily
 * figure on the page is not contested by anybody.
 */

const copy = {
  es: {
    title: "Reglas sin resolver que toca este cálculo",
    lead: "Estas cifras no salen de un texto que diga una sola cosa: unas vienen de una lectura que no es la única defendible, otras de un dato que ningún documento fija. Cada una está explicada.",
    all: "Ver todas las reglas sin resolver",
    tag: { disputed: "EN DISPUTA", unsourced: "SIN FUENTE" },
  },
  en: {
    title: "Unsettled rules this calculation touches",
    lead: "These figures do not come from a text that says one thing: some come from a reading that is not the only defensible one, others from a value no document fixes. Each is explained.",
    all: "See every unsettled rule",
    tag: { disputed: "DISPUTED", unsourced: "UNSOURCED" },
  },
} as const;

export default function DisputePanel({ lang, page }: { lang: Lang; page: Page }) {
  const unsettled = unsettledForPage(page);
  if (unsettled.length === 0) return null;
  const t = copy[lang];
  const target = ROUTES[lang].disputed;

  return <div className="source-panel dispute-panel">
    <h2>{t.title}</h2>
    <p>{t.lead}</p>
    <div className="source-links">
      {unsettled.map((item, index) =>
        <a key={item.rule} href={`${target}#${item.rule}`}>
          <b>{String(index + 1).padStart(2, "0")}</b>
          {/* Tag and question are one grid cell: `.source-links a` lays out
              three columns, and a fourth child would push the arrow onto its
              own row. */}
          <span className="panel-question">
            <i className={`panel-tag ${item.section}`}>{t.tag[item.section]}</i>{item.question[lang]}
          </span>
          <span>→</span>
        </a>)}
    </div>
    <a className="dispute-panel-all" href={target}>{t.all} →</a>
  </div>;
}
