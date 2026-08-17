import { disputeFor, pagesApplying, type Backing, type Bilingual, type Reading } from "./disputes";
import { reviewedDate, reviewedLineFor } from "./reviewed";
import { PAGE_LABELS, ROUTES, type Lang } from "./routes";
import { disputedVersions, type RuleId, type RuleStatus } from "./rules";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { OFFICIAL } from "./sources";
import UtilityHero from "./UtilityHero";

/**
 * Every rule this project applies without being able to say it is the only
 * defensible one.
 *
 * NOTHING ON THIS PAGE IS WRITTEN HERE. The list comes from `disputedVersions()`
 * — every version in `rules.ts` marked DISPUTED or UNSOURCED — and the prose
 * comes from `disputes.ts`, keyed by rule id. Adding a fifth dispute is marking
 * a fifth rule and writing its two readings; there is no list on this page to
 * remember to update, because a page like this is only worth anything if it
 * cannot fall behind the code it describes. `tests/build-output.test.mjs` fails
 * the build when a contested rule does not reach the rendered HTML.
 *
 * The page is deliberately not a footnote. A reader who finds out here that the
 * accrual cycle of the year-end bonus is unsettled learns something no other
 * Salvadoran calculator will tell them, and the layout treats that as the
 * argument it is rather than as an apology for the arithmetic.
 */

const copy = {
  es: {
    heroTitle: "Las reglas que no están resueltas.",
    heroLead: "Cuatro cifras de este sitio salen de una lectura que no es la única posible. Aquí está cada una: las dos lecturas, la que aplica LoanPilot, por qué, y el documento donde puede comprobarse.",
    introEyebrow: "POR QUÉ EXISTE ESTA PÁGINA",
    introTitle: "Una calculadora que no puede estar en desacuerdo consigo misma",
    introLead: "La ley salvadoreña no siempre dice una sola cosa. A veces el texto y la práctica del ministerio no coinciden; a veces ningún artículo fija el dato que el cálculo necesita. Ocultarlo produce una cifra que parece más firme de lo que es, y esa falsa firmeza es lo que le cuesta dinero a alguien en una mesa de negociación.",
    legendTitle: "Cómo leer cada ficha",
    legend: [
      ["EN DISPUTA", "Hay dos lecturas defendibles: un texto y una práctica oficial que no dicen lo mismo, o dos artículos que se leen distinto.", "⚖"],
      ["SIN FUENTE", "Ningún documento fija el valor. La cifra que usa este sitio es una decisión propia, y se nombra como tal.", "○"],
      ["LA QUE SE APLICA", "De las dos lecturas, la que produce la cifra en pantalla. Marcada como aplicada, nunca como correcta.", "▸"],
    ] as const,
    stakes: "Qué está en juego",
    readings: "Las dos lecturas",
    applied: "La que aplica LoanPilot",
    notApplied: "La que no se aplica",
    why: "Por qué",
    backing: { text: "Lo dice un texto", practice: "Lo hace la institución", none: "No lo respalda nada" },
    source: "Fuente",
    noSource: "Sin documento que lo fije",
    where: "Dónde te afecta",
    reviewed: (date: string) => `Leído contra la fuente el ${date}`,
    registryNote: "Cada ficha se genera desde el registro de reglas del repositorio. Marcar una regla como disputada es lo único que hace falta para que aparezca aquí: no hay una lista aparte que alguien pueda olvidar.",
    changeTitle: "Qué cambiaría esto",
    changeText: "Un decreto, una reforma o un criterio publicado por el ministerio que administra la regla. Nada más: ni una nota de prensa, ni una opinión, ni la costumbre de una planilla. Si tenés a mano un documento oficial que resuelva alguna de estas, el proyecto es abierto y se puede reportar.",
    report: "Reportar una diferencia o aportar una fuente",
    repo: "Ver el registro de reglas en GitHub",
  },
  en: {
    heroTitle: "The rules that are not settled.",
    heroLead: "Four figures on this site come from a reading that is not the only defensible one. Here is each: both readings, the one LoanPilot applies, why, and the document where it can be checked.",
    introEyebrow: "WHY THIS PAGE EXISTS",
    introTitle: "A calculator that cannot disagree with itself",
    introLead: "Salvadoran law does not always say one thing. Sometimes a text and the ministry's practice diverge; sometimes no article fixes the figure the calculation needs. Hiding that produces a number that looks firmer than it is, and that false firmness is what costs somebody money across a negotiating table.",
    legendTitle: "How to read each entry",
    legend: [
      ["DISPUTED", "Two defensible readings: a text and an official practice that differ, or two articles that read against each other.", "⚖"],
      ["UNSOURCED", "No document fixes the value. The figure this site uses is its own decision, and is named as one.", "○"],
      ["THE ONE APPLIED", "Of the two readings, the one that produces the figure on screen. Marked as applied, never as correct.", "▸"],
    ] as const,
    stakes: "What is at stake",
    readings: "The two readings",
    applied: "The one LoanPilot applies",
    notApplied: "The one it does not apply",
    why: "Why",
    backing: { text: "A text says so", practice: "The institution does so", none: "Nothing backs it" },
    source: "Source",
    noSource: "No document fixes it",
    where: "Where it affects you",
    reviewed: (date: string) => `Read back against the source on ${date}`,
    registryNote: "Every entry is generated from the repository's rule registry. Marking a rule as disputed is all it takes for it to appear here: there is no separate list for anyone to forget.",
    changeTitle: "What would change this",
    changeText: "A decree, a reform, or a published criterion from the institution that administers the rule. Nothing else: not a press report, not an opinion, not what one payroll department happens to do. If you have an official document that settles any of these, the project is open and it can be reported.",
    report: "Report a difference or contribute a source",
    repo: "See the rule registry on GitHub",
  },
} as const;

