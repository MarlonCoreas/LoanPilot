import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateOvertime, splitShiftHours, FACTORS, SHIFT_LIMITS, NIGHT_STARTS_AT,
} from "../app/overtime.ts";

test("a shift that never touches the night is all daytime", () => {
  const office = splitShiftHours({ startHour: 8, endHour: 17, ordinaryDayHours: 8 });

  assert.equal(office.invalid, false);
  assert.equal(office.totalHours, 9);
  assert.equal(office.dayHours, 9);
  assert.equal(office.nightHours, 0);
  assert.equal(office.classifiedNocturnal, false);
  // Las primeras 8 h cubren la jornada; la novena ya es extraordinaria.
  assert.equal(office.ordinaryHours, 8);
  assert.equal(office.overtimeDiurnalHours, 1);
});

test("a shift crossing midnight splits at 19:00 and 6:00", () => {
  // 14:00 a 02:00: cinco horas de día y siete de noche.
  const evening = splitShiftHours({ startHour: 14, endHour: 2, ordinaryDayHours: 7 });

  assert.equal(evening.totalHours, 12);
  assert.equal(evening.dayHours, 5);
  assert.equal(evening.nightHours, 7);
  // Más de cuatro horas nocturnas hacen nocturna la jornada (art. 161).
  assert.equal(evening.classifiedNocturnal, true);
  // Las 7 ordinarias van de 14:00 a 21:00, así que dos caen de noche.
  assert.equal(evening.ordinaryNightHours, 2);
  // Y las 5 extra, de 21:00 a 02:00, son todas nocturnas.
  assert.equal(evening.overtimeNocturnalHours, 5);
  assert.equal(evening.overtimeDiurnalHours, 0);
});

test("the night classification does not depend on where the ordinary block ends", () => {
  // El corte ordinario/extra mueve el reparto, no el total de horas nocturnas:
  // por eso la clasificación es estable y la página no necesita iterar.
  const short = splitShiftHours({ startHour: 18, endHour: 6, ordinaryDayHours: 6 });
  const long = splitShiftHours({ startHour: 18, endHour: 6, ordinaryDayHours: 8 });

  assert.equal(short.nightHours, long.nightHours);
  assert.equal(short.classifiedNocturnal, long.classifiedNocturnal);
  assert.notEqual(short.ordinaryNightHours, long.ordinaryNightHours);
});

test("half hours survive the split at both ends of the night", () => {
  // 18:30 a 06:30 toca día por los dos extremos: media hora antes de las 19:00
  // y media hora después de las 6:00.
  const result = splitShiftHours({ startHour: 18.5, endHour: 6.5, ordinaryDayHours: 7 });

  assert.equal(result.totalHours, 12);
  assert.equal(result.dayHours, 1);
  assert.equal(result.nightHours, 11);
  // Las 7 ordinarias corren de 18:30 a 01:30: seis horas y media de noche.
  assert.equal(result.ordinaryNightHours, 6.5);
  // Las 5 extra van de 01:30 a 06:30, con la última media hora ya de día.
  assert.equal(result.overtimeNocturnalHours, 4.5);
  assert.equal(result.overtimeDiurnalHours, 0.5);
});

test("a shift that cannot be read is refused instead of guessed", () => {
  // Salir a la misma hora describe un turno de cero horas o de veinticuatro.
  const same = splitShiftHours({ startHour: 8, endHour: 8, ordinaryDayHours: 8 });
  assert.ok(same.issues.includes("empty"));

  // 06:00 a 05:00 son 23 horas: casi siempre entrada y salida intercambiadas.
  const reversed = splitShiftHours({ startHour: 6, endHour: 5, ordinaryDayHours: 8 });
  assert.ok(reversed.issues.includes("tooLong"));
  assert.equal(reversed.totalHours, 0);

  const outOfRange = splitShiftHours({ startHour: 25, endHour: 8, ordinaryDayHours: 8 });
  assert.ok(outOfRange.issues.includes("range"));
});

const base = {
  monthlySalary: 0,
  shiftKind: "diurnal",
  ordinaryDayHours: 8,
  shiftsInPeriod: 0,
  overtimeDiurnalHours: 0,
  overtimeNocturnalHours: 0,
  nightOrdinaryHours: 0,
  restDaysWorked: 0,
  restDayOrdinaryHours: 0,
  restDayOvertimeDiurnalHours: 0,
  restDayOvertimeNocturnalHours: 0,
  holidaysWorked: 0,
  holidayOvertimeDiurnalHours: 0,
  holidayOvertimeNocturnalHours: 0,
  coincidentRestHolidayDays: 0,
  minorMaximumDailyOvertimeHours: 0,
};

