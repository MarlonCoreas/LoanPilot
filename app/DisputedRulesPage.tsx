import type { ReactNode } from "react";
import {
  assumptionFor, disputeFor, pagesApplying,
  type Backing, type Bilingual, type Reading,
} from "./disputes";
import { reviewedDate, reviewedLineFor } from "./reviewed";
import { PAGE_LABELS, ROUTES, type Lang } from "./routes";
import { disputedVersions, type AnyRule, type RuleId, type RuleStatus, type RuleVersion } from "./rules";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { OFFICIAL } from "./sources";
import UtilityHero from "./UtilityHero";

/**
 * Every rule this project applies without being able to say it is the only
 * defensible one, and every figure it applies without a document behind it.
 *
 * TWO SECTIONS, BECAUSE THEY ARE TWO PROBLEMS. A dispute is a text and a
 * practice — or two articles — saying different things: there are two readings
 * and one of them is applied. An assumption is a silence: nothing to argue
 * with, and a figure somebody had to choose. Printing them under one heading
 * flattered the second kind, which is usually the worse of the two: the divisor
 * that turns a monthly salary into a daily one is not contested by anybody, and
 * it moves every daily figure on the site.
 *
 * NOTHING ON THIS PAGE IS WRITTEN HERE. The lists come from `disputedVersions()`
 * — every version in `rules.ts` marked DISPUTED or UNSOURCED, split by which of
 * the two flags it carries — and the prose comes from `disputes.ts`, keyed by
 * rule id. Publishing a new one is marking the rule and writing its entry;
 * there is no list on this page to remember to update, because a page like this
 * is only worth anything if it cannot fall behind the code it describes.
 * `tests/build-output.test.mjs` fails the build when a marked rule does not
 * reach the rendered HTML.
 *
 * The page is deliberately not a footnote. A reader who finds out here that the
 * accrual cycle of the year-end bonus is unsettled learns something no other
 * Salvadoran calculator will tell them, and the layout treats that as the
 * argument it is rather than as an apology for the arithmetic.
 */

