import { useMemo, useState } from "react";
import {
  calculateOvertime, FACTORS, NIGHT_ENDS_AT, NIGHT_STARTS_AT, ORDINARY_LIMITS, OVERTIME_REVIEWED,
} from "./overtime";
import { reviewedLine } from "./reviewed";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";
import { OFFICIAL } from "./sources";
import type { Lang } from "./routes";
import UtilityHero from "./UtilityHero";

const copy = {
  es: {
    heroTitle: "Cada hora extra, pagada como manda la ley.",
    heroLead: "Calcula la hora extra diurna y nocturna, el recargo nocturno y lo que se agrega por trabajar en tu día de descanso o en un asueto.",
    data: "Tu jornada y tus horas",
    dataHint: "Sector privado regido por el Código de Trabajo",
    salary: "Salario mensual ordinario",
    salaryHint: "El sueldo base del mes, sin recargos ni comisiones.",
    dayHours: "Horas de tu jornada ordinaria diaria",
    dayHoursHint: `${ORDINARY_LIMITS.diurnal.day} en jornada diurna, ${ORDINARY_LIMITS.nocturnal.day} en nocturna.`,
    extras: "Horas trabajadas de más",
    extrasHint: "En el período que quieras revisar: una quincena, un mes.",
    diurnal: "Horas extra diurnas",
    nocturnal: "Horas extra nocturnas",
    nightOrdinary: "Horas ordinarias en jornada nocturna",
    nightOrdinaryHint: "Horas de tu jornada normal trabajadas después de las 7 p.m.",
    special: "Días especiales trabajados",
    specialHint: "El domingo o el día que tengas asignado como descanso, y los asuetos del art. 190.",
    restFull: "Valor total del día de descanso",
    holidayFull: "Valor total del día de asueto",
    restDays: "Días de descanso semanal trabajados",
    restHours: "Horas trabajadas en esos días",
    holidays: "Días de asueto trabajados",
    result: "Pago adicional estimado",
    total: "Total que debe agregarse",
    diurnalLine: "Horas extra diurnas",
    nocturnalLine: "Horas extra nocturnas",
    nightLine: "Recargo nocturno",
    restLine: "Recargo por día de descanso",
    holidayLine: "Recargo por día de asueto",
    hourly: "Salario básico por hora",
    daily: "Salario básico por día",
    perHourDiurnal: "Hora extra diurna",
    perHourNocturnal: "Hora extra nocturna",
    compensatory: (days: number) => `Además te corresponden ${days} ${days === 1 ? "día" : "días"} de descanso compensatorio remunerado por trabajar en tu día de descanso (art. 175).`,
    longDay: `Declaraste una jornada mayor a ${ORDINARY_LIMITS.diurnal.day} horas. El artículo 161 fija ese máximo para la jornada diurna, así que las horas por encima ya son extraordinarias.`,
    occasional: "Las horas extras sólo pueden pactarse de forma ocasional (art. 170). Un turno permanente de horas extras no es una jornada legal.",
    invalid: "Escribe tu salario mensual para ver el cálculo.",
    grossNote: "Es una estimación bruta. Las horas extras forman parte de la remuneración gravada, así que llevan descuentos de AFP, ISSS y renta como el resto del salario.",
    sources: "Fuentes y reglas aplicadas",
    code: "Código de Trabajo: arts. 142, 161, 168-170, 175-176, 190-194",
    mtpsOvertime: "MTPS: cómo se paga la hora extra, con ejemplo",
    mtpsNight: "MTPS: cuándo la jornada es nocturna",
    mtpsHours: "MTPS: cuántas horas se trabajan al día",
    mtpsHoliday: "MTPS: pago del día de asueto trabajado",
    guideEyebrow: "LOANPILOT HORAS EXTRAS 101",
    guideTitle: "Lo que decide cuánto vale tu hora",
    guideLead: "Dos recargos distintos pueden caer sobre la misma hora. Estas son las piezas que conviene revisar por separado en la planilla.",
    guide: [
      ["La hora básica", `Sale del salario del día entre las horas de tu jornada, no entre veinticuatro (art. 142).`, "$"],
      ["Diurna o nocturna", `Es nocturna la hora entre las ${NIGHT_STARTS_AT}:00 y las ${NIGHT_ENDS_AT}:00, y vale un 25% más (arts. 161 y 168).`, "◷"],
      ["Extra sobre nocturna", "El 25% de nocturnidad se aplica sobre la hora ya recargada al 100%, no sobre la básica.", "%"],
      ["Descanso y asueto", "El día de descanso trabajado suma 50% y un día compensatorio; el asueto se paga doble.", "§"],
    ],
  },
  en: {
    heroTitle: "Every extra hour, paid the way the law says.",
    heroLead: "Work out daytime and night overtime, the night surcharge and what gets added for working your rest day or a public holiday.",
    data: "Your shift and your hours",
    dataHint: "Private sector governed by the Labour Code",
    salary: "Ordinary monthly salary",
    salaryHint: "Base pay for the month, without surcharges or commissions.",
    dayHours: "Hours in your ordinary working day",
    dayHoursHint: `${ORDINARY_LIMITS.diurnal.day} on a daytime shift, ${ORDINARY_LIMITS.nocturnal.day} at night.`,
    extras: "Hours worked beyond the shift",
    extrasHint: "Over whatever period you want to check: a fortnight, a month.",
    diurnal: "Daytime overtime hours",
    nocturnal: "Night overtime hours",
    nightOrdinary: "Ordinary hours worked at night",
    nightOrdinaryHint: "Hours of your normal shift worked after 7 p.m.",
    special: "Special days worked",
    specialHint: "Sunday, or whichever day is assigned as your rest day, and the holidays in art. 190.",
    restFull: "Full value of the rest day",
    holidayFull: "Full value of the public holiday",
    restDays: "Weekly rest days worked",
    restHours: "Hours worked on those days",
    holidays: "Public holidays worked",
    result: "Estimated additional pay",
    total: "Total to be added",
    diurnalLine: "Daytime overtime",
    nocturnalLine: "Night overtime",
    nightLine: "Night surcharge",
    restLine: "Rest day surcharge",
    holidayLine: "Public holiday surcharge",
    hourly: "Basic hourly salary",
    daily: "Basic daily salary",
    perHourDiurnal: "Daytime overtime hour",
    perHourNocturnal: "Night overtime hour",
    compensatory: (days: number) => `You are also owed ${days} paid compensatory rest ${days === 1 ? "day" : "days"} for working your rest day (art. 175).`,
    longDay: `You entered a shift longer than ${ORDINARY_LIMITS.diurnal.day} hours. Article 161 sets that as the daytime maximum, so the hours above it already count as overtime.`,
    occasional: "Overtime may only be agreed occasionally (art. 170). A permanent overtime shift is not a lawful working day.",
    invalid: "Enter your monthly salary to see the calculation.",
    grossNote: "This is a gross estimate. Overtime is taxable remuneration, so it carries pension, ISSS and income tax deductions like the rest of your pay.",
    sources: "Sources and rules applied",
    code: "Labour Code: arts. 142, 161, 168-170, 175-176, 190-194",
    mtpsOvertime: "MTPS: how overtime is paid, with a worked example",
    mtpsNight: "MTPS: when a shift counts as a night shift",
    mtpsHours: "MTPS: how many hours are worked per day",
    mtpsHoliday: "MTPS: pay for a public holiday worked",
    guideEyebrow: "LOANPILOT OVERTIME 101",
    guideTitle: "What decides the value of your hour",
    guideLead: "Two different surcharges can land on the same hour. These are the pieces worth checking separately on a payslip.",
    guide: [
      ["The basic hour", "It comes from the daily salary divided by the hours of your shift, not by twenty-four (art. 142).", "$"],
      ["Daytime or night", `An hour between ${NIGHT_STARTS_AT}:00 and ${NIGHT_ENDS_AT}:00 is a night hour and is worth 25% more (arts. 161 and 168).`, "◷"],
      ["Overtime at night", "The 25% night surcharge applies to the hour already doubled, not to the basic hour.", "%"],
      ["Rest days and holidays", "A rest day worked adds 50% and a compensatory day; a public holiday is paid double.", "§"],
    ],
  },
} as const;