test("the statutory factors and shift limits match the cited articles", () => {
  assert.equal(FACTORS.overtimeDiurnal, 2);
  assert.equal(FACTORS.overtimeNocturnal, 2.5);
  assert.equal(FACTORS.nightSurcharge, 0.25);
  assert.equal(FACTORS.restDaySurcharge, 0.5);
  assert.equal(FACTORS.restDayOvertimeDiurnal, 3);
  assert.equal(FACTORS.restDayOvertimeNocturnal, 3.75);
  assert.equal(FACTORS.holidaySurcharge, 1);
  assert.equal(FACTORS.holidayOvertimeDiurnal, 4);
  assert.equal(FACTORS.holidayOvertimeNocturnal, 5);
  assert.deepEqual(SHIFT_LIMITS.diurnal, { day: 8, week: 44 });
  assert.deepEqual(SHIFT_LIMITS.nocturnal, { day: 7, week: 39 });
  assert.deepEqual(SHIFT_LIMITS.dangerousDiurnal, { day: 7, week: 39 });
  assert.deepEqual(SHIFT_LIMITS.dangerousNocturnal, { day: 6, week: 36 });
  assert.deepEqual(SHIFT_LIMITS.minorUnder16, { day: 6, week: 34 });
  assert.deepEqual(SHIFT_LIMITS.minor16to17, { day: 8, week: 44 });
  assert.equal(NIGHT_STARTS_AT, 19);
});

test("reproduces the MTPS worked example for one overtime hour", () => {
  const result = calculateOvertime({
    ...base,
    monthlySalary: 1.5 * 8 * 30,
    overtimeDiurnalHours: 1,
    overtimeNocturnalHours: 1,
  });

  assert.equal(result.hourly, 1.5);
  assert.equal(result.overtimeDiurnal, 3);
  assert.equal(result.overtimeNocturnal, 3.75);
});

test("the hourly base is the daily salary over the contracted ordinary day", () => {
  const day = calculateOvertime({ ...base, monthlySalary: 365, ordinaryDayHours: 8 });
  const night = calculateOvertime({
    ...base,
    monthlySalary: 365,
    shiftKind: "nocturnal",
    ordinaryDayHours: 7,
  });

  assert.equal(day.dailySalary, 12.17);
  assert.equal(day.hourly, 1.52);
  assert.equal(night.hourly, 1.74);
  assert.ok(night.hourly > day.hourly);
});

test("per-hour cards are rounded from the precise rate, not a rounded hourly display", () => {
  const result = calculateOvertime({ ...base, monthlySalary: 500, overtimeDiurnalHours: 1 });
  assert.equal(result.hourly, 2.08);
  assert.equal(result.overtimeDiurnalRate, 4.17);
  assert.equal(result.overtimeNocturnalRate, 5.21);
  assert.equal(result.overtimeDiurnal, result.overtimeDiurnalRate);
});

test("every unit rate reproduces its own line to the cent", () => {
  // La página escribe "8 h × $1.25" al lado de cada monto. Si la tarifa saliera
  // de una hora ya redondeada, la multiplicación que el usuario comprueba a
  // mano no daría el número impreso a la par.
  const result = calculateOvertime({
    ...base,
    monthlySalary: 500,
    overtimeDiurnalHours: 3,
    overtimeNocturnalHours: 3,
    nightOrdinaryHours: 3,
    restDaysWorked: 1,
    restDayOrdinaryHours: 3,
    restDayOvertimeDiurnalHours: 3,
    restDayOvertimeNocturnalHours: 3,
    holidaysWorked: 2,
    holidayOvertimeDiurnalHours: 3,
    holidayOvertimeNocturnalHours: 3,
  });

  const pairs = [
    ["overtimeDiurnal", "overtimeDiurnalHours"],
    ["overtimeNocturnal", "overtimeNocturnalHours"],
    ["nightSurcharge", "nightOrdinaryHours"],
    ["restDaySurcharge", "restDayOrdinaryHours"],
    ["restDayOvertimeDiurnal", "restDayOvertimeDiurnalHours"],
    ["restDayOvertimeNocturnal", "restDayOvertimeNocturnalHours"],
    ["holidaySurcharge", "holidaysWorked"],
    ["holidayOvertimeDiurnal", "holidayOvertimeDiurnalHours"],
    ["holidayOvertimeNocturnal", "holidayOvertimeNocturnalHours"],
  ];

  for (const [concept, quantity] of pairs) {
    assert.equal(
      result[concept],
      Math.round((result[quantity] * result.exactRates[concept] + Number.EPSILON) * 100) / 100,
      `${quantity} × exactRates.${concept} must equal ${concept}`,
    );
  }

  // La tarjeta de precio sí se redondea: una hora extra diurna cuesta $4.17
  // aunque tres de ellas sumen $12.50 y no $12.51.
  assert.equal(result.overtimeDiurnalRate, 4.17);
  assert.equal(result.overtimeDiurnal, 12.5);
  // El recargo del asueto se cuenta por día trabajado, no por hora (art. 192).
  assert.equal(result.holidaySurchargeRate, result.dailySalary);
});

