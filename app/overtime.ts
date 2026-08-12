/**
 * Horas extras y recargos del Código de Trabajo de El Salvador.
 *
 * El cálculo separa las horas de días ordinarios de las trabajadas en descanso
 * semanal o asueto. Los arts. 175 y 192 ordenan usar el salario extraordinario
 * de esos días como base cuando, además, se trabajan horas extra.
 */

/** El día en que cada regla de este archivo se leyó contra su fuente. */
export const OVERTIME_REVIEWED = "2026-08-11";

/** Artículo 161: las horas diurnas van de las 6:00 a las 19:00. */
export const NIGHT_STARTS_AT = 19;
export const NIGHT_ENDS_AT = 6;

export type ShiftKind =
  | "diurnal"
  | "nocturnal"
  | "dangerousDiurnal"
  | "dangerousNocturnal"
  | "minorUnder16"
  | "minor16to17";

/** Límites de los arts. 116, 161 y 162. */
export const SHIFT_LIMITS: Record<ShiftKind, { day: number; week: number }> = {
  diurnal: { day: 8, week: 44 },
  nocturnal: { day: 7, week: 39 },
  dangerousDiurnal: { day: 7, week: 39 },
  dangerousNocturnal: { day: 6, week: 36 },
  minorUnder16: { day: 6, week: 34 },
  minor16to17: { day: 8, week: 44 },
};

/** Alias conservado para las referencias generales de la interfaz. */
export const ORDINARY_LIMITS = {
  diurnal: SHIFT_LIMITS.diurnal,
  nocturnal: SHIFT_LIMITS.nocturnal,
};

/** Factores sobre la hora básica; expresan el pago total de esa hora. */
export const FACTORS = {
  /** Art. 169: hora básica más recargo del 100%. */
  overtimeDiurnal: 2,
  /** Arts. 168-169 y ejemplo del MTPS: la hora extra nocturna vale 2.5 veces. */
  overtimeNocturnal: 2.5,
  /** Art. 168: recargo de nocturnidad sobre la hora ordinaria. */
  nightSurcharge: 0.25,
  /** Art. 175: recargo por las horas ordinarias trabajadas en descanso. */
  restDaySurcharge: 0.5,
  /** Art. 175: (hora + 50%) más recargo de hora extra del 100%. */
  restDayOvertimeDiurnal: 3,
  restDayOvertimeNocturnal: 3.75,
  /** Art. 192: el asueto trabajado vale el doble. */
  holidaySurcharge: 1,
  /** Art. 192: la hora extra usa como base el salario extraordinario doble. */
  holidayOvertimeDiurnal: 4,
  holidayOvertimeNocturnal: 5,
} as const;

export type OvertimeValidationIssue =
  | "salary"
  | "ordinaryHours"
  | "ordinaryLimit"
  | "restDaysWhole"
  | "restDaysRange"
  | "restDaysMissing"
  | "restHoursMissing"
  | "restOrdinaryExcess"
  | "restHoursCapacity"
  | "holidaysWhole"
  | "holidaysRange"
  | "holidayDaysMissing"
  | "holidayHoursCapacity"
  | "coincidentDaysWhole"
  | "coincidentDaysExcess"
  | "hoursRange"
  | "totalHoursRange"
  | "minorNightWork"
  | "minorDailyOvertimeMissing"
  | "minorDailyOvertimeLimit";

/**
 * Los dos issues que sólo significan "todavía no has escrito lo básico".
 *
 * La página los trata como estado vacío y no como error: al abrirla, el salario
 * y la jornada bastan para invalidar el cálculo, y gritarle "revisa estos datos"
 * a alguien que aún no ha tecleado nada es una forma rara de recibirlo.
 */
const INCOMPLETE_ISSUES: OvertimeValidationIssue[] = ["salary", "ordinaryHours"];

/** Nadie trabaja más de 24 horas en un día, ni siquiera en un asueto. */
const HOURS_IN_A_DAY = 24;
/** Horas de un mes de 31 días: el techo de cualquier período que se registre. */
const HOURS_IN_A_MONTH = 744;

