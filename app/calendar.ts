// Extensions written out: the test suite imports this module through Node's
// type stripping, which resolves specifiers literally. See tsconfig.json.
import { fillDeep, fillWith } from "./holes.ts";
import type { Lang } from "./routes.ts";
import {
  aguinaldoCutoff, aguinaldoCycleStart, aguinaldoPaymentWindow, currentValue, ruleAt,
  type YearDay,
} from "./rules.ts";

/**
 * THE CALENDAR OF THE YEAR-END BONUS, TAKEN FROM THE REGISTRY.
 *
 * Four dates govern the aguinaldo, and they are easy to confuse because two of
 * them used to be the same day:
 *
 *   cycleOpens     12 December — accrual starts
 *   cycleCloses    11 December — the day before it: the cycle ends, and the
 *                  scale of days is read
 *   windowOpens    20 October  — payment may begin, and NOTHING else
 *   windowCloses   20 December — the deadline
 *
 * Before D.L. 433, article 197 measured service on 12 December and payment fell
 * due the same day. The reform moved the WINDOW to 20 October and left the
 * accrual where it was, so one date became two — and the prose did not follow.
 * Two FAQ entries ended up adjacent and contradicting each other about what 20
 * October means; the aguinaldo calculator's cycle note still told readers the
 * site prorated over the calendar year, months after it had stopped, and
 * repeated an attribution to the MTPS that had already been withdrawn from the
 * disputed-rules page as overstated. All of it shipped and was read.
 *
 * The dates are therefore no longer written into sentences. `rules.ts` holds
 * them with the decree that set them, this renders them in the reader's
 * language, and `fillDates` puts them into hand-written prose through the same
 * `{holes}` the disputed-rules figures use. A reform that moves one of these
 * days now moves every sentence that names it — which is the only arrangement
 * under which a page of prose about a calendar can be trusted.
 *
 * WHY THIS IS NOT IN `stakes.ts`, which does the same job for the figures: that
 * module runs the settlement engine to derive its scenarios, and this one needs
 * nothing but the registry. `routes.ts` names a cycle date in a meta
 * description and is imported by every page while importing nothing itself;
 * pointing it at the engine to render "12 de diciembre" would put the whole
 * calculator in the bundle of pages that never calculate anything.
 */

const MONTHS = {
  es: ["enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"],
  en: ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"],
} as const;

export function formatYearDay({ month, day }: YearDay, lang: Lang) {
  const name = MONTHS[lang][month - 1];
  return lang === "es" ? `${day} de ${name}` : `${day} ${name}`;
}

const CYCLE_OPENS = currentValue(aguinaldoCycleStart);
const WINDOW = currentValue(aguinaldoPaymentWindow);

/**
 * The day the cycle ends: derived, because it is by definition the day before
 * it opens and a second registry entry could drift from the first. Anchored in
 * an arbitrary non-leap year, which is safe because both dates fall in
 * December, where no leap day ever lands.
 */
function dayBefore({ month, day }: YearDay): YearDay {
  const date = new Date(Date.UTC(2001, month - 1, day - 1));
  return { month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

/**
 * What the cutoff was before the 2025 reform, read out of the same rule's
 * earlier version rather than remembered. Prose that contrasts "before" with
 * "now" needs both dates, and the registry already keeps the history — so the
 * "before" half is as checkable as the "now" half, which is the half that was
 * wrong.
 */
const PREVIOUS_CUTOFF = ruleAt(aguinaldoCutoff, "2025-10-19").version.value;

export const SITE_DATES: Record<string, YearDay> = {
  cycleOpens: CYCLE_OPENS,
  cycleCloses: dayBefore(CYCLE_OPENS),
  windowOpens: WINDOW.opens,
  windowCloses: WINDOW.closes,
  previousCutoff: PREVIOUS_CUTOFF,
};

/** Fill one hand-written sentence. An unknown hole throws; see `holes.ts`. */
export function fillDates(template: string, lang: Lang): string {
  return fillWith(template, (name) => {
    const date = SITE_DATES[name];
    if (!date) throw new Error(`calendar: el registro no tiene fecha para {${name}}`);
    return formatYearDay(date, lang);
  });
}

/** The same, over a whole tree of page copy. */
export function datedCopy<T>(copy: T, lang: Lang): T {
  return fillDeep(copy, (text) => fillDates(text, lang));
}