test("a shift longer than the legal day is split instead of refused", () => {
  // Vigilancia con turnos de 12×12: quince turnos en el mes. Antes la
  // herramienta se negaba a calcular y le pedía hacer el reparto a mano.
  const guard = calculateOvertime({
    ...base,
    monthlySalary: 480,
    ordinaryDayHours: 12,
    shiftsInPeriod: 15,
  });

  assert.equal(guard.invalid, false);
  assert.equal(guard.exceedsOrdinaryDay, true);
  assert.equal(guard.legalOrdinaryDayHours, 8);
  assert.equal(guard.extendedShiftHours, 4);
  assert.equal(guard.extendedShiftOvertimeHours, 60);

  // La hora básica sale de las 8 legales, no de las 12 pactadas: dividir entre
  // 12 daría $1.33 y abarataría la hora justo por trabajar de más.
  assert.equal(guard.hourly, 2);
  assert.equal(guard.overtimeDiurnalHours, 60);
  assert.equal(guard.overtimeDiurnal, 240);
  assert.equal(guard.total, 240);
});

test("the extended shift adds to overtime entered separately, it does not replace it", () => {
  const result = calculateOvertime({
    ...base,
    monthlySalary: 480,
    ordinaryDayHours: 12,
    shiftsInPeriod: 10,
    overtimeDiurnalHours: 5,
  });

  assert.equal(result.enteredOvertimeDiurnalHours, 5);
  assert.equal(result.extendedShiftOvertimeHours, 40);
  assert.equal(result.overtimeDiurnalHours, 45);
  assert.equal(result.overtimeDiurnal, 180);
});

test("a long shift without a shift count is prompted, not silently dropped", () => {
  const result = calculateOvertime({
    ...base,
    monthlySalary: 480,
    ordinaryDayHours: 12,
  });

  assert.equal(result.invalid, false);
  assert.equal(result.needsShiftCount, true);
  assert.equal(result.extendedShiftOvertimeHours, 0);
  // La hora básica ya es la correcta aunque falten los turnos.
  assert.equal(result.hourly, 2);

  const counted = calculateOvertime({ ...base, monthlySalary: 480, ordinaryDayHours: 12, shiftsInPeriod: 15 });
  assert.equal(counted.needsShiftCount, false);
});

test("a day that cannot exist is still refused", () => {
  const impossible = calculateOvertime({ ...base, monthlySalary: 480, ordinaryDayHours: 25 });
  assert.ok(impossible.issues.includes("ordinaryDayImpossible"));
  assert.equal(impossible.total, 0);

  const fractionalShifts = calculateOvertime({
    ...base, monthlySalary: 480, ordinaryDayHours: 12, shiftsInPeriod: 1.5,
  });
  assert.ok(fractionalShifts.issues.includes("shiftsWhole"));
});

test("ordinary night work earns the 25% surcharge", () => {
  const result = calculateOvertime({ ...base, monthlySalary: 480, nightOrdinaryHours: 40 });
  assert.equal(result.hourly, 2);
  assert.equal(result.nightSurcharge, 20);
  assert.equal(result.total, 20);
});

test("a worked rest day adds 50% for ordinary hours and a compensatory day", () => {
  const result = calculateOvertime({
    ...base,
    monthlySalary: 480,
    restDaysWorked: 1,
    restDayOrdinaryHours: 8,
  });

  assert.equal(result.restDaySurcharge, 8);
  assert.equal(result.total, 8);
  assert.equal(result.restDayFullValue, 24);
  assert.equal(result.compensatoryDays, 1);
});

