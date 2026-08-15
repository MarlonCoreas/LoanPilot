import { useId } from "react";
import type { Lang } from "./routes";

const TRIGGER_LABEL = { es: "Ayuda sobre este campo", en: "Help with this field" } as const;

/**
 * The "?" next to a field label, with the explanation on hover.
 *
 * Hover alone would leave out keyboard and touch users, so the bubble also
 * shows on `:focus-within` and the button is a real focusable control. The
 * click handler only cancels the default: a button inside a `<label>` would
 * otherwise forward the click to the input and lose the focus that reveals
 * the bubble on a tap.
 *
 * The bubble is absolutely positioned against `.field`, not against the
 * trigger, so it spans the field's own column and can never grow wide enough
 * to be clipped by the `overflow: hidden` on the calculator grids.
 */
export default function FieldHelp({ text, lang }: { text: string; lang: Lang }) {
  const id = useId();
  return <span className="field-help">
    <button type="button" className="field-help-toggle" aria-label={TRIGGER_LABEL[lang]}
      aria-describedby={id} onClick={(event) => event.preventDefault()}>?</button>
    <span className="field-help-bubble" role="tooltip" id={id}>{text}</span>
  </span>;
}
