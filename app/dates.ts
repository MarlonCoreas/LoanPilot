/**
 * The calendar arithmetic every calculator that measures a period of service
 * shares.
 *
 * It lived inside `statutory.ts` for as long as the settlement was the only
 * thing that needed it. Giving the year-end bonus its own module made that
 * impossible: a module `statutory.ts` imports cannot import back out of it, and
 * a second copy of `calendarService` would have been two implementations of the
 * one function whose off-by-one decides whether an anniversary was reached.
 *
 * Everything here works in UTC, and that is not a detail. A date typed into an
 * `<input type="date">` is a calendar day and nothing else; constructing it in
 * local time turns "2026-01-01" into 31 December for every reader west of
 * Greenwich, which is all of them.
 */

export const DAY_MS = 86_400_000;

/** Cents, the unit every figure on this site is ultimately paid in. */
export const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function utcDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addUtcYears(date: Date, years: number) {
  const result = new Date(date.getTime());
  result.setUTCFullYear(result.getUTCFullYear() + years);
  // 29 February anniversaries fall on 28 February in non-leap years.
  if (result.getUTCMonth() !== date.getUTCMonth()) result.setUTCDate(0);
  return result;
}

/**
 * Length of service as complete years plus the part-year still running, with
 * the anniversary those two are split at.
 *
 * `completedYears` counts anniversaries actually reached, which is the figure
 * every seniority scale is read with: 1,095 days divides into exactly 3.0 while
 * the third anniversary is still a day away.
 */
export function calendarService(start: Date, end: Date) {
  if (end < start) return { years: 0, completedYears: 0, fraction: 0, anniversary: start };
  let completedYears = end.getUTCFullYear() - start.getUTCFullYear();
  if (addUtcYears(start, completedYears) > end) completedYears--;
  completedYears = Math.max(0, completedYears);
  const anniversary = addUtcYears(start, completedYears);
  const nextAnniversary = addUtcYears(start, completedYears + 1);
  const elapsed = Math.max(0, (end.getTime() - anniversary.getTime()) / DAY_MS);
  const span = Math.max(1, (nextAnniversary.getTime() - anniversary.getTime()) / DAY_MS);
  const fraction = Math.min(1, elapsed / span);
  return { years: completedYears + fraction, completedYears, fraction, anniversary };
}

/**
 * Whole calendar months between two dates. Scaling the year fraction by 12
 * instead assumed months of 30.4 days, so the thirtieth day after an
 * anniversary still displayed as zero months.
 */
export function completedMonths(from: Date, to: Date) {
  const months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12
    + (to.getUTCMonth() - from.getUTCMonth())
    - (to.getUTCDate() < from.getUTCDate() ? 1 : 0);
  return Math.min(11, Math.max(0, months));
}

/** Days from `start` to `end` counting both ends, which is how service accrues. */
export function daysInclusive(start: Date, end: Date) {
  if (end < start) return 0;
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}