test("rest-day overtime uses the extraordinary 150% day rate as its base", () => {
  const result = calculateOvertime({
    ...base,
    monthlySalary: 480,
    restDaysWorked: 1,
    restDayOrdinaryHours: 8,
    restDayOvertimeDiurnalHours: 1,
    restDayOvertimeNocturnalHours: 1,
  });

  assert.equal(result.restDayOvertimeDiurnal, 6);
  assert.equal(result.restDayOvertimeNocturnal, 7.5);
  assert.equal(result.total, 21.5);
});

test("a worked holiday and its overtime use the extraordinary double rate", () => {
  const result = calculateOvertime({
    ...base,
    monthlySalary: 600,
    holidaysWorked: 1,
    holidayOvertimeDiurnalHours: 1,
    holidayOvertimeNocturnalHours: 1,
  });

  assert.equal(result.holidaySurcharge, 20);
  assert.equal(result.holidayOvertimeDiurnal, 10);
  assert.equal(result.holidayOvertimeNocturnal, 12.5);
  assert.equal(result.holidayFullValue, 62.5);
});

test("a holiday that coincides with weekly rest adds only the compensatory day", () => {
  const result = calculateOvertime({
    ...base,
    monthlySalary: 600,
    holidaysWorked: 1,
    coincidentRestHolidayDays: 1,
  });

  assert.equal(result.total, 20);
  assert.equal(result.compensatoryDays, 1);
});

test("adds every ordinary and special-day concept", () => {
  const result = calculateOvertime({
    ...base,
    monthlySalary: 600,
    overtimeDiurnalHours: 10,
    overtimeNocturnalHours: 4,
    nightOrdinaryHours: 20,
    restDaysWorked: 1,
    restDayOrdinaryHours: 8,
    restDayOvertimeDiurnalHours: 1,
    restDayOvertimeNocturnalHours: 1,
    holidaysWorked: 1,
    holidayOvertimeDiurnalHours: 1,
    holidayOvertimeNocturnalHours: 1,
  });

  assert.equal(result.total, 156.88);
});

test("rejects contradictory special-day inputs instead of inventing entitlements", () => {
  const noRestHours = calculateOvertime({ ...base, monthlySalary: 600, restDaysWorked: 1 });
  assert.equal(noRestHours.invalid, true);
  assert.deepEqual(noRestHours.issues, ["restHoursMissing"]);
  assert.equal(noRestHours.compensatoryDays, 0);

  const noRestDay = calculateOvertime({ ...base, monthlySalary: 600, restDayOrdinaryHours: 8 });
  assert.equal(noRestDay.invalid, true);
  assert.ok(noRestDay.issues.includes("restDaysMissing"));

  const fractionalDays = calculateOvertime({ ...base, monthlySalary: 600, holidaysWorked: 0.5 });
  assert.equal(fractionalDays.invalid, true);
  assert.ok(fractionalDays.issues.includes("holidaysWhole"));

  const tooManyDays = calculateOvertime({ ...base, monthlySalary: 600, holidaysWorked: 32 });
  assert.ok(tooManyDays.issues.includes("holidaysRange"));

  const tooManyHours = calculateOvertime({ ...base, monthlySalary: 600, overtimeDiurnalHours: 745 });
  assert.ok(tooManyHours.issues.includes("hoursRange"));

  const excessCoincidence = calculateOvertime({
    ...base,
    monthlySalary: 600,
    holidaysWorked: 1,
    coincidentRestHolidayDays: 2,
  });
  assert.ok(excessCoincidence.issues.includes("coincidentDaysExcess"));
});

test("validates the selected shift instead of assuming an eight-hour daytime limit", () => {
  const night = calculateOvertime({
    ...base,
    monthlySalary: 600,
    shiftKind: "nocturnal",
    ordinaryDayHours: 8,
  });
  // La octava hora de una jornada nocturna ya es extraordinaria (art. 161).
  assert.equal(night.invalid, false);
  assert.equal(night.legalOrdinaryDayHours, 7);
  assert.equal(night.extendedShiftHours, 1);

  const dangerous = calculateOvertime({
    ...base,
    monthlySalary: 600,
    shiftKind: "dangerousNocturnal",
    ordinaryDayHours: 6,
  });
  assert.equal(dangerous.invalid, false);

  const minorNight = calculateOvertime({
    ...base,
    monthlySalary: 600,
    shiftKind: "minorUnder16",
    ordinaryDayHours: 6,
    overtimeNocturnalHours: 1,
    minorMaximumDailyOvertimeHours: 1,
  });
  assert.ok(minorNight.issues.includes("minorNightWork"));

  const minorDailyExcess = calculateOvertime({
    ...base,
    monthlySalary: 600,
    shiftKind: "minorUnder16",
    ordinaryDayHours: 6,
    overtimeDiurnalHours: 3,
    minorMaximumDailyOvertimeHours: 3,
  });
  assert.ok(minorDailyExcess.issues.includes("minorDailyOvertimeLimit"));
});

