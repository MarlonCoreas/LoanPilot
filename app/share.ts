// Extensions written out: the test suite imports this module through Node's
// type stripping, which resolves specifiers literally. See tsconfig.json.

/**
 * Sharing a calculation by URL, under the one constraint this site cannot bend:
 * nothing the reader types may reach a server.
 *
 * WHY THE FRAGMENT. Everything after the `#` is stripped by the browser before
 * the request is built. It is never in the request line, never in an access
 * log, never in a Referer header. A query string would be in all three, on this
 * host and on whatever host the link is forwarded to, which is the whole reason
 * the site has no analytics in the first place. So the payload lives in the
 * fragment and the calculation stays in the reader's browser at both ends.
 *
 * WHAT GOES IN, AND WHAT NEVER DOES. Only the fields the reader filled in:
 * amounts, dates, counts, and which option a switch is on. No result, no
 * derived figure — a shared link should reproduce the calculation, not assert
 * its outcome, so that a reader who opens it gets today's rules applied to
 * yesterday's figures and can see for themselves if the answer moved. And
 * nothing that names anybody: there is no field for a name, an employer or an
 * account number anywhere in this project, and this module would refuse to
 * carry one — every value is validated against a shape below, and free text is
 * not one of the shapes.
 *
 * IT IS STILL THE READER'S SALARY. A link that carries a salary is a link that
 * should not be pasted into a group chat by accident, which is why nothing here
 * happens on its own: no page writes the fragment as the reader types, and the
 * button that builds one says what it will contain before it is pressed rather
 * than after.
 */

/** The shapes a shared value is allowed to have. Free text is not among them. */
export type ShareField =
  /** A money amount, as typed: digits with at most two decimals. */
  | { kind: "money"; max?: number }
  /** A quantity that is not money — hours, mostly — with the same two decimals. */
  | { kind: "decimal"; max?: number }
  /** A whole count — months, days, periods. */
  | { kind: "int"; max?: number }
  /** An ISO date, checked for being a real one. */
  | { kind: "date" }
  /** A checkbox. */
  | { kind: "flag" }
  /** One of a closed list: a segmented control or a select. */
  | { kind: "option"; values: readonly string[] };

export type ShareSchema = Record<string, ShareField>;
export type ShareValues = Record<string, string>;

/**
 * The cap on the whole fragment.
 *
 * No schema here comes close to it — the longest form on the site is a few
 * hundred characters — so this is not a limit on honest use. It is a limit on a
 * hand-made URL: parsing is linear in the input, and refusing early is cheaper
 * than validating a megabyte of it.
 */
const MAX_FRAGMENT_LENGTH = 1024;
const MONEY = /^\d{1,9}(\.\d{1,2})?$/;
const INT = /^\d{1,5}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The widest date this project will accept from a link.
 *
 * The forms already bound their own date pickers, and those bounds are the
 * calculators' business. This one exists so that a fragment cannot hand a page
 * the year 999999 and have it spend the afternoon building a schedule.
 */
const EARLIEST_YEAR = 1900;
const LATEST_YEAR = 2200;

/** A date that the calendar actually has: 2025-02-30 parses and is not one. */
function isRealDate(value: string) {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < EARLIEST_YEAR || year > LATEST_YEAR) return false;
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

/**
 * One value against one shape. Returns null for anything that does not fit,
 * and the caller drops the field rather than the whole link: a reader who was
 * sent a URL with one mangled parameter is better served by the other six than
 * by an empty form.
 */
export function sanitiseValue(field: ShareField, raw: string): string | null {
  if (typeof raw !== "string" || raw.length > 32) return null;
  const value = raw.trim();
  if (value === "") return null;
  switch (field.kind) {
    case "money":
    case "decimal": {
      if (!MONEY.test(value)) return null;
      if (field.max !== undefined && Number(value) > field.max) return null;
      return value;
    }
    case "int": {
      if (!INT.test(value)) return null;
      if (field.max !== undefined && Number(value) > field.max) return null;
      return value;
    }
    case "date":
      return isRealDate(value) ? value : null;
    case "flag":
      return value === "1" || value === "0" ? value : null;
    case "option":
      return field.values.includes(value) ? value : null;
  }
}

/**
 * The fragment for a set of inputs: `key=value&key=value`, readable in the
 * address bar on purpose. A reader deciding whether to send this link can see
 * what is in it without decoding anything, and that is worth more than the
 * dozen characters a compact encoding would save.
 *
 * Values that do not survive `sanitiseValue` are left out. That is not
 * defensive programming against our own forms; it is what keeps an empty field
 * from travelling as an empty parameter and reappearing at the other end as a
 * zero the reader never typed.
 */
export function encodeShare(schema: ShareSchema, values: ShareValues): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(schema)) {
    const clean = sanitiseValue(schema[key], values[key] ?? "");
    if (clean !== null) params.set(key, clean);
  }
  return params.toString();
}

/**
 * The inputs a fragment carries, with everything unrecognised discarded.
 *
 * Keys absent from the schema are dropped before their values are ever looked
 * at, so a page can only ever be handed fields it asked for. The anchors the
 * site already uses — `#tools`, `#aguinaldoScaleOnExit` — contain no `=` and
 * decode to nothing, which is what keeps this from firing on an ordinary
 * in-page link.
 */
export function decodeShare(schema: ShareSchema, fragment: string): ShareValues {
  const values: ShareValues = {};
  if (typeof fragment !== "string") return values;
  const body = fragment.replace(/^#/, "");
  if (body === "" || body.length > MAX_FRAGMENT_LENGTH || !body.includes("=")) return values;
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(body);
  } catch {
    return values;
  }
  for (const [key, raw] of params) {
    const field = schema[key];
    if (!field) continue;
    const clean = sanitiseValue(field, raw);
    if (clean !== null) values[key] = clean;
  }
  return values;
}

/** The absolute URL to share, built from the page the reader is on. */
export function shareUrl(schema: ShareSchema, values: ShareValues, href: string) {
  const fragment = encodeShare(schema, values);
  const base = href.split("#")[0];
  return fragment === "" ? base : `${base}#${fragment}`;
}

/**
 * The inputs this page was opened with, read once.
 *
 * Called from a `useState` initialiser, so it runs on the first client render
 * and never during prerendering — `location` does not exist there, and a
 * fragment is not sent to the server anyway, so there is nothing for the
 * static build to read.
 */
export function readShare(schema: ShareSchema): ShareValues {
  if (typeof window === "undefined") return {};
  return decodeShare(schema, window.location.hash);
}

/**
 * Copy, with the older API behind the modern one.
 *
 * `navigator.clipboard` needs a secure context, and the fallback covers a
 * reader on plain HTTP or an older browser. The caller reports the boolean:
 * a silent failure here looks exactly like a successful copy, and the reader
 * finds out when they paste nothing into a message.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Falls through to the textarea below.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(area);
    return copied;
  } catch {
    return false;
  }
}