const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function HourField({ label, value, onChange, note, step = "0.5", max = "744" }: {
  label: string; value: string; onChange: (value: string) => void; note?: string; step?: string; max?: string;
}) {
  return <label className="field">
    <span>{label}</span>
    <div className="input-wrap">
      <input type="number" min="0" max={max} step={step} inputMode="decimal" value={value}
        onChange={(event) => onChange(event.target.value)} />
    </div>
    {note && <small className="field-note">{note}</small>}
  </label>;
}

export default function OvertimePage({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const money = useMemo(
    () => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }),
    [lang],
  );

  const [monthlySalary, setMonthlySalary] = useState("500");
  const [dayHours, setDayHours] = useState(String(ORDINARY_LIMITS.diurnal.day));
  const [diurnal, setDiurnal] = useState("8");
  const [nocturnal, setNocturnal] = useState("0");
  const [nightOrdinary, setNightOrdinary] = useState("0");
  const [restDays, setRestDays] = useState("0");
  const [restHours, setRestHours] = useState("0");
  const [holidays, setHolidays] = useState("0");

  const result = useMemo(() => calculateOvertime({
    monthlySalary: number(monthlySalary),
    ordinaryDayHours: number(dayHours),
    overtimeDiurnalHours: number(diurnal),
    overtimeNocturnalHours: number(nocturnal),
    nightOrdinaryHours: number(nightOrdinary),
    restDaysWorked: number(restDays),
    restDayHours: number(restHours),
    holidaysWorked: number(holidays),
  }), [dayHours, diurnal, holidays, monthlySalary, nightOrdinary, nocturnal, restDays, restHours]);

  const lines = [
    { label: t.diurnalLine, value: result.overtimeDiurnal, primary: true },
    { label: t.nocturnalLine, value: result.overtimeNocturnal },
    { label: t.nightLine, value: result.nightSurcharge },
    { label: t.restLine, value: result.restDaySurcharge },
    { label: t.holidayLine, value: result.holidaySurcharge },
  ];

  return <main className="legal-page">
    <SiteHeader lang={lang} page="overtime" />
    <UtilityHero title={t.heroTitle} lead={t.heroLead} trust={reviewedLine(lang, OVERTIME_REVIEWED)} />
    <section className="statutory-tools standalone-tools" id="tools">
      <div className="legal-calculator-grid">
        <div className="form-panel legal-form">
          <div className="section-title"><span>01</span><div><h2>{t.data}</h2><p>{t.dataHint}</p></div></div>
          <div className="field-grid">
            <label className="field">
              <span>{t.salary}</span>
              <div className="input-wrap"><b className="prefix">$</b>
                <input type="number" min="0" step="0.01" inputMode="decimal" value={monthlySalary}
                  onChange={(event) => setMonthlySalary(event.target.value)} />
              </div>
              <small className="field-note">{t.salaryHint}</small>
            </label>
            <HourField label={t.dayHours} value={dayHours} onChange={setDayHours} note={t.dayHoursHint} step="1" max="12" />
          </div>
          <div className="section-title second"><span>02</span><div><h2>{t.extras}</h2><p>{t.extrasHint}</p></div></div>
          <div className="field-grid">
            <HourField label={t.diurnal} value={diurnal} onChange={setDiurnal} />
            <HourField label={t.nocturnal} value={nocturnal} onChange={setNocturnal} />
            <HourField label={t.nightOrdinary} value={nightOrdinary} onChange={setNightOrdinary} note={t.nightOrdinaryHint} />
          </div>
          <div className="section-title second"><span>03</span><div><h2>{t.special}</h2><p>{t.specialHint}</p></div></div>
          <div className="field-grid">
            <HourField label={t.restDays} value={restDays} onChange={setRestDays} step="1" max="31" />
            <HourField label={t.restHours} value={restHours} onChange={setRestHours} />
            <HourField label={t.holidays} value={holidays} onChange={setHolidays} step="1" max="31" />
          </div>
        </div>
        <div className="results-panel legal-results">
          <div className="results-kicker">{t.result}</div>
          {result.invalid ? <div className="warning">! {t.invalid}</div> : <>
            <div className="legal-total">
              <span>{t.total}</span><strong>{money.format(result.total)}</strong>
              <small>{t.hourly}: {money.format(result.hourly)}</small>
            </div>
            <div className="legal-breakdown">{lines.map((line) => <div key={line.label} className={line.primary ? "primary" : ""}>
              <span>{line.label}</span><b>{money.format(line.value)}</b>
            </div>)}</div>
            <div className="legal-facts">
              <div><span>{t.perHourDiurnal}</span><b>{money.format(result.hourly * FACTORS.overtimeDiurnal)}</b></div>
              <div><span>{t.perHourNocturnal}</span><b>{money.format(result.hourly * FACTORS.overtimeNocturnal)}</b></div>
            </div>
            {/* El salario básico de estos días ya viene dentro del sueldo del
                mes, así que no entra en el total; se muestra aparte para quien
                cobra por día y necesita el valor completo de la jornada. */}
            {(result.compensatoryDays > 0 || result.holidaysWorked > 0) && <div className="legal-facts">
              {result.compensatoryDays > 0 && <div><span>{t.restFull}</span><b>{money.format(result.restDayFullValue)}</b></div>}
              {result.holidaysWorked > 0 && <div><span>{t.holidayFull}</span><b>{money.format(result.holidayFullValue)}</b></div>}
            </div>}
            {result.exceedsOrdinaryDay && <div className="legal-callout warn"><span>!</span><p>{t.longDay}</p></div>}
            {result.compensatoryDays > 0 && <div className="legal-callout"><span>§</span><p>{t.compensatory(result.compensatoryDays)}</p></div>}
            <div className="legal-callout"><span>i</span><p>{t.occasional}</p></div>
          </>}
          <p className="legal-disclaimer">{t.grossNote}</p>
        </div>
      </div>
      <div className="source-panel"><h2>{t.sources}</h2><div className="source-links">
        <a href={OFFICIAL.laborCode} target="_blank" rel="noreferrer"><b>01</b>{t.code}<span>↗</span></a>
        <a href={OFFICIAL.overtimePay} target="_blank" rel="noreferrer"><b>02</b>{t.mtpsOvertime}<span>↗</span></a>
        <a href={OFFICIAL.nightShift} target="_blank" rel="noreferrer"><b>03</b>{t.mtpsNight}<span>↗</span></a>
        <a href={OFFICIAL.workingHours} target="_blank" rel="noreferrer"><b>04</b>{t.mtpsHours}<span>↗</span></a>
        <a href={OFFICIAL.holidayPay} target="_blank" rel="noreferrer"><b>05</b>{t.mtpsHoliday}<span>↗</span></a>
      </div></div>
    </section>
    <section className="guide legal-guide">
      <div className="guide-head"><p>{t.guideEyebrow}</p><h2>{t.guideTitle}</h2><span>{t.guideLead}</span></div>
      <div className="guide-grid">{t.guide.map(([title, text, icon], index) => <article key={title}>
        <span>0{index + 1}</span><i>{icon}</i><h3>{title}</h3><p>{text}</p>
      </article>)}</div>
    </section>
    <SiteFooter lang={lang} />
  </main>;
}
