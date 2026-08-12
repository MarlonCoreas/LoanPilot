import { useMemo, useState } from "react";
import {
  calculateOvertime,
  NIGHT_ENDS_AT,
  NIGHT_STARTS_AT,
  OVERTIME_REVIEWED,
  SHIFT_LIMITS,
  type OvertimeValidationIssue,
  type ShiftKind,
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
    heroLead: "Calcula horas extra diurnas y nocturnas, recargo nocturno y trabajo en descansos o asuetos sin mezclar sus tarifas.",
    data: "Tu jornada y tu salario",
    dataHint: "Sector privado regido por el Código de Trabajo",
    salary: "Salario mensual ordinario",
    salaryHint: "Sueldo base del mes, sin recargos ni comisiones.",
    shift: "Tipo de jornada ordinaria",
    shifts: {
      diurnal: "Diurna — hasta 4 horas nocturnas",
      nocturnal: "Nocturna — más de 4 horas nocturnas",
      dangerousDiurnal: "Peligrosa o insalubre — diurna, sin autorización",
      dangerousNocturnal: "Peligrosa o insalubre — nocturna, sin autorización",
      minorUnder16: "Menor de 16 años — sólo diurna",
      minor16to17: "De 16 a 17 años — sólo diurna",
    },
    dayHours: "Horas pactadas de tu jornada diaria",
    dayHoursHint: (day: number, week: number) => `Máximo para esta jornada: ${day} al día y ${week} a la semana.`,
    extras: "Horas en días normales",
    extrasHint: "No repitas aquí las horas trabajadas en descansos o asuetos.",
    diurnal: "Horas extra diurnas",
    nocturnal: "Horas extra nocturnas",
    nightOrdinary: "Horas ordinarias ejecutadas de noche",
    nightOrdinaryHint: `Sólo las trabajadas entre las ${NIGHT_STARTS_AT}:00 y las ${NIGHT_ENDS_AT}:00; no incluyas horas extra.`,
    minorDaily: "Máximo de horas extra en un solo día",
    minorDailyHint: "Para menores de 16 años el máximo legal es 2 horas extra por día (art. 116).",
    specialToggle: "Trabajé en día de descanso semanal o en día de asueto",
    special: "Descansos y asuetos trabajados",
    specialHint: "Separa las horas ordinarias de las horas extra para aplicar la base especial de los arts. 175 y 192.",
    totalHint: "Escribe el total del período, sumando todos esos días.",
    restDays: "Días de descanso semanal trabajados",
    restOrdinary: "Horas ordinarias en esos descansos, en total",
    restExtraDay: "Horas extra diurnas en descansos, en total",
    restExtraNight: "Horas extra nocturnas en descansos, en total",
    holidays: "Días de asueto trabajados",
    holidayExtraDay: "Horas extra diurnas en asuetos, en total",
    holidayExtraNight: "Horas extra nocturnas en asuetos, en total",
    restEcho: (days: number, hours: number, average: number) =>
      `Entendimos ${hours} h repartidas en ${days} ${days === 1 ? "descanso" : "descansos"}: ${average} h en promedio por día. Si trabajaste esas horas en cada uno, suma el total.`,
    holidayEcho: (days: number, hours: number, average: number) =>
      `Entendimos ${hours} h extra repartidas en ${days} ${days === 1 ? "asueto" : "asuetos"}: ${average} h en promedio por día. Si trabajaste esas horas en cada uno, suma el total.`,
    holidayOrdinaryNote: "El asueto trabajado se paga doble por el día completo (art. 192), así que aquí sólo se piden las horas extra. El descanso, en cambio, se recarga por hora (art. 175).",
    coincident: "Asuetos que también eran tu descanso",
    coincidentHint: "Ya deben estar incluidos en los días de asueto; esto agrega únicamente el descanso compensatorio del art. 194.",
    restFull: "Valor completo de descansos trabajados",
    holidayFull: "Valor completo de asuetos trabajados",
    result: "Pago adicional estimado",
    total: "Total que debe agregarse",
    diurnalLine: "Extra diurna en días normales",
    nocturnalLine: "Extra nocturna en días normales",
    nightLine: "Recargo nocturno ordinario",
    restLine: "Recargo ordinario en descansos",
    restExtraDayLine: "Horas extra diurnas en descansos",
    restExtraNightLine: "Horas extra nocturnas en descansos",
    holidayLine: "Recargo por asuetos",
    holidayExtraDayLine: "Horas extra diurnas en asuetos",
    holidayExtraNightLine: "Horas extra nocturnas en asuetos",
    dayUnit: "día",
    dayUnitPlural: "días",
    noHoursYet: "Registra tus horas arriba y aquí aparecerá el desglose, con la operación de cada línea.",
    restFullNote: "Incluye el salario básico del día, que tu sueldo mensual ya paga. Al total sólo se suma el recargo.",
    holidayFullNote: "Incluye el salario ordinario del día, que tu sueldo mensual ya paga. Al total sólo se suma el recargo.",
    hourly: "Salario básico por hora",
    daily: "Salario básico por día",
    perHourDiurnal: "Hora extra diurna normal",
    perHourNocturnal: "Hora extra nocturna normal",
    compensatory: (days: number) => `Además te corresponden ${days} ${days === 1 ? "día" : "días"} de descanso compensatorio remunerado (arts. 175 y 194).`,
    occasional: "Como regla general, las horas extra sólo se pactan ocasionalmente. El art. 170 permite dos horarios permanentes excepcionales con aprobación de la Dirección General de Trabajo.",
    forceMajeure: "El cálculo no cubre trabajo extraordinario por fuerza mayor, que el art. 169 remunera solamente con salario básico.",
    invalidTitle: "Revisa estos datos antes de calcular:",
    validation: (issue: OvertimeValidationIssue, limit: number) => ({
      salary: "Escribe un salario mensual mayor que cero.",
      ordinaryHours: "Escribe las horas pactadas de tu jornada diaria.",
      ordinaryLimit: `La jornada seleccionada no puede exceder ${limit} horas ordinarias al día. Pasa el exceso a horas extra.`,
      restDaysWhole: "Los días de descanso deben ser números enteros.",
      restDaysRange: "Los días de descanso no pueden superar 31 en un período mensual.",
      restDaysMissing: "Indica cuántos días de descanso corresponden a esas horas.",
      restHoursMissing: "Indica las horas trabajadas en los días de descanso.",
      restOrdinaryExcess: "Las horas ordinarias de descanso superan la capacidad de los días indicados; registra el exceso como horas extra del descanso.",
      restHoursCapacity: "Las horas de descanso superan las 24 horas por cada día indicado. Revisa si escribiste las horas de un solo día en vez del total.",
      holidaysWhole: "Los días de asueto deben ser números enteros.",
      holidaysRange: "Los días de asueto no pueden superar 31 en un período mensual.",
      holidayDaysMissing: "Indica cuántos asuetos corresponden a esas horas extra.",
      holidayHoursCapacity: "Esas horas extra no caben en los asuetos indicados: después de la jornada ordinaria sólo queda el resto del día. Revisa si escribiste las horas de un solo asueto en vez del total.",
      coincidentDaysWhole: "Los asuetos que coincidieron con descanso deben ser enteros.",
      coincidentDaysExcess: "Los asuetos coincidentes no pueden superar los asuetos trabajados.",
      hoursRange: "Ningún grupo de horas puede superar las 744 horas de un mes de 31 días.",
      totalHoursRange: "La suma de todas las horas supera las 744 horas de un mes de 31 días.",
      minorNightWork: "Las personas menores no pueden trabajar jornada ni horas extra nocturnas.",
      minorDailyOvertimeMissing: "Indica el máximo de horas extra trabajadas en un solo día.",
      minorDailyOvertimeLimit: "Una persona menor de 16 años no puede trabajar más de 2 horas extra en un día.",
    })[issue],
    grossNote: "Estimación bruta para salario mensual. AFP, ISSS e ISR pueden reducir el pago neto.",
    emptyTitle: "Escribe tu salario para empezar",
    emptyLead: "Con el salario mensual y las horas de tu jornada ya podemos mostrarte cuánto vale tu hora extra, antes de que registres una sola hora.",
    nightIncluded: "Elegiste jornada nocturna. El 25% del art. 168 se calcula sobre el salario ordinario diurno, y en una jornada nocturna permanente ese recargo suele venir ya dentro del sueldo pactado. Si es tu caso, deja en cero las horas ordinarias de noche para no contarlo dos veces.",
    sources: "Fuentes y reglas aplicadas",
    code: "Código de Trabajo: arts. 116, 142, 161-170, 175-176 y 190-194",
    mtpsOvertime: "MTPS: pago de horas extra, con ejemplo",
    mtpsNight: "MTPS: jornada y recargo nocturno",
    mtpsHours: "MTPS: límites diarios y semanales",
    mtpsHoliday: "MTPS: pago del asueto trabajado",
    mtpsSchedules: "MTPS: horarios especiales autorizables",
    guideEyebrow: "LOANPILOT HORAS EXTRAS 101",
    guideTitle: "Lo que decide cuánto vale tu hora",
    guideLead: "El tipo de jornada y el día en que trabajaste cambian la base del recargo. Por eso se registran por separado.",
    guide: [
      ["La hora básica", "Sale del salario del día entre las horas pactadas de tu jornada ordinaria (art. 142).", "$"],
      ["Diurna o nocturna", `Es nocturna la hora entre las ${NIGHT_STARTS_AT}:00 y las ${NIGHT_ENDS_AT}:00. Más de cuatro horas nocturnas hacen nocturna la jornada para su duración.`, "◷"],
      ["Extra nocturna", "El MTPS aplica el 25% nocturno sobre la hora ya duplicada: equivale a 2.5 veces la hora básica.", "%"],
      ["Días especiales", "En descanso, la extra diurna vale 3 veces la hora; en asueto vale 4. La nocturnidad se aplica sobre esas bases.", "§"],
    ],
  },
  en: {
    heroTitle: "Every extra hour, paid the way the law says.",
    heroLead: "Work out daytime and night overtime, night premiums, rest days and public holidays without mixing their rates.",
    data: "Your shift and salary",
    dataHint: "Private sector governed by the Labour Code",
    salary: "Ordinary monthly salary",
    salaryHint: "Monthly base pay, excluding premiums and commissions.",
    shift: "Ordinary shift type",
    shifts: {
      diurnal: "Daytime — up to 4 night hours",
      nocturnal: "Night — more than 4 night hours",
      dangerousDiurnal: "Dangerous or unhealthy — daytime, no authorization",
      dangerousNocturnal: "Dangerous or unhealthy — night, no authorization",
      minorUnder16: "Under 16 — daytime only",
      minor16to17: "Age 16 to 17 — daytime only",
    },
    dayHours: "Contracted hours in your ordinary day",
    dayHoursHint: (day: number, week: number) => `Maximum for this shift: ${day} per day and ${week} per week.`,
    extras: "Hours on ordinary days",
    extrasHint: "Do not repeat hours worked on rest days or public holidays here.",
    diurnal: "Daytime overtime hours",
    nocturnal: "Night overtime hours",
    nightOrdinary: "Ordinary hours performed at night",
    nightOrdinaryHint: `Only hours between ${NIGHT_STARTS_AT}:00 and ${NIGHT_ENDS_AT}:00; do not include overtime.`,
    minorDaily: "Most overtime worked in one day",
    minorDailyHint: "Workers under 16 may work no more than 2 overtime hours in one day (art. 116).",
    specialToggle: "I worked on a weekly rest day or a public holiday",
    special: "Rest days and public holidays worked",
    specialHint: "Separate ordinary time from overtime so the special bases in arts. 175 and 192 can be applied.",
    totalHint: "Enter the total for the period, adding up all of those days.",
    restDays: "Weekly rest days worked",
    restOrdinary: "Ordinary hours on those rest days, in total",
    restExtraDay: "Daytime overtime on rest days, in total",
    restExtraNight: "Night overtime on rest days, in total",
    holidays: "Public holidays worked",
    holidayExtraDay: "Daytime overtime on holidays, in total",
    holidayExtraNight: "Night overtime on holidays, in total",
    restEcho: (days: number, hours: number, average: number) =>
      `We read this as ${hours} h spread over ${days} rest ${days === 1 ? "day" : "days"}: ${average} h a day on average. If you worked those hours on each of them, enter the total.`,
    holidayEcho: (days: number, hours: number, average: number) =>
      `We read this as ${hours} overtime h spread over ${days} public ${days === 1 ? "holiday" : "holidays"}: ${average} h a day on average. If you worked those hours on each of them, enter the total.`,
    holidayOrdinaryNote: "A public holiday worked is paid double for the whole day (art. 192), so only overtime is asked for here. A rest day, by contrast, carries its premium per hour (art. 175).",
    coincident: "Holidays that were also your rest day",
    coincidentHint: "These must already be included in public holidays; this only adds the compensatory rest in art. 194.",
    restFull: "Full value of rest days worked",
    holidayFull: "Full value of public holidays worked",
    result: "Estimated additional pay",
    total: "Total to be added",
    diurnalLine: "Daytime overtime on ordinary days",
    nocturnalLine: "Night overtime on ordinary days",
    nightLine: "Ordinary night premium",
    restLine: "Ordinary rest-day premium",
    restExtraDayLine: "Daytime rest-day overtime",
    restExtraNightLine: "Night rest-day overtime",
    holidayLine: "Public-holiday premium",
    holidayExtraDayLine: "Daytime public-holiday overtime",
    holidayExtraNightLine: "Night public-holiday overtime",
    dayUnit: "day",
    dayUnitPlural: "days",
    noHoursYet: "Record your hours above and the breakdown will appear here, with the arithmetic behind each line.",
    restFullNote: "Includes the day's basic salary, which your monthly pay already covers. Only the premium is added to the total.",
    holidayFullNote: "Includes the day's ordinary salary, which your monthly pay already covers. Only the premium is added to the total.",
    hourly: "Basic hourly salary",
    daily: "Basic daily salary",
    perHourDiurnal: "Ordinary daytime overtime hour",
    perHourNocturnal: "Ordinary night overtime hour",
    compensatory: (days: number) => `You are also owed ${days} paid compensatory rest ${days === 1 ? "day" : "days"} (arts. 175 and 194).`,
    occasional: "As a rule, overtime may only be agreed occasionally. Article 170 allows two exceptional permanent schedules with Labour Directorate approval.",
    forceMajeure: "This calculation excludes overtime caused by force majeure, which article 169 pays at the basic rate only.",
    invalidTitle: "Review these details before calculating:",
    validation: (issue: OvertimeValidationIssue, limit: number) => ({
      salary: "Enter a monthly salary greater than zero.",
      ordinaryHours: "Enter the contracted hours in your ordinary working day.",
      ordinaryLimit: `The selected shift cannot exceed ${limit} ordinary hours per day. Move the excess to overtime.`,
      restDaysWhole: "Rest days must be whole numbers.",
      restDaysRange: "Rest days cannot exceed 31 in one monthly period.",
      restDaysMissing: "Enter how many rest days correspond to those hours.",
      restHoursMissing: "Enter the hours worked on the rest days.",
      restOrdinaryExcess: "Ordinary rest-day hours exceed the capacity of the days entered; record the excess as rest-day overtime.",
      restHoursCapacity: "Rest-day hours exceed 24 hours for each day entered. Check whether you entered one day's hours instead of the total.",
      holidaysWhole: "Public holidays must be whole numbers.",
      holidaysRange: "Public holidays cannot exceed 31 in one monthly period.",
      holidayDaysMissing: "Enter how many public holidays correspond to that overtime.",
      holidayHoursCapacity: "That overtime does not fit in the holidays entered: only the rest of the day is left once the ordinary shift is done. Check whether you entered one holiday's hours instead of the total.",
      coincidentDaysWhole: "Holidays coinciding with rest days must be whole numbers.",
      coincidentDaysExcess: "Coinciding holidays cannot exceed public holidays worked.",
      hoursRange: "No group of hours can exceed the 744 hours in a 31-day month.",
      totalHoursRange: "All hours added together exceed the 744 hours in a 31-day month.",
      minorNightWork: "Minors may not work night shifts or night overtime.",
      minorDailyOvertimeMissing: "Enter the most overtime worked in any one day.",
      minorDailyOvertimeLimit: "A worker under 16 may not work more than 2 overtime hours in one day.",
    })[issue],
    grossNote: "Gross estimate for a monthly salary. Pension, ISSS and income tax may reduce net pay.",
    emptyTitle: "Enter your salary to begin",
    emptyLead: "With your monthly salary and the hours in your working day we can already show what your overtime hour is worth, before you record a single hour.",
    nightIncluded: "You selected a night shift. The 25% in art. 168 is calculated on the ordinary daytime salary, and on a permanent night shift that premium is usually already inside the agreed salary. If that is your case, leave ordinary night hours at zero so it is not counted twice.",
    sources: "Sources and rules applied",
    code: "Labour Code: arts. 116, 142, 161-170, 175-176 and 190-194",
    mtpsOvertime: "MTPS: overtime pay, with a worked example",
    mtpsNight: "MTPS: night shifts and night premium",
    mtpsHours: "MTPS: daily and weekly limits",
    mtpsHoliday: "MTPS: pay for a public holiday worked",
    mtpsSchedules: "MTPS: special schedules requiring approval",
    guideEyebrow: "LOANPILOT OVERTIME 101",
    guideTitle: "What determines the value of your hour",
    guideLead: "The shift type and the day worked change the premium base, so each category is entered separately.",
    guide: [
      ["The basic hour", "Daily salary divided by the contracted hours in the ordinary working day (art. 142).", "$"],
      ["Daytime or night", `A night hour falls between ${NIGHT_STARTS_AT}:00 and ${NIGHT_ENDS_AT}:00. More than four night hours makes the shift a night shift for duration.`, "◷"],
      ["Night overtime", "The MTPS applies the 25% night premium to the already doubled hour: 2.5 times the basic hour.", "%"],
      ["Special days", "Daytime overtime is 3 times the basic hour on a rest day and 4 times on a holiday; the night premium applies to those bases.", "§"],
    ],
  },
} as const;

