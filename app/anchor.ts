import { useEffect } from "react";

/**
 * Landing on the section a link pointed at, instead of at the top of the page.
 *
 * WHY THE BROWSER CANNOT DO THIS ON ITS OWN HERE. `static/main.tsx` calls
 * `root.replaceChildren()` and then `createRoot`, on purpose: the prerendered
 * snapshot in index.html carries build-time dates and the form defaults are
 * derived from today, so React discards the snapshot rather than hydrate onto
 * it. The browser does start its jump to the anchor — the id is in that
 * snapshot — and then the snapshot is thrown away underneath the jump. What
 * survives is scroll position zero and an element that did not exist for the
 * moment that mattered. `scroll-behavior: smooth` makes it worse, because the
 * jump is an animation and the re-render cancels it.
 *
 * So the scroll is repeated once, after React has rendered and the layout has
 * settled. `instant` on purpose: a page that opens by gliding down from the top
 * is a different, sillier bug.
 *
 * This was the /reglas-en-disputa/ fix for a while, because that page is the
 * one whose whole job is to answer the specific question a reader clicked on.
 * It turned out to be true of every anchor on the site — `#tools`, `#guide`,
 * `#deudas` all sat at the top — so it lives here and `App` applies it once for
 * every page.
 */
/**
 * The element id a fragment names, or null when it names none.
 *
 * Separated from the hook because it is the half that can break in silence.
 * THE FRAGMENT IS SHARED WITH `share.ts`: a link that carries somebody's
 * figures lives there too, and the two have to agree about which is which
 * forever. `share.ts` recognises its own payload by the `=` in it and every id
 * on this site is a single token without one, so that is the test in both
 * places — and `tests/share.test.mjs` holds the two against each other, because
 * a change to the payload format that nobody mirrored here would either swallow
 * every anchor or blank a form for a reader who followed a link down the page.
 */
export function anchorId(fragment: string): string | null {
  const raw = fragment.replace(/^#/, "");
  if (raw === "" || raw.includes("=")) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    // A hand-typed fragment with a stray percent sign. Not an id either.
    return null;
  }
}

export function useAnchoredEntry() {
  useEffect(() => {
    const id = anchorId(window.location.hash);
    if (id === null) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "instant", block: "start" });
  }, []);
}
