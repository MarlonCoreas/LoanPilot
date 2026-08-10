// All loan arithmetic lives here so it can be exercised directly by the tests
// without booting React. Interest is always accrued on the outstanding balance
// over actual days / 365, which is the convention Salvadoran banks quote.
export type InsuranceMode = "balance" | "fixed" | "none";
export type ExtraPayment = { id: number; date: string; amount: string };
// A condition change: the rate from `date` onward, and optionally a new payment
// for lenders that re-amortise instead of moving the maturity date.
export type RateChange = { id: number; date: string; rate: string; payment: string };

export type Row = {
  number: number;
  date: Date;
  opening: number;
  payment: number;
  interest: number;
  principal: number;
  insurance: number;
  extra: number;
  closing: number;
};

// Every date is anchored to 12:00 UTC so the schedule is identical on the
// server and in the browser. Local-time arithmetic made server rendering and
// hydration disagree whenever the two sat on different calendar days.
export function addMonths(date: Date, months: number) {
  const result = new Date(date); const day = result.getUTCDate(); result.setUTCDate(1); result.setUTCMonth(result.getUTCMonth() + months);
  const last = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate(); result.setUTCDate(Math.min(day, last)); return result;
}
// The calendar day is resolved in El Salvador time, where the audience is, and
// only then anchored at 12:00 UTC. Reading it off the runtime clock instead put
// anyone east of the country — including a UTC build server after 18:00 local —
// a day ahead, so the defaults offered a date the user had not reached yet.
const SV_CALENDAR = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/El_Salvador", year: "numeric", month: "2-digit", day: "2-digit",
});
export function todayIso() {
  const parts = new Map(SV_CALENDAR.formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${parts.get("year")}-${parts.get("month")}-${parts.get("day")}`;
}
export function today() { return parseDate(todayIso()); }
export function parseDate(value: string) { return new Date(`${value}T12:00:00Z`); }
export function daysBetween(a: Date, b: Date) { return Math.max(1, Math.round((b.getTime() - a.getTime()) / 86_400_000)); }
// Segmented accrual has to allow a zero-day span. An event landing exactly on an
// instalment date splits the period into [start, event] and [event, event], and
// the one-day floor above would bill interest for that empty second leg.
export function daysElapsed(a: Date, b: Date) { return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000)); }
export const n = (value: string) => Math.max(0, Number(value) || 0);
export const isoAfterMonths = (months: number) => addMonths(today(), months).toISOString().slice(0, 10);

export function solvePayment(principal: number, annualRate: number, firstDate: Date, months: number) {
  if (principal <= 0 || months <= 0) return 0; if (annualRate <= 0) return principal / months;
  const start = today();
  const outstanding = (payment: number) => { let balance = principal; let previous = start; for (let i = 0; i < months; i++) { const date = addMonths(firstDate, i); const interest = balance * (annualRate / 100) * (daysBetween(previous, date) / 365); balance = balance + interest - payment; previous = date; } return balance; };
  // The upper bound has to actually clear the debt before bisecting. On a
  // single-instalment loan `principal` alone never covers principal + interest.
  let low = 0; let high = Math.max(principal, 1);
  for (let i = 0; i < 60 && outstanding(high) > 0; i++) high *= 2;
  for (let i = 0; i < 80; i++) { const mid = (low + high) / 2; if (outstanding(mid) > 0) low = mid; else high = mid; } return high;
}

export function buildNewSchedule(args: { principal: number; annualRate: number; firstDate: Date; months: number; insuranceMode: InsuranceMode; insuranceValue: number; }) {
  const payment = solvePayment(args.principal, args.annualRate, args.firstDate, args.months); const rows: Row[] = []; let balance = args.principal; let previous = today();
  for (let i = 0; i < args.months && balance > 0.005; i++) { const date = addMonths(args.firstDate, i); const opening = balance; const interest = opening * (args.annualRate / 100) * (daysBetween(previous, date) / 365); const due = Math.min(payment, opening + interest); const principalPaid = Math.max(0, due - interest); const insurance = args.insuranceMode === "balance" ? opening * (args.insuranceValue / 1000) : args.insuranceMode === "fixed" ? args.insuranceValue : 0; balance = Math.max(0, opening - principalPaid); rows.push({ number: i + 1, date, opening, payment: due, interest, principal: principalPaid, insurance, extra: 0, closing: balance }); previous = date; }
  return { rows, payment };
}

export function buildActiveSchedule(args: { balance: number; annualRate: number; payment: number; nextDate: Date; insurance: number; oneTimeExtra?: number; extraDate?: Date; monthlyExtra?: number; }) {
  const rows: Row[] = []; let balance = args.balance; let previous = today(); let extraApplied = false; let invalid = false;
  // `payment` excludes insurance in all three builders; the table and the
  // exporter add the two columns themselves.
  for (let i = 0; i < 1200 && balance > 0.005; i++) { const date = addMonths(args.nextDate, i); const opening = balance; const interest = opening * (args.annualRate / 100) * (daysBetween(previous, date) / 365); if (args.payment <= interest && (args.monthlyExtra ?? 0) <= 0) { invalid = true; break; } const normalDue = Math.min(args.payment, opening + interest); const principalPaid = Math.max(0, normalDue - interest); let extra = Math.max(0, args.monthlyExtra ?? 0); if (!extraApplied && (args.oneTimeExtra ?? 0) > 0 && args.extraDate && date >= args.extraDate) { extra += args.oneTimeExtra ?? 0; extraApplied = true; } extra = Math.min(extra, Math.max(0, opening - principalPaid)); balance = Math.max(0, opening - principalPaid - extra); rows.push({ number: i + 1, date, opening, payment: normalDue + extra, interest, principal: principalPaid, insurance: args.insurance, extra, closing: balance }); previous = date; }
  return { rows, invalid };
}

// Prepayments and condition changes are both date-keyed events, so the accrual
// walks a single merged timeline: interest is charged at the rate in force for
// each segment, then the event is applied at its own date.
type TimelineEvent = { date: Date; amount: number; rate: number | null; payment: number | null };

function timeline(extras: ExtraPayment[], changes: RateChange[]): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  for (const item of extras) {
    const date = parseDate(item.date); const amount = n(item.amount);
    if (item.date && amount > 0 && !Number.isNaN(date.getTime())) events.push({ date, amount, rate: null, payment: null });
  }
  for (const item of changes) {
    const date = parseDate(item.date);
    if (!item.date || Number.isNaN(date.getTime())) continue;
    const rate = item.rate.trim() === "" ? null : n(item.rate);
    const payment = item.payment.trim() === "" ? null : n(item.payment);
    if (rate === null && payment === null) continue;
    events.push({ date, amount: 0, rate, payment });
  }
  // A rate change and a prepayment on the same day must settle the rate first,
  // otherwise the prepayment would be credited against a stale accrual.
  return events.sort((a, b) => a.date.getTime() - b.date.getTime() || (a.amount === 0 ? -1 : 1));
}

export function buildHistoricalSchedule(args: { principal: number; annualRate: number; payment: number; firstDate: Date; extras: ExtraPayment[]; insurance?: number; rateChanges?: RateChange[]; }) {
  const rows: Row[] = [];
  const events = timeline(args.extras, args.rateChanges ?? []);
  let balance = args.principal;
  let previous = addMonths(args.firstDate, -1);
  let rate = args.annualRate;
  let payment = args.payment;
  let eventIndex = 0;
  let invalid = false;
  for (let i = 0; i < 1200 && balance > 0.005; i++) {
    const date = addMonths(args.firstDate, i);
    const opening = balance;
    let cursor = previous;
    let interest = 0;
    let extra = 0;
    while (eventIndex < events.length && events[eventIndex].date <= date) {
      const item = events[eventIndex];
      if (item.date > cursor) {
        interest += balance * (rate / 100) * (daysElapsed(cursor, item.date) / 365);
        cursor = item.date;
      }
      if (item.amount > 0) {
        const applied = Math.min(balance, item.amount);
        balance = Math.max(0, balance - applied);
        extra += applied;
      }
      if (item.rate !== null) rate = item.rate;
      if (item.payment !== null) payment = item.payment;
      eventIndex++;
    }
    if (balance <= 0.005) {
      rows.push({ number: i + 1, date: cursor, opening, payment: extra, interest, principal: 0, insurance: 0, extra, closing: 0 });
      break;
    }
    interest += balance * (rate / 100) * (daysElapsed(cursor, date) / 365);
    if (payment <= interest) { invalid = true; break; }
    const normalDue = Math.min(payment, balance + interest);
    const principalPaid = Math.max(0, normalDue - interest);
    balance = Math.max(0, balance - principalPaid);
    rows.push({ number: i + 1, date, opening, payment: normalDue + extra, interest, principal: principalPaid, insurance: args.insurance ?? 0, extra, closing: balance });
    previous = date;
  }
  return { rows, invalid };
}

// Rebuilding a past loan, people reliably remember the term and the payment but
// rarely the rate, so the view solves for whichever of the two is missing. The
// solved rate also lands the baseline exactly on the contract term: a typed
// nominal rate is quoted 30/360 and overshoots into an extra month under the
// actual/365 accrual used everywhere here.
export function balanceAfterTerm(principal: number, annualRate: number, payment: number, firstDate: Date, months: number) {
  let balance = principal; let previous = addMonths(firstDate, -1);
  for (let i = 0; i < months; i++) { const date = addMonths(firstDate, i); balance += balance * (annualRate / 100) * (daysBetween(previous, date) / 365) - payment; previous = date; }
  return balance;
}
export function solveRate(principal: number, payment: number, firstDate: Date, months: number) {
  // A payment that cannot clear the principal even at 0% has no solution.
  if (principal <= 0 || payment <= 0 || months <= 0 || balanceAfterTerm(principal, 0, payment, firstDate, months) > 0) return NaN;
  let low = 0; let high = 1;
  for (let i = 0; i < 60 && balanceAfterTerm(principal, high, payment, firstDate, months) < 0; i++) high *= 2;
  for (let i = 0; i < 100; i++) { const mid = (low + high) / 2; if (balanceAfterTerm(principal, mid, payment, firstDate, months) < 0) low = mid; else high = mid; } return low;
}

export function monthlyIrr(net: number, payments: number[]) {
  if (net <= 0 || payments.length === 0) return 0; const npv = (r: number) => payments.reduce((sum, p, i) => sum + p / Math.pow(1 + r, i + 1), -net); let low = 0; let high = 1; if (npv(0) < 0) return 0; for (let i = 0; i < 100; i++) { const mid = (low + high) / 2; if (npv(mid) > 0) low = mid; else high = mid; } return (Math.pow(1 + high, 12) - 1) * 100;
}
