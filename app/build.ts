// Extensions written out: the test suite imports this module through Node's
// type stripping, which resolves specifiers literally. See tsconfig.json.
import type { Lang } from "./routes.ts";

/**
 * Which version of the site the reader is looking at.
 *
 * The values are substituted by Vite at build time (see `vite.config.ts`), not
 * read from a clock or a repository here — the server render and the browser
 * hydration have to produce the same string.
 *
 * WHY THIS IS IN THE FOOTER AND NOT IN A COMMENT. A stamp only does its job if
 * somebody reviewing a page can read it without opening dev tools: the whole
 * failure it exists to prevent is a person reporting, in good faith, on markup
 * their browser cached days ago. It sits beside the copyright line, quiet, and
 * costs a reader who does not care about it nothing.
 *
 * It is deliberately NOT the "sources verified" date, which lives higher up the
 * page and means something else entirely: that one says when a human last read
 * the law, and it must not move when the site is merely rebuilt.
 */
declare const __BUILD_DATE__: string;
declare const __BUILD_COMMIT__: string;

export const BUILD_DATE: string = typeof __BUILD_DATE__ === "string" ? __BUILD_DATE__ : "";
export const BUILD_COMMIT: string = typeof __BUILD_COMMIT__ === "string" ? __BUILD_COMMIT__ : "";

/**
 * The stamp as one line, or nothing when there is no date to show. The commit
 * is dropped rather than faked when git was not available at build time: half
 * a stamp still answers "is this the copy I saw yesterday?", which is the
 * question that matters most often.
 */
export function buildStamp(lang: Lang): string | undefined {
  if (BUILD_DATE === "") return undefined;
  const label = lang === "es" ? "Versión" : "Build";
  return BUILD_COMMIT === ""
    ? `${label} ${BUILD_DATE}`
    : `${label} ${BUILD_DATE} · ${BUILD_COMMIT}`;
}
