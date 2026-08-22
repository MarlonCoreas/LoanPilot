// Extensions written out: the test suite imports this module through Node's
// type stripping, which resolves specifiers literally. See tsconfig.json.
import type { Lang } from "./routes.ts";
import { fillWith } from "./holes.ts";
import { CONTESTED_FIGURES, type ContestedFigure } from "./statutory.ts";

/**
 * The layer between a figure the engine derived and a sentence a person reads.
 *
 * `statutory.ts` produces the numbers; `disputes.ts` writes the prose by hand
 * in both languages with `{holes}` where the numbers go. Neither can produce
 * "unos $110" on its own: the engine has no opinion about language, and the
 * prose must not hold the value. This file is that seam, and it is the whole
 * reason injection is usable here — a raw `110.41` dropped into a Spanish
 * sentence about what a resignation is worth reads like machine output, and the
 * page loses the register that makes anybody trust it.
 *
 * WHAT THE FORMATTER MAY DO. Round, pick the right plural, and say when it has
 * rounded. What it may NOT do is change which figure is being shown. Rounding
 * $110.41 to "unos $110" is honest because the sentence is about a magnitude a
 * reader carries into a negotiation, and the cents are noise at that altitude;
 * the exact figure is a calculator away and the page links to it. Rounding to
 * "around $100" would not be, and the rounding is therefore fixed at the dollar
 * rather than left to whoever writes the next entry.
 */

const locale = (lang: Lang) => lang === "es" ? "es-SV" : "en-GB";

/** Grouped thousands, no cents. El Salvador is dollarised; both locales agree. */
function dollars(value: number, lang: Lang) {
  return `$${Math.round(value).toLocaleString(locale(lang))}`;
}

function cents(value: number, lang: Lang) {
  return `$${value.toLocaleString(locale(lang), {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })}`;
}

/**
 * One decimal, and the singular when the rounded figure really is one. Spanish
 * and English happen to pluralise this the same way, but the agreement is
 * written out rather than assumed: "1 día" against "1 días" is the kind of seam
 * that makes a page look generated, which on this page costs more than it would
 * on any other.
 */
function days(value: number, lang: Lang) {
  const rounded = Math.round(value * 10) / 10;
  const noun = rounded === 1
    ? (lang === "es" ? "día" : "day")
    : (lang === "es" ? "días" : "days");
  return `${rounded.toLocaleString(locale(lang))} ${noun}`;
}

export function formatFigure(figure: ContestedFigure, lang: Lang): string {
  switch (figure.kind) {
    case "money":
      return dollars(figure.value, lang);
    case "preciseMoney":
      return cents(figure.value, lang);
    case "count":
      return figure.value.toLocaleString(locale(lang));
    case "approxMoney":
      // The hedge belongs to the formatter and not to the sentence, because it
      // is a property of the rounding and not of the claim: a hand-written
      // "unos" could survive a switch to an exact figure and quietly turn into
      // a hedge about something that is no longer approximate.
      return lang === "es" ? `unos ${dollars(figure.value, lang)}` : `around ${dollars(figure.value, lang)}`;
    case "days":
      return days(figure.value, lang);
    case "percent":
      return `${(Math.round(figure.value * 10) / 10).toLocaleString(locale(lang))}%`;
  }
}

/**
 * Fill one hand-written sentence from a rule's derived figures.
 *
 * An unknown hole THROWS rather than rendering `{atMinimum}` into the page or
 * silently dropping it. Both quiet failures are worse than a broken build here:
 * one ships visible template syntax to a reader being asked to trust the site's
 * arithmetic, and the other ships a sentence with its magnitude removed —
 * "son sobre el salario mínimo de comercio" — which still reads like prose and
 * would survive review. A rule with no figures at all is fine, and common: only
 * the entries that quote an amount need any.
 */
export function fillFigures(template: string, rule: string, lang: Lang): string {
  const figures = CONTESTED_FIGURES[rule] ?? {};
  return fillWith(template, (name) => {
    const figure = figures[name];
    if (!figure) {
      throw new Error(`stakes: ${rule} no deriva ninguna cifra para {${name}}`);
    }
    return formatFigure(figure, lang);
  });
}
