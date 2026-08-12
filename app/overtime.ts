/**
 * Horas extras y recargos del Código de Trabajo de El Salvador.
 *
 * Todo lo que aparece aquí se leyó contra el texto de los artículos citados y
 * contra la explicación oficial del MTPS. Dos cosas que circulan mal en la web
 * y que este módulo no repite:
 *
 *  - La hora extra nocturna no es 2.25 veces la hora básica. El MTPS aplica el
 *    25% de nocturnidad sobre la hora ya recargada al 100%, y su ejemplo lo
 *    muestra: $1.50 por hora da $3.00 de hora extra diurna y $3.74 de nocturna,
 *    es decir 2.5 veces la hora básica. El PDF divulgativo de la Corte Suprema
 *    tampoco sirve de referencia: dice semana de 40 horas y jornada nocturna
 *    desde las diez de la noche, ambas cosas contra el artículo 161.
 *
 *  - Trabajar el día de descanso semanal no se paga al 300%. El artículo 175
 *    reconoce el salario básico del día, un recargo mínimo del 50% por las
 *    horas trabajadas y un día de descanso compensatorio remunerado.
 */

/** El día en que cada regla de este archivo se leyó contra su fuente. */
export const OVERTIME_REVIEWED = "2026-08-11";

/** Artículo 161: las horas diurnas van de las 6:00 a las 19:00. */
export const NIGHT_STARTS_AT = 19;
export const NIGHT_ENDS_AT = 6;

/** Artículo 161: máximos de la jornada ordinaria, en horas. */
export const ORDINARY_LIMITS = {
  diurnal: { day: 8, week: 44 },
  nocturnal: { day: 7, week: 39 },
};

/**
 * Los factores que multiplican la hora básica. Se expresan como el total que
 * se paga por la hora, no como el recargo, porque es la cifra que el
 * trabajador compara contra su planilla.
 */
export const FACTORS = {
  /** Art. 169: recargo del 100% sobre el salario básico por hora. */
  overtimeDiurnal: 2,
  /** Arts. 168 y 169, en el orden que aplica el MTPS: (1 + 100%) + 25%. */
  overtimeNocturnal: 2.5,
  /** Art. 168: recargo del 25% sobre la hora ordinaria trabajada de noche. */
  nightSurcharge: 0.25,
  /** Art. 175: recargo mínimo del 50% por las horas del día de descanso. */
  restDaySurcharge: 0.5,
  /** Art. 192: salario ordinario más un recargo del 100%. */
  holidaySurcharge: 1,
};

export type OvertimeInput = {
  monthlySalary: number;
  /** Horas de la jornada ordinaria diaria: 8 diurna, 7 nocturna (art. 161). */
  ordinaryDayHours: number;
  overtimeDiurnalHours: number;
  overtimeNocturnalHours: number;
  /** Horas ordinarias trabajadas dentro de la jornada nocturna. */
  nightOrdinaryHours: number;
  restDaysWorked: number;
  restDayHours: number;
  holidaysWorked: number;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const clean = (value: number | undefined) => (Number.isFinite(value) && value! > 0 ? value! : 0);

export function calculateOvertime(input: OvertimeInput) {
  const salary = clean(input.monthlySalary);
  // Art. 142 A) 2): el salario básico por día de un sueldo mensual se obtiene
  // dividiéndolo entre el número de días del período, que es la misma regla de
  // treinta días que usa el finiquito.
  const dailySalary = salary / 30;
  // Art. 142 B) 1): el básico por hora es el del día entre las horas de la
  // jornada ordinaria, así que una jornada más corta encarece la hora.
  const ordinaryDayHours = clean(input.ordinaryDayHours) || ORDINARY_LIMITS.diurnal.day;
  const hourly = ordinaryDayHours > 0 ? dailySalary / ordinaryDayHours : 0;

  const overtimeDiurnalHours = clean(input.overtimeDiurnalHours);
  const overtimeNocturnalHours = clean(input.overtimeNocturnalHours);
  const nightOrdinaryHours = clean(input.nightOrdinaryHours);
  const restDaysWorked = clean(input.restDaysWorked);
  const restDayHours = clean(input.restDayHours);
  const holidaysWorked = clean(input.holidaysWorked);

  const overtimeDiurnal = round2(overtimeDiurnalHours * hourly * FACTORS.overtimeDiurnal);
  const overtimeNocturnal = round2(overtimeNocturnalHours * hourly * FACTORS.overtimeNocturnal);
  const nightSurcharge = round2(nightOrdinaryHours * hourly * FACTORS.nightSurcharge);
  const restDaySurcharge = round2(restDayHours * hourly * FACTORS.restDaySurcharge);
  const holidaySurcharge = round2(holidaysWorked * dailySalary * FACTORS.holidaySurcharge);

  // Lo que debe aparecer de más en la planilla. El salario básico del día de
  // descanso y el del asueto no se suman aquí: en un sueldo mensual ya vienen
  // dentro del mes (arts. 174 y 191), así que sumarlos contaría dos veces el
  // mismo día. Lo que se añade por trabajarlos es el recargo.
  const total = round2(
    overtimeDiurnal + overtimeNocturnal + nightSurcharge + restDaySurcharge + holidaySurcharge,
  );

  return {
    invalid: salary <= 0,
    dailySalary: round2(dailySalary),
    hourly: round2(hourly),
    ordinaryDayHours,
    overtimeDiurnalHours, overtimeDiurnal,
    overtimeNocturnalHours, overtimeNocturnal,
    nightOrdinaryHours, nightSurcharge,
    restDayHours, restDaySurcharge,
    holidaysWorked, holidaySurcharge,
    total,
    /** Art. 175: un día de descanso compensatorio por cada día de descanso trabajado. */
    compensatoryDays: restDaysWorked,
    /** Art. 175: lo que vale el día de descanso completo, salario básico incluido. */
    restDayFullValue: round2(restDaysWorked * dailySalary + restDaySurcharge),
    /** Art. 192: el asueto trabajado vale el doble del día ordinario. */
    holidayFullValue: round2(holidaysWorked * dailySalary * (1 + FACTORS.holidaySurcharge)),
    /** Art. 161: la jornada declarada excede el máximo legal diurno. */
    exceedsOrdinaryDay: ordinaryDayHours > ORDINARY_LIMITS.diurnal.day,
  };
}