export type OvertimeInput = {
  monthlySalary: number;
  shiftKind: ShiftKind;
  /** Horas pactadas de la jornada ordinaria diaria (art. 142). */
  ordinaryDayHours: number;
  /** Horas de días ordinarios, sin repetir las de descansos o asuetos. */
  overtimeDiurnalHours: number;
  overtimeNocturnalHours: number;
  /** Horas ordinarias ejecutadas entre las 19:00 y las 6:00. */
  nightOrdinaryHours: number;
  restDaysWorked: number;
  restDayOrdinaryHours: number;
  restDayOvertimeDiurnalHours: number;
  restDayOvertimeNocturnalHours: number;
  holidaysWorked: number;
  holidayOvertimeDiurnalHours: number;
  holidayOvertimeNocturnalHours: number;
  /** Art. 194: asuetos trabajados que también eran descanso semanal. */
  coincidentRestHolidayDays: number;
  /** Art. 116: máximo de horas extra hechas en un solo día por menor de 16. */
  minorMaximumDailyOvertimeHours: number;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const clean = (value: number | undefined) => (Number.isFinite(value) && value! > 0 ? value! : 0);
const whole = (value: number) => Number.isInteger(value);

export function calculateOvertime(input: OvertimeInput) {
  const salary = clean(input.monthlySalary);
  const shiftKind = input.shiftKind in SHIFT_LIMITS ? input.shiftKind : "diurnal";
  const shiftLimit = SHIFT_LIMITS[shiftKind];
  const ordinaryDayHours = clean(input.ordinaryDayHours);
  const dailySalary = salary / 30;
  const hourlyPrecise = ordinaryDayHours > 0 ? dailySalary / ordinaryDayHours : 0;

  const overtimeDiurnalHours = clean(input.overtimeDiurnalHours);
  const overtimeNocturnalHours = clean(input.overtimeNocturnalHours);
  const nightOrdinaryHours = clean(input.nightOrdinaryHours);
  const restDaysWorked = clean(input.restDaysWorked);
  const restDayOrdinaryHours = clean(input.restDayOrdinaryHours);
  const restDayOvertimeDiurnalHours = clean(input.restDayOvertimeDiurnalHours);
  const restDayOvertimeNocturnalHours = clean(input.restDayOvertimeNocturnalHours);
  const holidaysWorked = clean(input.holidaysWorked);
  const holidayOvertimeDiurnalHours = clean(input.holidayOvertimeDiurnalHours);
  const holidayOvertimeNocturnalHours = clean(input.holidayOvertimeNocturnalHours);
  const coincidentRestHolidayDays = clean(input.coincidentRestHolidayDays);
  const minorMaximumDailyOvertimeHours = clean(input.minorMaximumDailyOvertimeHours);

  const restHoursWorked = restDayOrdinaryHours
    + restDayOvertimeDiurnalHours
    + restDayOvertimeNocturnalHours;
  const holidayOvertimeHours = holidayOvertimeDiurnalHours + holidayOvertimeNocturnalHours;
  const issues: OvertimeValidationIssue[] = [];

  if (salary <= 0) issues.push("salary");
  if (ordinaryDayHours <= 0) issues.push("ordinaryHours");
  if (ordinaryDayHours > shiftLimit.day) issues.push("ordinaryLimit");
  if (!whole(restDaysWorked)) issues.push("restDaysWhole");
  if (restDaysWorked > 31) issues.push("restDaysRange");
  if (restDaysWorked === 0 && restHoursWorked > 0) issues.push("restDaysMissing");
  if (restDaysWorked > 0 && restHoursWorked === 0) issues.push("restHoursMissing");
  if (restDaysWorked > 0 && restDayOrdinaryHours > restDaysWorked * ordinaryDayHours) {
    issues.push("restOrdinaryExcess");
  }
  // Las horas de descanso son el total del período, no las de un día: sin este
  // techo, "1 descanso" con 48 horas encima se pagaba sin decir nada.
  if (restDaysWorked > 0 && restHoursWorked > restDaysWorked * HOURS_IN_A_DAY) {
    issues.push("restHoursCapacity");
  }
  if (!whole(holidaysWorked)) issues.push("holidaysWhole");
  if (holidaysWorked > 31) issues.push("holidaysRange");
  if (holidaysWorked === 0 && holidayOvertimeHours > 0) issues.push("holidayDaysMissing");
  // La hora extra empieza donde termina la jornada ordinaria, así que en un
  // asueto sólo caben las horas del día que la jornada no ocupa ya.
  if (holidaysWorked > 0
    && holidayOvertimeHours > holidaysWorked * Math.max(0, HOURS_IN_A_DAY - ordinaryDayHours)) {
    issues.push("holidayHoursCapacity");
  }
  if (!whole(coincidentRestHolidayDays)) issues.push("coincidentDaysWhole");
  if (coincidentRestHolidayDays > holidaysWorked) issues.push("coincidentDaysExcess");
  const allHours = [
    overtimeDiurnalHours,
    overtimeNocturnalHours,
    nightOrdinaryHours,
    restDayOrdinaryHours,
    restDayOvertimeDiurnalHours,
    restDayOvertimeNocturnalHours,
    holidayOvertimeDiurnalHours,
    holidayOvertimeNocturnalHours,
  ];
  if (allHours.some((hours) => hours > HOURS_IN_A_MONTH)) issues.push("hoursRange");
  // El techo por grupo dejaba pasar ocho grupos de 744: casi seis meses de
  // horas dentro de un período mensual.
  if (allHours.reduce((sum, hours) => sum + hours, 0) > HOURS_IN_A_MONTH) {
    issues.push("totalHoursRange");
  }
  const isMinor = shiftKind === "minorUnder16" || shiftKind === "minor16to17";
  const hasOvertime = overtimeDiurnalHours > 0
    || overtimeNocturnalHours > 0
    || restDayOvertimeDiurnalHours > 0
    || restDayOvertimeNocturnalHours > 0
    || holidayOvertimeDiurnalHours > 0
    || holidayOvertimeNocturnalHours > 0;
  if (isMinor && (
    nightOrdinaryHours > 0
    || overtimeNocturnalHours > 0
    || restDayOvertimeNocturnalHours > 0
    || holidayOvertimeNocturnalHours > 0
  )) issues.push("minorNightWork");
  if (shiftKind === "minorUnder16" && hasOvertime && minorMaximumDailyOvertimeHours <= 0) {
    issues.push("minorDailyOvertimeMissing");
  }
  if (shiftKind === "minorUnder16" && minorMaximumDailyOvertimeHours > 2) {
    issues.push("minorDailyOvertimeLimit");
  }

  /**
   * Lo que se paga por cada unidad de cada concepto.
   *
   * La página escribe la operación al lado de cada línea ("8 h × $2.50 × 50%"),
   * y quien la comprueba a mano tiene que llegar al mismo centavo: por eso la
   * tarifa sale del valor preciso y el monto se calcula con ese mismo valor, no
   * con la hora ya redondeada que se muestra arriba.
   */
  const rateFor = (factor: number) => round2(hourlyPrecise * factor);
  const overtimeDiurnalRate = rateFor(FACTORS.overtimeDiurnal);
  const overtimeNocturnalRate = rateFor(FACTORS.overtimeNocturnal);
  const overtimeDiurnal = round2(overtimeDiurnalHours * hourlyPrecise * FACTORS.overtimeDiurnal);
  const overtimeNocturnal = round2(overtimeNocturnalHours * hourlyPrecise * FACTORS.overtimeNocturnal);
  const nightSurcharge = round2(nightOrdinaryHours * hourlyPrecise * FACTORS.nightSurcharge);
  const restDaySurcharge = round2(restDayOrdinaryHours * hourlyPrecise * FACTORS.restDaySurcharge);
  const restDayOvertimeDiurnal = round2(
    restDayOvertimeDiurnalHours * hourlyPrecise * FACTORS.restDayOvertimeDiurnal,
  );
  const restDayOvertimeNocturnal = round2(
    restDayOvertimeNocturnalHours * hourlyPrecise * FACTORS.restDayOvertimeNocturnal,
  );
  const holidaySurcharge = round2(holidaysWorked * dailySalary * FACTORS.holidaySurcharge);
  const holidayOvertimeDiurnal = round2(
    holidayOvertimeDiurnalHours * hourlyPrecise * FACTORS.holidayOvertimeDiurnal,
  );
  const holidayOvertimeNocturnal = round2(
    holidayOvertimeNocturnalHours * hourlyPrecise * FACTORS.holidayOvertimeNocturnal,
  );

  const calculatedTotal = round2(
    overtimeDiurnal
    + overtimeNocturnal
    + nightSurcharge
    + restDaySurcharge
    + restDayOvertimeDiurnal
    + restDayOvertimeNocturnal
    + holidaySurcharge
    + holidayOvertimeDiurnal
    + holidayOvertimeNocturnal,
  );
  const invalid = issues.length > 0;
  const incomplete = issues.length > 0 && issues.every((issue) => INCOMPLETE_ISSUES.includes(issue));

  return {
    invalid,
    incomplete,
    issues,
    shiftKind,
    shiftLimit,
    /**
     * El promedio por día, para que la página pueda repetirle al usuario lo que
     * entendió. Las casillas piden el total del período y se leen igual de bien
     * como "por día"; quien trabajó cuatro domingos de ocho horas y escribe 8
     * cobra la cuarta parte, y nada en la pantalla se lo delata.
     */
    restDayAverageHours: restDaysWorked > 0 ? round2(restHoursWorked / restDaysWorked) : 0,
    restHoursWorked: round2(restHoursWorked),
    holidayAverageOvertimeHours: holidaysWorked > 0
      ? round2(holidayOvertimeHours / holidaysWorked) : 0,
    holidayOvertimeHours: round2(holidayOvertimeHours),
    /**
     * Art. 168: el 25% se calcula sobre el salario ordinario *diurno*. Quien
     * tiene turno nocturno permanente casi siempre lo lleva ya dentro del
     * sueldo pactado, y el cálculo no puede distinguirlo desde el salario.
     */
    nightPremiumMayBeIncluded: shiftKind === "nocturnal" && nightOrdinaryHours > 0,
    dailySalary: round2(dailySalary),
    hourly: round2(hourlyPrecise),
    overtimeDiurnalRate,
    overtimeNocturnalRate,
    nightSurchargeRate: rateFor(FACTORS.nightSurcharge),
    restDaySurchargeRate: rateFor(FACTORS.restDaySurcharge),
    restDayOvertimeDiurnalRate: rateFor(FACTORS.restDayOvertimeDiurnal),
    restDayOvertimeNocturnalRate: rateFor(FACTORS.restDayOvertimeNocturnal),
    /** Éste es por día trabajado, no por hora: el art. 192 habla del día. */
    holidaySurchargeRate: round2(dailySalary * FACTORS.holidaySurcharge),
    holidayOvertimeDiurnalRate: rateFor(FACTORS.holidayOvertimeDiurnal),
    holidayOvertimeNocturnalRate: rateFor(FACTORS.holidayOvertimeNocturnal),
    /**
     * Las mismas tarifas sin redondear, para la operación que se imprime al
     * lado de cada monto.
     *
     * Con salario de $500 la hora extra diurna vale $4.1667: la tarjeta la
     * muestra como $4.17, que es el precio de una hora, pero "3 h × $4.17" da
     * $12.51 y la línea dice $12.50. Quien comprueba la cuenta a mano necesita
     * ver el factor con el que de verdad se multiplicó.
     */
    exactRates: {
      overtimeDiurnal: hourlyPrecise * FACTORS.overtimeDiurnal,
      overtimeNocturnal: hourlyPrecise * FACTORS.overtimeNocturnal,
      nightSurcharge: hourlyPrecise * FACTORS.nightSurcharge,
      restDaySurcharge: hourlyPrecise * FACTORS.restDaySurcharge,
      restDayOvertimeDiurnal: hourlyPrecise * FACTORS.restDayOvertimeDiurnal,
      restDayOvertimeNocturnal: hourlyPrecise * FACTORS.restDayOvertimeNocturnal,
      holidaySurcharge: dailySalary * FACTORS.holidaySurcharge,
      holidayOvertimeDiurnal: hourlyPrecise * FACTORS.holidayOvertimeDiurnal,
      holidayOvertimeNocturnal: hourlyPrecise * FACTORS.holidayOvertimeNocturnal,
    },
    ordinaryDayHours,
    overtimeDiurnalHours, overtimeDiurnal,
    overtimeNocturnalHours, overtimeNocturnal,
    nightOrdinaryHours, nightSurcharge,
    restDaysWorked,
    restDayOrdinaryHours, restDaySurcharge,
    restDayOvertimeDiurnalHours, restDayOvertimeDiurnal,
    restDayOvertimeNocturnalHours, restDayOvertimeNocturnal,
    holidaysWorked, holidaySurcharge,
    holidayOvertimeDiurnalHours, holidayOvertimeDiurnal,
    holidayOvertimeNocturnalHours, holidayOvertimeNocturnal,
    coincidentRestHolidayDays,
    minorMaximumDailyOvertimeHours,
    total: invalid ? 0 : calculatedTotal,
    /** Arts. 175 y 194. */
    compensatoryDays: invalid ? 0 : restDaysWorked + coincidentRestHolidayDays,
    /** Valor completo; el salario básico del descanso ya está en el sueldo mensual. */
    restDayFullValue: invalid ? 0 : round2(
      restDaysWorked * dailySalary
      + restDaySurcharge
      + restDayOvertimeDiurnal
      + restDayOvertimeNocturnal,
    ),
    /** Valor completo; el total adicional sólo agrega lo no incluido en el sueldo mensual. */
    holidayFullValue: invalid ? 0 : round2(
      holidaysWorked * dailySalary * (1 + FACTORS.holidaySurcharge)
      + holidayOvertimeDiurnal
      + holidayOvertimeNocturnal,
    ),
    exceedsOrdinaryDay: ordinaryDayHours > shiftLimit.day,
  };
}
