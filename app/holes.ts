/**
 * The `{hole}` syntax, and nothing else.
 *
 * Two things fill holes in this project's prose — the derived figures of the
 * disputed-rules page (`stakes.ts`) and the calendar of the year-end bonus
 * (`calendar.ts`) — and they must agree on what a hole looks like, or a
 * sentence would render half-filled depending on which one reached it.
 *
 * It is its own module rather than a shared import from either of them because
 * of what they weigh. `stakes.ts` pulls in the whole settlement engine to run
 * its scenarios; `calendar.ts` needs only the registry, and `routes.ts` — which
 * every page imports for its metadata and which imports nothing itself — needs
 * only `calendar.ts`. Hanging the regex off `stakes.ts` would drag the engine
 * into the bundle of every page that names a date in a meta description.
 */
const HOLE = /\{([a-zA-Z]+)\}/g;

/**
 * Replace every hole by name. `resolve` is expected to THROW on a name it does
 * not know rather than return a placeholder: rendering `{cycleCloses}` to a
 * reader, or quietly dropping it and leaving "el ciclo cierra el ", are both
 * worse than failing the build. Callers own that decision because they own the
 * error message that says which table was missing what.
 */
export function fillWith(template: string, resolve: (name: string) => string): string {
  return template.replace(HOLE, (_match, name: string) => resolve(name));
}

/** Every hole a template asks for, for the tests that check both sides agree. */
export function holesIn(template: string): string[] {
  return [...template.matchAll(HOLE)].map(([, name]) => name);
}

/**
 * Fill every string in a tree of copy, leaving its shape alone.
 *
 * The page copy of this project is nested objects of arrays of tuples, and the
 * alternative to walking it is calling `fillDates` at each of the forty-odd
 * places a string reaches the markup — where the one that gets forgotten is
 * the one that ships a `{hole}` to a reader. Applied once to `copy[lang]`, a
 * new sentence with a date in it is filled by default rather than on
 * remembering to.
 */
export function fillDeep<T>(value: T, fill: (text: string) => string): T {
  if (typeof value === "string") return fill(value) as T;
  if (Array.isArray(value)) return value.map((item) => fillDeep(item, fill)) as T;
  // Functions are copy too — several labels are `(date: string) => string` —
  // and they are passed through untouched rather than mangled into strings.
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, fillDeep(item, fill)]),
  ) as T;
}
