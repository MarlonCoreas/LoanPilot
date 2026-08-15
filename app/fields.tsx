import type { ReactNode } from "react";
import FieldHelp from "./FieldHelp";
import type { Lang } from "./routes";

/**
 * The form primitives every calculator shares.
 *
 * Each page used to grow its own: HourField, MoneyInput, NumericField and a
 * couple of inline arrow functions, all rebuilding the same label / control /
 * note stack with small differences that showed up as misaligned rows. They
 * are one set now, so a spacing fix lands everywhere at once.
 *
 * Note the absence of a fieldset. A <legend> is laid out in the fieldset's
 * border area rather than taking a row of the grid, so any grouped control
 * built that way rose above the inputs beside it and swallowed the row gap
 * below. `FieldGroup` uses a div with role="group", which lays out like every
 * other field and keeps the grouping for assistive tech.
 */

type Common = {
  label: string;
  /** Explanation behind the "?" next to the label. */
  help?: string;
  /** Always-visible hint under the control. */
  note?: string;
  lang: Lang;
  /** Span the whole field grid rather than one column. */
  full?: boolean;
};

function LabelText({ label, help, lang }: { label: string; help?: string; lang: Lang }) {
  return <span>{label}{help && <FieldHelp text={help} lang={lang} />}</span>;
}

function className(full?: boolean) {
  return full ? "field full" : "field";
}

/** A label wrapping exactly one control. */
export function Field({ label, help, note, lang, full, children }: Common & { children: ReactNode }) {
  return <label className={className(full)}>
    <LabelText label={label} help={help} lang={lang} />
    {children}
    {note && <small className="field-note">{note}</small>}
  </label>;
}

/** Same shape, for a set of controls that no single label can own. */
export function FieldGroup({ label, help, note, lang, full, children }: Common & { children: ReactNode }) {
  return <div className={className(full)}>
    <LabelText label={label} help={help} lang={lang} />
    <div role="group" aria-label={label}>{children}</div>
    {note && <small className="field-note">{note}</small>}
  </div>;
}

type InputProps = Common & {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  min?: string;
  max?: string;
  step?: string;
};

function wrapClass(invalid?: boolean, date?: boolean) {
  return `input-wrap${date ? " date-wrap" : ""}${invalid ? " invalid" : ""}`;
}

export function MoneyField({ value, onChange, invalid, min = "0", max, step = "0.01", ...rest }: InputProps) {
  return <Field {...rest}>
    <div className={wrapClass(invalid)}>
      <b className="prefix">$</b>
      <input type="number" min={min} max={max} step={step} inputMode="decimal" value={value}
        aria-invalid={invalid || undefined} onChange={(event) => onChange(event.target.value)} />
    </div>
  </Field>;
}

export function NumberField({ value, onChange, invalid, min = "0", max, step = "1", suffix, ...rest }: InputProps & { suffix?: string }) {
  return <Field {...rest}>
    <div className={wrapClass(invalid)}>
      <input type="number" min={min} max={max} step={step} inputMode="decimal" value={value}
        aria-invalid={invalid || undefined} onChange={(event) => onChange(event.target.value)} />
      {suffix && <b className="suffix">{suffix}</b>}
    </div>
  </Field>;
}

export function DateField({ value, onChange, invalid, min, max, ...rest }: InputProps) {
  return <Field {...rest}>
    <div className={wrapClass(invalid, true)}>
      <input type="date" min={min} max={max} value={value}
        aria-invalid={invalid || undefined} onChange={(event) => onChange(event.target.value)} />
    </div>
  </Field>;
}

export function TimeField({ value, onChange, ...rest }: Omit<InputProps, "invalid" | "min" | "max" | "step">) {
  return <Field {...rest}>
    <div className={wrapClass(false, true)}>
      <input type="time" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  </Field>;
}

export function SelectField<T extends string>({ value, onChange, options, ...rest }: Common & {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
}) {
  return <Field {...rest}>
    <select value={value} onChange={(event) => onChange(event.target.value as T)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </Field>;
}

/** The pill switch. Two options get equal halves; three or more, equal thirds. */
export function SegmentedField<T extends string>({ value, onChange, options, ...rest }: Common & {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; disabled?: boolean }[];
}) {
  return <FieldGroup {...rest}>
    <div className={`segmented${options.length === 2 ? " two" : ""}`}>
      {options.map((option) => <button key={option.value} type="button" disabled={option.disabled}
        aria-pressed={value === option.value} className={value === option.value ? "active" : ""}
        onClick={() => onChange(option.value)}>{option.label}</button>)}
    </div>
  </FieldGroup>;
}

export function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="check-field">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span>{label}</span>
  </label>;
}