const number = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

type FieldKey =
  | "salary" | "dayHours" | "nocturnal" | "nightOrdinary" | "minorDaily"
  | "restDays" | "restOrdinary" | "restExtraDay" | "restExtraNight"
  | "holidays" | "holidayExtraDay" | "holidayExtraNight" | "coincident";

/**
 * Qué casilla señala cada problema.
 *
 * En móvil el formulario se apila encima de los resultados, así que la lista de
 * errores del panel puede quedar fuera de pantalla mientras el usuario escribe:
 * sin esto, el aviso existe pero nadie lo ve. Los dos topes de horas del
 * período no apuntan a ninguna casilla en particular y se quedan sin marca.
 */
const ISSUE_FIELDS: Record<OvertimeValidationIssue, FieldKey[]> = {
  salary: ["salary"],
  ordinaryHours: ["dayHours"],
  ordinaryLimit: ["dayHours"],
  restDaysWhole: ["restDays"],
  restDaysRange: ["restDays"],
  restDaysMissing: ["restDays"],
  restHoursMissing: ["restOrdinary"],
  restOrdinaryExcess: ["restOrdinary"],
  restHoursCapacity: ["restOrdinary", "restExtraDay", "restExtraNight"],
  holidaysWhole: ["holidays"],
  holidaysRange: ["holidays"],
  holidayDaysMissing: ["holidays"],
  holidayHoursCapacity: ["holidayExtraDay", "holidayExtraNight"],
  coincidentDaysWhole: ["coincident"],
  coincidentDaysExcess: ["coincident"],
  hoursRange: [],
  totalHoursRange: [],
  minorNightWork: ["nocturnal", "nightOrdinary", "restExtraNight", "holidayExtraNight"],
  minorDailyOvertimeMissing: ["minorDaily"],
  minorDailyOvertimeLimit: ["minorDaily"],
};