const copy = {
  es: {
    heroTitle: "Las reglas", heroAccent: "que no están resueltas.",
    heroLead: "Algunas cifras de este sitio salen de una lectura que no es la única posible; otras, de un dato que ningún documento fija. Están todas aquí, separadas por lo que les pasa, con lo que aplica LoanPilot, por qué, y el documento donde puede comprobarse.",
    introEyebrow: "POR QUÉ EXISTE ESTA PÁGINA",
    introTitle: "Una calculadora que no puede estar en desacuerdo consigo misma",
    introLead: "La ley salvadoreña no siempre dice una sola cosa. A veces el texto y la práctica del ministerio no coinciden; a veces ningún artículo fija el dato que el cálculo necesita. Ocultarlo produce una cifra que parece más firme de lo que es, y esa falsa firmeza es lo que le cuesta dinero a alguien en una mesa de negociación.",
    legendTitle: "Cómo leer cada ficha",
    legend: [
      ["EN DISPUTA", "Hay dos lecturas defendibles: un texto y una práctica oficial que no dicen lo mismo, o dos artículos que se leen distinto. Se aplica una.", "⚖"],
      ["SIN FUENTE", "Ningún documento fija el valor. No hay dos lecturas que contraponer: hay un silencio y una cifra que este proyecto eligió.", "○"],
      ["LA QUE SE APLICA", "De las dos lecturas, la que produce la cifra en pantalla. Marcada como aplicada, nunca como correcta.", "▸"],
    ] as const,
    disputedTitle: "Reglas en disputa",
    disputedEyebrow: "DOS LECTURAS, UNA APLICADA",
    disputedLead: "Aquí hay algo con qué discutir: un texto que dice una cosa y una práctica oficial que hace otra, o dos artículos que no se leen igual. Las dos lecturas aparecen con la misma voz, y la que se aplica está marcada como aplicada, no como correcta.",
    unsourcedTitle: "Supuestos sin fuente",
    unsourcedEyebrow: "LA LEY CALLA",
    unsourcedLead: "Aquí no hay dos lecturas que contraponer. Ningún texto fija el dato, el cálculo lo necesita igual, y este proyecto lo eligió. Cada ficha dice hasta dónde llega esa elección, porque eso es lo que decide cuánto importa.",
    stakes: "Qué está en juego",
    readings: "Las dos lecturas",
    applied: "La que aplica LoanPilot",
    notApplied: "La que no se aplica",
    silence: "Lo que dicen los textos, y dónde se detienen",
    choice: "Lo que aplica LoanPilot",
    reach: "Hasta dónde llega",
    why: "Por qué",
    backing: { text: "Lo dice un texto", practice: "Lo hace la institución", none: "No lo respalda nada" },
    source: "Fuente",
    noSource: "Sin documento que lo fije",
    where: "Dónde te afecta",
    reviewed: (date: string) => `Leído contra la fuente el ${date}`,
    registryNote: "Cada ficha se genera desde el registro de reglas del repositorio, y la sección en que aparece sale de la marca que lleva la regla: no hay una lista aparte que alguien pueda olvidar, ni una ficha que pueda quedar en la sección equivocada.",
    changeTitle: "Qué cambiaría esto",
    changeText: "Un decreto, una reforma o un criterio publicado por el ministerio que administra la regla. Nada más: ni una nota de prensa, ni una opinión, ni la costumbre de una planilla. Si tenés a mano un documento oficial que resuelva alguna de estas, el proyecto es abierto y se puede reportar.",
    report: "Reportar una diferencia o aportar una fuente",
    repo: "Ver el registro de reglas en GitHub",
  },
  en: {
    heroTitle: "The rules", heroAccent: "that are not settled.",
    heroLead: "Some figures on this site come from a reading that is not the only defensible one; others come from a value no document fixes. They are all here, separated by which of the two is wrong with them, with what LoanPilot applies, why, and the document where it can be checked.",
    introEyebrow: "WHY THIS PAGE EXISTS",
    introTitle: "A calculator that cannot disagree with itself",
    introLead: "Salvadoran law does not always say one thing. Sometimes a text and the ministry's practice diverge; sometimes no article fixes the figure the calculation needs. Hiding that produces a number that looks firmer than it is, and that false firmness is what costs somebody money across a negotiating table.",
    legendTitle: "How to read each entry",
    legend: [
      ["DISPUTED", "Two defensible readings: a text and an official practice that differ, or two articles that read against each other. One of them is applied.", "⚖"],
      ["UNSOURCED", "No document fixes the value. There are no two readings to set against each other: there is a silence, and a figure this project chose.", "○"],
      ["THE ONE APPLIED", "Of the two readings, the one that produces the figure on screen. Marked as applied, never as correct.", "▸"],
    ] as const,
    disputedTitle: "Rules in dispute",
    disputedEyebrow: "TWO READINGS, ONE APPLIED",
    disputedLead: "Here there is something to argue about: a text saying one thing and an official practice doing another, or two articles that do not read alike. Both readings appear in the same voice, and the one applied is marked as applied, not as correct.",
    unsourcedTitle: "Assumptions with no source",
    unsourcedEyebrow: "THE LAW IS SILENT",
    unsourcedLead: "Here there are no two readings to set against each other. No text fixes the value, the calculation needs one anyway, and this project chose it. Each entry says how far that choice travels, because that is what decides how much it matters.",
    stakes: "What is at stake",
    readings: "The two readings",
    applied: "The one LoanPilot applies",
    notApplied: "The one it does not apply",
    silence: "What the texts say, and where they stop",
    choice: "What LoanPilot applies",
    reach: "How far it travels",
    why: "Why",
    backing: { text: "A text says so", practice: "The institution does so", none: "Nothing backs it" },
    source: "Source",
    noSource: "No document fixes it",
    where: "Where it affects you",
    reviewed: (date: string) => `Read back against the source on ${date}`,
    registryNote: "Every entry is generated from the repository's rule registry, and the section it lands in comes from the flag the rule carries: there is no separate list for anyone to forget, and no entry that can end up under the wrong heading.",
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

type Copy = typeof copy.es | typeof copy.en;
type Contested = { rule: AnyRule; version: RuleVersion<unknown> };

function ReadingCard({ reading, lang, t }: { reading: Reading; lang: Lang; t: Copy }) {
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

/**
 * The head, foot and numbering every entry shares, whichever kind it is.
 *
 * The two bodies differ — two readings against a silence — but the frame must
 * not: the same anchor to link a callout at, the same flags, the same article,
 * the same document to open and the same list of pages the figure moves. A
 * reader arriving from a callout should not be able to tell which section they
 * landed in from the furniture.
 */
function EntryCard({ index, rule, version, question, lang, t, children }: {
  index: number; rule: AnyRule; version: RuleVersion<unknown>; question: Bilingual;
  lang: Lang; t: Copy; children: ReactNode;
}) {
  const pages = pagesApplying(rule.id as RuleId);
  return <article className="dispute-card" id={rule.id}>
    <header className="dispute-head">
      <span className="dispute-index">{String(index + 1).padStart(2, "0")}</span>
      <div className="dispute-flags">
        {(version.status ?? []).map((status) =>
          <b key={status} className={status === "UNSOURCED" ? "flag unsourced" : "flag"}>
            {STATUS_LABELS[status][lang]}
          </b>)}
      </div>
      <h2>{question[lang]}</h2>
      <p className="dispute-norm">{version.norm}</p>
    </header>

    {children}

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
}

function DisputeSection({ contested, lang, t }: { contested: Contested[]; lang: Lang; t: Copy }) {
  return <>{contested.map(({ rule, version }, index) => {
    // A marked rule with no reader-facing entry cannot be published as a blank
    // card: the test suite fails first, and this keeps the page honest if it
    // ever runs in a build where it did not.
    const dispute = disputeFor(rule.id as RuleId);
    if (!dispute) return null;
    return <EntryCard key={rule.id} index={index} rule={rule} version={version}
      question={dispute.question} lang={lang} t={t}>
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
    </EntryCard>;
  })}</>;
}

/**
 * The silence half. `reach` is given the loudest slot on the card — the one the
 * disputed entries use for what is at stake — because for a figure nobody
 * contests, how far it travels IS what is at stake.
 */
function AssumptionSection({ contested, lang, t }: { contested: Contested[]; lang: Lang; t: Copy }) {
  return <>{contested.map(({ rule, version }, index) => {
    const assumption = assumptionFor(rule.id as RuleId);
    if (!assumption) return null;
    return <EntryCard key={rule.id} index={index} rule={rule} version={version}
      question={assumption.question} lang={lang} t={t}>
      <div className="dispute-stakes">
        <span>{t.reach}</span>
        <p>{assumption.reach[lang]}</p>
      </div>

      <div className="dispute-readings">
        <div className="assumption-pair">
          <article className="reading">
            <header><b>{t.silence}</b><span className="backing none">{t.noSource}</span></header>
            <p>{assumption.silence[lang]}</p>
          </article>
          <article className="reading applied">
            <header><b>{t.choice}</b><span className="backing practice">{t.backing.practice}</span></header>
            <p>{assumption.choice[lang]}</p>
          </article>
        </div>
      </div>

      <div className="dispute-why">
        <h3>{t.why}</h3>
        <p>{assumption.why[lang]}</p>
      </div>
    </EntryCard>;
  })}</>;
}

export default function DisputedRulesPage({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const disputed = disputedVersions("disputed");
  const unsourced = disputedVersions("unsourced");

  return <main className="legal-page disputed-page">
    <SiteHeader lang={lang} page="disputed" />
    <UtilityHero title={t.heroTitle} accent={t.heroAccent} lead={t.heroLead} trust={reviewedLineFor(lang, "disputed")} />
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

      {disputed.length > 0 && <>
        <div className="dispute-section-head" id="disputed">
          <div className="section-title"><span>01</span><div><h2>{t.disputedTitle}</h2><p>{t.disputedEyebrow}</p></div></div>
          <p>{t.disputedLead}</p>
        </div>
        <DisputeSection contested={disputed} lang={lang} t={t} />
      </>}

      {unsourced.length > 0 && <>
        <div className="dispute-section-head" id="unsourced">
          <div className="section-title"><span>02</span><div><h2>{t.unsourcedTitle}</h2><p>{t.unsourcedEyebrow}</p></div></div>
          <p>{t.unsourcedLead}</p>
        </div>
        <AssumptionSection contested={unsourced} lang={lang} t={t} />
      </>}

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