const STATUS_LABELS: Record<RuleStatus, Bilingual> = {
  DISPUTED: { es: "EN DISPUTA", en: "DISPUTED" },
  UNSOURCED: { es: "SIN FUENTE", en: "UNSOURCED" },
  "NOT MODELLED": { es: "NO MODELADA", en: "NOT MODELLED" },
};

const REPOSITORY = "https://github.com/MarlonCoreas/LoanPilot/blob/main/app/rules.ts";

function ReadingCard({ reading, lang, t }: {
  reading: Reading; lang: Lang; t: typeof copy.es | typeof copy.en;
}) {
  const backing: Record<Backing, string> = t.backing;
  return <article className={reading.applied ? "reading applied" : "reading"}>
    <header>
      <b>{reading.applied ? t.applied : t.notApplied}</b>
      <span className={`backing ${reading.backing}`}>{backing[reading.backing]}</span>
    </header>
    <h4>{reading.label[lang]}</h4>
    <p>{reading.text[lang]}</p>
  </article>;
}

export default function DisputedRulesPage({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const contested = disputedVersions();

  return <main className="legal-page disputed-page">
    <SiteHeader lang={lang} page="disputed" />
    <UtilityHero title={t.heroTitle} lead={t.heroLead} trust={reviewedLineFor(lang, "disputed")} />
    <section className="statutory-tools standalone-tools" id="rules">
      <div className="dispute-intro">
        <div className="section-title"><span>00</span><div><h2>{t.introTitle}</h2><p>{t.introEyebrow}</p></div></div>
        <p className="dispute-lead">{t.introLead}</p>
        <div className="dispute-legend">
          <h3>{t.legendTitle}</h3>
          <div>{t.legend.map(([label, text, icon]) => <div key={label}>
            <i aria-hidden="true">{icon}</i><b>{label}</b><span>{text}</span>
          </div>)}</div>
        </div>
        <p className="field-note">{t.registryNote}</p>
      </div>

      {contested.map(({ rule, version }, index) => {
        // A contested rule with no reader-facing entry cannot be published as a
        // blank card: the test suite fails first, and this keeps the page
        // honest if it ever runs in a build where it did not.
        const dispute = disputeFor(rule.id as RuleId);
        if (!dispute) return null;
        const pages = pagesApplying(rule.id as RuleId);
        return <article className="dispute-card" key={rule.id} id={rule.id}>
          <header className="dispute-head">
            <span className="dispute-index">{String(index + 1).padStart(2, "0")}</span>
            <div className="dispute-flags">
              {(version.status ?? []).map((status) =>
                <b key={status} className={status === "UNSOURCED" ? "flag unsourced" : "flag"}>
                  {STATUS_LABELS[status][lang]}
                </b>)}
            </div>
            <h2>{dispute.question[lang]}</h2>
            <p className="dispute-norm">{version.norm}</p>
          </header>

          <div className="dispute-stakes">
            <span>{t.stakes}</span>
            <p>{dispute.stakes[lang]}</p>
          </div>

          <div className="dispute-readings">
            <h3>{t.readings}</h3>
            <div>{dispute.readings.map((reading) =>
              <ReadingCard key={reading.label.en} reading={reading} lang={lang} t={t} />)}</div>
          </div>

          <div className="dispute-why">
            <h3>{t.why}</h3>
            <p>{dispute.why[lang]}</p>
          </div>

          <footer className="dispute-foot">
            <div>
              <span>{t.source}</span>
              <a href={OFFICIAL[version.source]} target="_blank" rel="noreferrer">
                {version.norm}<i aria-hidden="true">↗</i>
              </a>
              <small>{t.reviewed(reviewedDate(lang, version.reviewed))}</small>
            </div>
            {pages.length > 0 && <div>
              <span>{t.where}</span>
              <div className="dispute-pages">{pages.map((page) =>
                <a key={page} href={ROUTES[lang][page]}>{PAGE_LABELS[lang][page]}<i aria-hidden="true">→</i></a>)}
              </div>
            </div>}
          </footer>
        </article>;
      })}

      <div className="source-panel dispute-change">
        <h2>{t.changeTitle}</h2>
        <p>{t.changeText}</p>
        <div className="source-links">
          <a href={OFFICIAL.issues} target="_blank" rel="noreferrer"><b>01</b>{t.report}<span>↗</span></a>
          <a href={REPOSITORY} target="_blank" rel="noreferrer"><b>02</b>{t.repo}<span>↗</span></a>
        </div>
      </div>
    </section>
    <SiteFooter lang={lang} />
  </main>;
}
