import type { BusinessSettings, Customer, Expense, Job } from "../types/models";
import { jobTotalPence } from "./money.ts";
import { addDays, daysBetween } from "./dates.ts";
import { quoteState } from "./quotes.ts";
import { buildReminders, type Reminder } from "./reminders.ts";
import { quarterFor, summariseQuarter, type QuarterSummary } from "./taxQuarters.ts";

// Everything the home screen shows, worked out in one place.

const QUOTE_EXPIRING_DAYS = 7;

export interface Tally {
  count: number;
  pence: number;
}

export interface DashboardSummary {
  owed: Tally & { overdue: Tally };
  quotes: Tally & { expiringSoon: number; notSent: number };
  notInvoiced: Tally;
  booked: Tally;
  remindersDue: Reminder[];
  quarter: QuarterSummary;
  daysToMtdDeadline: number;
  recent: Job[];
}

const tally = (jobs: Job[]): Tally => ({ count: jobs.length, pence: jobs.reduce((s, j) => s + jobTotalPence(j.lineItems), 0) });

export function invoiceDueDate(job: Job, settings: Pick<BusinessSettings, "paymentTermsDays">): string {
  return addDays(job.invoicedOn ?? job.date, settings.paymentTermsDays);
}

export function buildDashboard(
  jobs: Job[],
  customers: Customer[],
  expenses: Expense[],
  settings: BusinessSettings,
  today: string,
): DashboardSummary {
  const invoiced = jobs.filter((j) => j.status === "invoiced");
  const overdue = invoiced.filter((j) => invoiceDueDate(j, settings) < today);
  const quotes = jobs.filter((j) => j.status === "quote");
  const states = quotes.map((q) => quoteState(q, today, settings));
  const quarter = summariseQuarter(quarterFor(today), jobs, expenses);

  return {
    owed: { ...tally(invoiced), overdue: tally(overdue) },
    quotes: {
      ...tally(quotes),
      notSent: states.filter((s) => s.kind === "draft").length,
      expiringSoon: states.filter((s) => s.kind === "sent" && s.daysLeft <= QUOTE_EXPIRING_DAYS).length,
    },
    notInvoiced: tally(jobs.filter((j) => j.status === "done")),
    booked: tally(jobs.filter((j) => j.status === "booked")),
    remindersDue: buildReminders(jobs, customers, today).filter((r) => r.urgency !== "upcoming"),
    quarter,
    daysToMtdDeadline: daysBetween(today, quarter.quarter.deadline),
    recent: [...jobs].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 3),
  };
}

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}