function HourField({ label, value, onChange, note, step = "0.5", max = "744", invalid = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  note?: string;
  step?: string;
  max?: string;
  invalid?: boolean;
}) {
  return <label className="field">
    <span>{label}</span>
    <div className={`input-wrap${invalid ? " invalid" : ""}`}>
      <input type="number" min="0" max={max} step={step} inputMode="decimal" value={value}
        aria-invalid={invalid || undefined}
        onChange={(event) => onChange(event.target.value)} />
    </div>
    {note && <small className="field-note">{note}</small>}
  </label>;
}

export default function OvertimePage({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const money = useMemo(
    () => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }),
    [lang],
  );
  const rateMoney = useMemo(
    () => new Intl.NumberFormat(lang === "es" ? "es-SV" : "en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }),
    [lang],
  );

  // Como en el finiquito, la página abre con un salario de muestra: así el
  // primer render enseña cuánto vale una hora extra en vez de recibir a quien
  // llega con una lista de errores por campos que todavía no ha visto.
  const [monthlySalary, setMonthlySalary] = useState("900");
  const [shiftKind, setShiftKind] = useState<ShiftKind>("diurnal");
  const [dayHours, setDayHours] = useState(String(SHIFT_LIMITS.diurnal.day));
  const [diurnal, setDiurnal] = useState("0");
  const [nocturnal, setNocturnal] = useState("0");
  const [nightOrdinary, setNightOrdinary] = useState("0");
  const [minorDailyOvertime, setMinorDailyOvertime] = useState("0");
  // Ocho de las trece casillas sólo importan a quien trabajó un domingo o un
  // asueto. Plegadas, la mayoría llena cinco campos y termina.
  const [showSpecialDays, setShowSpecialDays] = useState(false);
  const [restDays, setRestDays] = useState("0");
  const [restOrdinary, setRestOrdinary] = useState("0");
  const [restExtraDay, setRestExtraDay] = useState("0");
  const [restExtraNight, setRestExtraNight] = useState("0");
  const [holidays, setHolidays] = useState("0");
  const [holidayExtraDay, setHolidayExtraDay] = useState("0");
  const [holidayExtraNight, setHolidayExtraNight] = useState("0");
  const [coincident, setCoincident] = useState("0");

  const selectShift = (next: ShiftKind) => {
    const previousLimit = SHIFT_LIMITS[shiftKind].day;
    setShiftKind(next);
    if (number(dayHours) === previousLimit || dayHours === "") {
      setDayHours(String(SHIFT_LIMITS[next].day));
    }
  };

  // Con la sección plegada sus valores no cuentan: un total que se mueve por
  // casillas que no están en pantalla es imposible de auditar para el usuario.
  const special = (value: string) => (showSpecialDays ? number(value) : 0);

  const result = useMemo(() => calculateOvertime({
    monthlySalary: number(monthlySalary),
    shiftKind,
    ordinaryDayHours: number(dayHours),
    overtimeDiurnalHours: number(diurnal),
    overtimeNocturnalHours: number(nocturnal),
    nightOrdinaryHours: number(nightOrdinary),
    restDaysWorked: special(restDays),
    restDayOrdinaryHours: special(restOrdinary),
    restDayOvertimeDiurnalHours: special(restExtraDay),
    restDayOvertimeNocturnalHours: special(restExtraNight),
    holidaysWorked: special(holidays),
    holidayOvertimeDiurnalHours: special(holidayExtraDay),
    holidayOvertimeNocturnalHours: special(holidayExtraNight),
    coincidentRestHolidayDays: special(coincident),
    minorMaximumDailyOvertimeHours: number(minorDailyOvertime),
  }), [
    coincident, dayHours, diurnal, holidayExtraDay, holidayExtraNight, holidays,
    minorDailyOvertime, monthlySalary, nightOrdinary, nocturnal, restDays, restExtraDay, restExtraNight,
    restOrdinary, shiftKind, showSpecialDays,
  ]);

  // Cada línea lleva la operación que la produjo. Sin ella, el desglose pide
  // un acto de fe: "Recargo ordinario en descansos — $10.00" no le enseña a
  // nadie de dónde salieron los $10, que es justo lo que hay que llevar a
  // recursos humanos cuando la planilla dice otra cosa.
  const hours = (amount: number) => `${amount} h`;
  const days = (amount: number) => `${amount} ${amount === 1 ? t.dayUnit : t.dayUnitPlural}`;
  // La tarifa va sin redondear a dos decimales: con salario de $500 la hora
  // extra vale $4.1667, y "3 h × $4.17" daría $12.51 junto a una línea de
  // $12.50. Los decimales extra sólo aparecen cuando hacen falta.
  const times = (quantity: string, rate: number) => `${quantity} × ${rateMoney.format(rate)}`;

  // Marcar en rojo mientras el usuario aún no termina de escribir lo básico
  // sería regañarlo por un campo que el panel ya está pidiendo con calma.
  const flagged = new Set<FieldKey>(
    result.incomplete ? [] : result.issues.flatMap((issue) => ISSUE_FIELDS[issue]),
  );
  const bad = (field: FieldKey) => flagged.has(field);

  const rates = result.exactRates;
  const lines = [
    { label: t.diurnalLine, value: result.overtimeDiurnal, primary: true,
      formula: times(hours(result.overtimeDiurnalHours), rates.overtimeDiurnal) },
    { label: t.nocturnalLine, value: result.overtimeNocturnal,
      formula: times(hours(result.overtimeNocturnalHours), rates.overtimeNocturnal) },
    { label: t.nightLine, value: result.nightSurcharge,
      formula: times(hours(result.nightOrdinaryHours), rates.nightSurcharge) },
    { label: t.restLine, value: result.restDaySurcharge,
      formula: times(hours(result.restDayOrdinaryHours), rates.restDaySurcharge) },
    { label: t.restExtraDayLine, value: result.restDayOvertimeDiurnal,
      formula: times(hours(result.restDayOvertimeDiurnalHours), rates.restDayOvertimeDiurnal) },
    { label: t.restExtraNightLine, value: result.restDayOvertimeNocturnal,
      formula: times(hours(result.restDayOvertimeNocturnalHours), rates.restDayOvertimeNocturnal) },
    { label: t.holidayLine, value: result.holidaySurcharge,
      formula: times(days(result.holidaysWorked), rates.holidaySurcharge) },
    { label: t.holidayExtraDayLine, value: result.holidayOvertimeDiurnal,
      formula: times(hours(result.holidayOvertimeDiurnalHours), rates.holidayOvertimeDiurnal) },
    { label: t.holidayExtraNightLine, value: result.holidayOvertimeNocturnal,
      formula: times(hours(result.holidayOvertimeNocturnalHours), rates.holidayOvertimeNocturnal) },
  ];
  // Siete filas en $0.00 no son un desglose, son ruido delante del único
  // número que el usuario vino a leer.
  const activeLines = lines.filter((line) => line.value > 0);

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
              <div className={`input-wrap${bad("salary") ? " invalid" : ""}`}><b className="prefix">$</b>
                <input type="number" min="0" step="0.01" inputMode="decimal" value={monthlySalary}
                  aria-invalid={bad("salary") || undefined}
                  onChange={(event) => setMonthlySalary(event.target.value)} />
              </div>
              <small className="field-note">{t.salaryHint}</small>
            </label>
            <label className="field">
              <span>{t.shift}</span>
              <select value={shiftKind} onChange={(event) => selectShift(event.target.value as ShiftKind)}>
                {(Object.keys(SHIFT_LIMITS) as ShiftKind[]).map((kind) =>
                  <option key={kind} value={kind}>{t.shifts[kind]}</option>)}
              </select>
            </label>
            <HourField label={t.dayHours} value={dayHours} onChange={setDayHours} invalid={bad("dayHours")}
              note={t.dayHoursHint(result.shiftLimit.day, result.shiftLimit.week)}
              step="0.5" max={String(result.shiftLimit.day)} />
          </div>

          <div className="section-title second"><span>02</span><div><h2>{t.extras}</h2><p>{t.extrasHint}</p></div></div>
          <div className="field-grid">
            <HourField label={t.diurnal} value={diurnal} onChange={setDiurnal} />
            <HourField label={t.nocturnal} value={nocturnal} onChange={setNocturnal} invalid={bad("nocturnal")} />
            <HourField label={t.nightOrdinary} value={nightOrdinary} onChange={setNightOrdinary} invalid={bad("nightOrdinary")}
              note={t.nightOrdinaryHint} />
            {shiftKind === "minorUnder16" && <HourField label={t.minorDaily} value={minorDailyOvertime}
              onChange={setMinorDailyOvertime} invalid={bad("minorDaily")} note={t.minorDailyHint} max="2" />}
          </div>

          <div className="section-title second"><span>03</span><div><h2>{t.special}</h2><p>{t.specialHint}</p></div></div>
          <label className="check-field">
            <input type="checkbox" checked={showSpecialDays}
              onChange={(event) => setShowSpecialDays(event.target.checked)} />
            <span>{t.specialToggle}</span>
          </label>
          {showSpecialDays && <>
            <div className="field-grid special-grid">
              <HourField label={t.restDays} value={restDays} onChange={setRestDays} invalid={bad("restDays")} step="1" max="31" />
              <HourField label={t.restOrdinary} value={restOrdinary} onChange={setRestOrdinary} invalid={bad("restOrdinary")} note={t.totalHint} />
              <HourField label={t.restExtraDay} value={restExtraDay} onChange={setRestExtraDay} invalid={bad("restExtraDay")} note={t.totalHint} />
              <HourField label={t.restExtraNight} value={restExtraNight} onChange={setRestExtraNight} invalid={bad("restExtraNight")} note={t.totalHint} />
              <HourField label={t.holidays} value={holidays} onChange={setHolidays} invalid={bad("holidays")} step="1" max="31" />
              <HourField label={t.coincident} value={coincident} onChange={setCoincident} invalid={bad("coincident")}
                note={t.coincidentHint} step="1" max="31" />
              <HourField label={t.holidayExtraDay} value={holidayExtraDay} onChange={setHolidayExtraDay} invalid={bad("holidayExtraDay")} note={t.totalHint} />
              <HourField label={t.holidayExtraNight} value={holidayExtraNight} onChange={setHolidayExtraNight} invalid={bad("holidayExtraNight")} note={t.totalHint} />
            </div>
            <p className="field-note payroll-note">{t.holidayOrdinaryNote}</p>
            {result.restDaysWorked > 0 && result.restHoursWorked > 0 && <p className="field-note entry-echo">
              {t.restEcho(result.restDaysWorked, result.restHoursWorked, result.restDayAverageHours)}
            </p>}
            {result.holidaysWorked > 0 && result.holidayOvertimeHours > 0 && <p className="field-note entry-echo">
              {t.holidayEcho(result.holidaysWorked, result.holidayOvertimeHours, result.holidayAverageOvertimeHours)}
            </p>}
          </>}
        </div>

        {/* La región viva es sólo el total. Envolviendo el panel entero, cada
            tecla hacía que un lector de pantalla releyera desglose, tarjetas,
            avisos y descargo completos. */}
        <div className="results-panel legal-results">
          <div className="results-kicker">{t.result}</div>
          {result.incomplete ? <div className="legal-callout results-empty">
            <span>$</span><div><b>{t.emptyTitle}</b><p>{t.emptyLead}</p></div>
          </div> : result.invalid ? <div className="legal-callout warn validation-callout" role="alert">
            <span>!</span><div>
              <b>{t.invalidTitle}</b>
              {result.issues.map((issue) => <p key={issue}>• {t.validation(issue, result.shiftLimit.day)}</p>)}
            </div>
          </div> : <>
            <div className="legal-total" aria-live="polite" aria-atomic="true">
              <span>{t.total}</span><strong>{money.format(result.total)}</strong>
              <small>{t.hourly}: {money.format(result.hourly)} · {t.daily}: {money.format(result.dailySalary)}</small>
            </div>
            {activeLines.length > 0
              ? <div className="legal-breakdown">{activeLines.map((line) => <div key={line.label} className={line.primary ? "primary" : ""}>
                <span>{line.label}</span><b>{money.format(line.value)}</b><i>{line.formula}</i>
              </div>)}</div>
              : <p className="breakdown-empty">{t.noHoursYet}</p>}
            <div className="legal-facts">
              <div><span>{t.perHourDiurnal}</span><b>{money.format(result.overtimeDiurnalRate)}</b></div>
              <div><span>{t.perHourNocturnal}</span><b>{money.format(result.overtimeNocturnalRate)}</b></div>
            </div>
            {(result.restDaysWorked > 0 || result.holidaysWorked > 0) && <div className="legal-facts">
              {result.restDaysWorked > 0 && <div><span>{t.restFull}</span><b>{money.format(result.restDayFullValue)}</b><small>{t.restFullNote}</small></div>}
              {result.holidaysWorked > 0 && <div><span>{t.holidayFull}</span><b>{money.format(result.holidayFullValue)}</b><small>{t.holidayFullNote}</small></div>}
            </div>}
            {result.compensatoryDays > 0 && <div className="legal-callout"><span>§</span><p>{t.compensatory(result.compensatoryDays)}</p></div>}
          </>}
          {result.nightPremiumMayBeIncluded && <div className="legal-callout warn"><span>!</span><p>{t.nightIncluded}</p></div>}
          <div className="legal-callout"><span>i</span><p>{t.occasional}</p></div>
          <div className="legal-callout warn"><span>!</span><p>{t.forceMajeure}</p></div>
          <p className="legal-disclaimer">{t.grossNote}</p>
        </div>
      </div>

      <div className="source-panel"><h2>{t.sources}</h2><div className="source-links">
        <a href={OFFICIAL.laborCode} target="_blank" rel="noreferrer"><b>01</b>{t.code}<span>↗</span></a>
        <a href={OFFICIAL.overtimePay} target="_blank" rel="noreferrer"><b>02</b>{t.mtpsOvertime}<span>↗</span></a>
        <a href={OFFICIAL.nightShift} target="_blank" rel="noreferrer"><b>03</b>{t.mtpsNight}<span>↗</span></a>
        <a href={OFFICIAL.workingHours} target="_blank" rel="noreferrer"><b>04</b>{t.mtpsHours}<span>↗</span></a>
        <a href={OFFICIAL.holidayPay} target="_blank" rel="noreferrer"><b>05</b>{t.mtpsHoliday}<span>↗</span></a>
        <a href={OFFICIAL.specialSchedules} target="_blank" rel="noreferrer"><b>06</b>{t.mtpsSchedules}<span>↗</span></a>
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
