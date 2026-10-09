import type { Expense, ExpenseCategory, Job } from "../types/models";
import { jobTotalPence } from "./money.ts";
import { markupEarnedPence } from "./pricing.ts";

// MTD for Income Tax uses standard quarters aligned to the 6 April tax year:
//   Q1 6 Apr - 5 Jul, Q2 6 Jul - 5 Oct, Q3 6 Oct - 5 Jan, Q4 6 Jan - 5 Apr
// with each quarterly update due by the 7th of the following month-plus-one.
// Income is on the cash basis (the default for sole traders), so a job counts
// in the quarter it was paid, not the quarter it was invoiced.

export interface TaxQuarter {
  taxYear: string; // e.g. "2026-27"
  quarter: 1 | 2 | 3 | 4;
  start: string;
  end: string;
  deadline: string;
}

export function taxYearStartFor(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return m > 4 || (m === 4 && d >= 6) ? y : y - 1;
}

export function quartersForTaxYear(startYear: number): TaxQuarter[] {
  const label = `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
  const n = startYear + 1;
  return [
    { quarter: 1, start: `${startYear}-04-06`, end: `${startYear}-07-05`, deadline: `${startYear}-08-07` },
    { quarter: 2, start: `${startYear}-07-06`, end: `${startYear}-10-05`, deadline: `${startYear}-11-07` },
    { quarter: 3, start: `${startYear}-10-06`, end: `${n}-01-05`, deadline: `${n}-02-07` },
    { quarter: 4, start: `${n}-01-06`, end: `${n}-04-05`, deadline: `${n}-05-07` },
  ].map((q) => ({ ...q, taxYear: label }) as TaxQuarter);
}

export function quarterFor(iso: string): TaxQuarter {
  const quarters = quartersForTaxYear(taxYearStartFor(iso));
  return quarters.find((q) => iso >= q.start && iso <= q.end)!;
}

export interface QuarterSummary {
  quarter: TaxQuarter;
  turnoverPence: number;
  expensesPence: number;
  expensesByCategory: Record<ExpenseCategory, number>;
  profitPence: number;
  paidJobCount: number;
  // Part of turnover that came from commission on parts (for the plumber's
  // own insight; HMRC only needs the turnover total).
  commissionPence: number;
}

export function summariseQuarter(quarter: TaxQuarter, jobs: Job[], expenses: Expense[]): QuarterSummary {
  const inRange = (iso?: string) => !!iso && iso >= quarter.start && iso <= quarter.end;
  const paidJobs = jobs.filter((j) => j.status === "paid" && inRange(j.paidOn));
  const turnoverPence = paidJobs.reduce((sum, j) => sum + jobTotalPence(j.lineItems), 0);

  const expensesByCategory: Record<ExpenseCategory, number> = {
    costOfGoods: 0, travelCosts: 0, adminCosts: 0,
    premisesRunningCosts: 0, professionalFees: 0, otherExpenses: 0,
  };
  for (const e of expenses) {
    if (inRange(e.date)) expensesByCategory[e.category] += e.amountPence;
  }
  const expensesPence = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);

  return {
    quarter,
    turnoverPence,
    expensesPence,
    expensesByCategory,
    profitPence: turnoverPence - expensesPence,
    paidJobCount: paidJobs.length,
    commissionPence: paidJobs.reduce((sum, j) => sum + markupEarnedPence(j.lineItems), 0),
  };
}
