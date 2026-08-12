import type { Lang } from "./routes";
import { RULES_REVIEWED } from "./statutory";

/**
 * The freshness claim the site makes, written out in the reader's language.
 *
 * The badge on the calculators used to read "Actualizada a 2026" as a
 * hardcoded string, so it kept making the claim no matter how old the figures
 * were. Each page now renders the day its own constants were last read back
 * against the official text: the employment and tax figures carry one date
 * (`RULES_REVIEWED`), the overtime rules carry theirs, and a page that quotes
 * both would be claiming the older of the two.
 */
export function reviewedDate(lang: Lang, isoDate: string = RULES_REVIEWED) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat(lang === "es" ? "es-SV" : "en-GB", {
    day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function reviewedLine(lang: Lang, isoDate: string = RULES_REVIEWED) {
  return lang === "es"
    ? `Normativa de El Salvador · Fuentes verificadas el ${reviewedDate(lang, isoDate)}`
    : `El Salvador rules · Sources verified on ${reviewedDate(lang, isoDate)}`;
}
