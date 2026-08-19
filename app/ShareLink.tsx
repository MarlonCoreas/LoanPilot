import { useState } from "react";
import type { Lang } from "./routes";
import { copyText, sanitiseValue, shareUrl, type ShareSchema, type ShareValues } from "./share";

/**
 * The button that builds a shareable link, and the notice a reader sees when
 * they open one.
 *
 * THE LABEL IS THE WARNING, and it is deliberately in front of the click rather
 * than behind it. A "copied!" toast that then explains what was copied has told
 * the reader too late: by the time they read it the salary is on the clipboard
 * and one paste away from a group chat. So the line under the button says what
 * the link carries before the button is pressed, and it says the uncomfortable
 * half too — the fragment does not reach our server, and it does reach whoever
 * the link is sent to.
 *
 * NOTHING IS DROPPED IN SILENCE. A figure the reader typed that does not fit
 * its shape — a loan amount with three decimals, say, which every numeric field
 * on the site will happily accept — would otherwise be left out of the link,
 * and the person at the other end would compute a different answer from the
 * same URL. So the button checks first and refuses to copy, naming the values
 * that will not travel. It is the same rule that keeps the active-loan mode of
 * /prestamos/ from offering a button at all: a link that quietly disagrees with
 * the screen it came from is worse than no link.
 *
 * See `share.ts` for what is allowed into the fragment and why it lives there.
 */

const copy = {
  es: {
    copy: "Copiar enlace con tus cifras",
    copied: "Enlace copiado",
    failed: "No se pudo copiar. Copialo de la barra de direcciones.",
    dropped: "No se copió nada. Este dato no cabe en un enlace y se habría ido sin avisar:",
    droppedPlural: "No se copió nada. Estos datos no caben en un enlace y se habrían ido sin avisar:",
    droppedTail: "Los montos van con dos decimales como máximo. Corregí el campo y volvé a intentar.",
    contains: "El enlace lleva lo que escribiste —montos, fechas y opciones—, nunca los resultados ni nada que te identifique. Esa parte va después del # y no viaja a ningún servidor, pero sí llega completa a quien le pases el enlace.",
    fromLink: "Estas cifras vienen del enlace que abriste",
    fromLinkText: "No las escribiste en este dispositivo y nadie las envió a un servidor: viajaron dentro de la dirección, después del #. Revisalas antes de leer el resultado y cambiá lo que no corresponda a tu caso.",
  },
  en: {
    copy: "Copy a link with your figures",
    copied: "Link copied",
    failed: "Could not copy. Take it from the address bar.",
    dropped: "Nothing was copied. This figure does not fit in a link and would have gone missing without saying so:",
    droppedPlural: "Nothing was copied. These figures do not fit in a link and would have gone missing without saying so:",
    droppedTail: "Amounts take two decimals at most. Fix the field and try again.",
    contains: "The link carries what you typed — amounts, dates and options — never the results and nothing that identifies you. That part sits after the # and reaches no server, but it does reach whoever you send the link to, in full.",
    fromLink: "These figures came from the link you opened",
    fromLinkText: "You did not type them on this device and nobody sent them to a server: they travelled inside the address, after the #. Check them before reading the result, and change whatever is not your case.",
  },
} as const;

export function ShareButton({ lang, schema, values, labels }: {
  lang: Lang; schema: ShareSchema; values: ShareValues;
  /**
   * The field names the reader sees, keyed the way the schema is. Used only to
   * say WHICH box is holding the link up — "Saldo: 1500.123" sends somebody to
   * the right field, while a bare "1500.123" makes them hunt for it. A key
   * without a label degrades to the value alone rather than to nothing.
   */
  labels?: Record<string, string>;
}) {
  const t = copy[lang];
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [dropped, setDropped] = useState<string[]>([]);

  const onCopy = async () => {
    // Anything the reader filled in that its shape will not carry. Checked
    // before the copy, not after: see the note above the component.
    const lost = Object.keys(schema)
      .filter((key) => (values[key] ?? "").trim() !== "" && sanitiseValue(schema[key], values[key]) === null)
      .map((key) => (labels?.[key] ? `${labels[key]}: ${values[key]}` : values[key]));
    if (lost.length > 0) {
      setDropped([...new Set(lost)]);
      setState("idle");
      return;
    }
    setDropped([]);
    // Built at click time, not held in state: the reader may have changed a
    // field since the page rendered, and a stale link is worse than none.
    const url = shareUrl(schema, values, window.location.href);
    const ok = await copyText(url);
    setState(ok ? "copied" : "failed");
    // Back to the offer, so a second share is one click away and the
    // confirmation does not sit there claiming something about a later state.
    window.setTimeout(() => setState("idle"), 4000);
  };

  return <div className={dropped.length > 0 ? "share-action blocked" : "share-action"}>
    <button type="button" onClick={onCopy} aria-live="polite">
      <i aria-hidden="true">⧉</i>{state === "copied" ? t.copied : t.copy}
    </button>
    <small aria-live="polite">
      {dropped.length > 0 ? <>{dropped.length === 1 ? t.dropped : t.droppedPlural} <b>{dropped.join(" · ")}</b>. {t.droppedTail}</>
        : state === "failed" ? t.failed : t.contains}
    </small>
  </div>;
}

/** Shown for as long as the page is carrying figures that came from a link. */
export function SharedNotice({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return <div className="callout shared-notice"><span>⇱</span>
    <p><b>{t.fromLink}.</b> {t.fromLinkText}</p>
  </div>;
}
