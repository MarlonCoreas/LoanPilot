import assert from "node:assert/strict";
import test from "node:test";

import { calculateOvertime, FACTORS, ORDINARY_LIMITS, NIGHT_STARTS_AT } from "../app/overtime.ts";

const base = {
  monthlySalary: 0, ordinaryDayHours: 8,
  overtimeDiurnalHours: 0, overtimeNocturnalHours: 0, nightOrdinaryHours: 0,
  restDaysWorked: 0, restDayHours: 0, holidaysWorked: 0,
};

test("the statutory factors match the articles they are quoted from", () => {
  // Art. 169: recargo del 100%. Art. 168: 25% de nocturnidad, que el MTPS
  // aplica sobre la hora ya recargada. Art. 175: 50%. Art. 192: 100%.
  assert.equal(FACTORS.overtimeDiurnal, 2);
  assert.equal(FACTORS.overtimeNocturnal, 2.5);
  assert.equal(FACTORS.nightSurcharge, 0.25);
  assert.equal(FACTORS.restDaySurcharge, 0.5);
  assert.equal(FACTORS.holidaySurcharge, 1);
  // Art. 161.
  assert.deepEqual(ORDINARY_LIMITS.diurnal, { day: 8, week: 44 });
  assert.deepEqual(ORDINARY_LIMITS.nocturnal, { day: 7, week: 39 });
  assert.equal(NIGHT_STARTS_AT, 19);
});

test("reproduces the MTPS worked example for one overtime hour", () => {
  // El MTPS parte de $1.50 la hora: la extra diurna vale $3.00 y la nocturna
  // $3.74 en su ejemplo, por redondear el 25% a $0.74. La cifra exacta es
  // $3.75, y es la que se muestra; la diferencia es del redondeo del ejemplo.
  const salary = 1.5 * 8 * 30;
  const result = calculateOvertime({
    ...base, monthlySalary: salary, overtimeDiurnalHours: 1, overtimeNocturnalHours: 1,
  });

  assert.equal(result.hourly, 1.5);
  assert.equal(result.overtimeDiurnal, 3);
  assert.equal(result.overtimeNocturnal, 3.75);
  assert.ok(Math.abs(result.overtimeNocturnal - 3.74) <= 0.01);
});

test("the hourly base is the daily salary over the ordinary day, not over 24", () => {
  // Art. 142: el básico por día divide el mes entre 30, y el básico por hora
  // divide ese día entre las horas de la jornada.
  const result = calculateOvertime({ ...base, monthlySalary: 365, ordinaryDayHours: 8 });
  assert.equal(result.dailySalary, 12.17);
  assert.equal(result.hourly, 1.52);

  // Una jornada nocturna de siete horas encarece la hora: el mismo salario se
  // gana en menos tiempo.
  const night = calculateOvertime({ ...base, monthlySalary: 365, ordinaryDayHours: 7 });
  assert.ok(night.hourly > result.hourly);
  assert.equal(night.hourly, 1.74);
});

test("night work inside the ordinary shift earns the 25% surcharge on its own", () => {
  // Art. 168 no depende de que haya horas extras: la hora ordinaria nocturna
  // ya vale un 25% más que la diurna.
  const result = calculateOvertime({ ...base, monthlySalary: 480, nightOrdinaryHours: 40 });
  assert.equal(result.hourly, 2);
  assert.equal(result.nightSurcharge, 20);
  assert.equal(result.total, 20);
});

test("a worked rest day adds the 50% surcharge, not another day of salary", () => {
  // El salario básico de ese día ya viaja dentro del sueldo mensual (arts. 174
  // y 191); lo que se agrega por trabajarlo es el recargo del art. 175.
  const result = calculateOvertime({
    ...base, monthlySalary: 480, restDaysWorked: 1, restDayHours: 8,
  });
  assert.equal(result.restDaySurcharge, 8);
  assert.equal(result.total, 8);
  // Y el día completo, salario básico incluido, vale día y medio.
  assert.equal(result.restDayFullValue, 24);
  // Art. 175: además nace un día de descanso compensatorio remunerado.
  assert.equal(result.compensatoryDays, 1);
});

test("a worked public holiday is paid double, so it adds one ordinary day", () => {
  // Art. 192: salario ordinario más un recargo del ciento por ciento.
  const result = calculateOvertime({ ...base, monthlySalary: 600, holidaysWorked: 2 });
  assert.equal(result.dailySalary, 20);
  assert.equal(result.holidaySurcharge, 40);
  assert.equal(result.holidayFullValue, 80);
});

test("adds up every concept into what the payslip should carry", () => {
  const result = calculateOvertime({
    monthlySalary: 600, ordinaryDayHours: 8,
    overtimeDiurnalHours: 10, overtimeNocturnalHours: 4, nightOrdinaryHours: 20,
    restDaysWorked: 1, restDayHours: 8, holidaysWorked: 1,
  });

  assert.equal(result.hourly, 2.5);
  assert.equal(result.overtimeDiurnal, 50);
  assert.equal(result.overtimeNocturnal, 25);
  assert.equal(result.nightSurcharge, 12.5);
  assert.equal(result.restDaySurcharge, 10);
  assert.equal(result.holidaySurcharge, 20);
  assert.equal(result.total, 117.5);
});

test("an empty or negative salary yields nothing instead of a negative payslip", () => {
  for (const monthlySalary of [0, -900, Number.NaN]) {
    const result = calculateOvertime({ ...base, monthlySalary, overtimeDiurnalHours: 10 });
    assert.equal(result.invalid, true);
    assert.equal(result.total, 0);
  }
  // Las horas negativas se ignoran en lugar de restar del total.
  const result = calculateOvertime({
    ...base, monthlySalary: 600, overtimeDiurnalHours: -5, overtimeNocturnalHours: 2,
  });
  assert.equal(result.overtimeDiurnal, 0);
  assert.equal(result.total, 12.5);
});

test("flags an ordinary day longer than article 161 allows", () => {
  assert.equal(calculateOvertime({ ...base, monthlySalary: 600, ordinaryDayHours: 8 }).exceedsOrdinaryDay, false);
  assert.equal(calculateOvertime({ ...base, monthlySalary: 600, ordinaryDayHours: 10 }).exceedsOrdinaryDay, true);
});