test("hours entered for special days cannot exceed the days they are spread over", () => {
  // Un descanso no tiene 48 horas: antes esto se pagaba en silencio.
  const restOverflow = calculateOvertime({
    ...base,
    monthlySalary: 600,
    restDaysWorked: 1,
    restDayOrdinaryHours: 8,
    restDayOvertimeDiurnalHours: 40,
  });
  assert.ok(restOverflow.issues.includes("restHoursCapacity"));
  assert.equal(restOverflow.total, 0);

  // La hora extra empieza tras la jornada, así que en un asueto caben 24 - 8.
  const holidayOverflow = calculateOvertime({
    ...base,
    monthlySalary: 600,
    holidaysWorked: 1,
    holidayOvertimeDiurnalHours: 100,
  });
  assert.ok(holidayOverflow.issues.includes("holidayHoursCapacity"));
  assert.equal(holidayOverflow.total, 0);

  const fits = calculateOvertime({
    ...base,
    monthlySalary: 600,
    holidaysWorked: 2,
    holidayOvertimeDiurnalHours: 32,
  });
  assert.equal(fits.invalid, false);
});

test("the whole period is capped, not just each group of hours on its own", () => {
  const perGroupOnly = calculateOvertime({
    ...base,
    monthlySalary: 600,
    overtimeDiurnalHours: 700,
    overtimeNocturnalHours: 700,
    nightOrdinaryHours: 700,
  });
  assert.deepEqual(perGroupOnly.issues, ["totalHoursRange"]);
  assert.equal(perGroupOnly.total, 0);
});

test("reports the average per day so a total read as a daily figure is visible", () => {
  const result = calculateOvertime({
    ...base,
    monthlySalary: 600,
    restDaysWorked: 4,
    restDayOrdinaryHours: 8,
    holidaysWorked: 2,
    holidayOvertimeDiurnalHours: 5,
  });

  // Cuatro domingos de ocho horas son 32, no 8: el promedio de 2 h lo delata.
  assert.equal(result.restHoursWorked, 8);
  assert.equal(result.restDayAverageHours, 2);
  assert.equal(result.holidayOvertimeHours, 5);
  assert.equal(result.holidayAverageOvertimeHours, 2.5);
});

test("a night shift is flagged for a night premium the salary may already carry", () => {
  const nightShift = calculateOvertime({
    ...base,
    monthlySalary: 600,
    shiftKind: "nocturnal",
    ordinaryDayHours: 7,
    nightOrdinaryHours: 154,
  });
  assert.equal(nightShift.invalid, false);
  assert.equal(nightShift.nightPremiumMayBeIncluded, true);

  // En jornada diurna las horas nocturnas sueltas sí son un extra genuino.
  const dayShift = calculateOvertime({ ...base, monthlySalary: 600, nightOrdinaryHours: 20 });
  assert.equal(dayShift.nightPremiumMayBeIncluded, false);
});

test("a missing salary is incomplete, a contradiction is invalid", () => {
  const untouched = calculateOvertime({ ...base, monthlySalary: 0 });
  assert.equal(untouched.invalid, true);
  assert.equal(untouched.incomplete, true);

  const contradictory = calculateOvertime({ ...base, monthlySalary: 600, restDayOrdinaryHours: 8 });
  assert.equal(contradictory.invalid, true);
  assert.equal(contradictory.incomplete, false);

  const complete = calculateOvertime({ ...base, monthlySalary: 600, overtimeDiurnalHours: 4 });
  assert.equal(complete.incomplete, false);
});

test("empty and negative values cannot produce a negative payslip", () => {
  for (const monthlySalary of [0, -900, Number.NaN]) {
    const result = calculateOvertime({ ...base, monthlySalary, overtimeDiurnalHours: 10 });
    assert.equal(result.invalid, true);
    assert.equal(result.total, 0);
  }

  const result = calculateOvertime({
    ...base,
    monthlySalary: 600,
    overtimeDiurnalHours: -5,
    overtimeNocturnalHours: 2,
  });
  assert.equal(result.overtimeDiurnal, 0);
  assert.equal(result.total, 12.5);
});
