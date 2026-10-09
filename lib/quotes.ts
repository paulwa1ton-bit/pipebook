import type { BusinessSettings, Job } from "../types/models";
import { jobTotalPence } from "./money.ts";
import { addDays, daysBetween } from "./dates.ts";

// Quotes are jobs in "quote" status. Accepting one keeps the same job (and its
// charges) so it pulls straight through to the invoice, remembering what was
// quoted so the plumber can see if the final bill has moved.

export const DEFAULT_QUOTE_VALID_DAYS = 30;

export function quoteValidDays(settings: Pick<BusinessSettings, "quoteValidDays">): number {
  return settings.quoteValidDays ?? DEFAULT_QUOTE_VALID_DAYS;
}

/** A quote is valid from when it was (last) sent, or from its date if never sent. */
export function quoteValidUntil(job: Pick<Job, "date" | "quoteSentOn">, settings: Pick<BusinessSettings, "quoteValidDays">): string {
  return addDays(job.quoteSentOn ?? job.date, quoteValidDays(settings));
}

export type QuoteState =
  | { kind: "draft" }
  | { kind: "sent"; validUntil: string; daysLeft: number }
  | { kind: "expired"; validUntil: string };

export function quoteState(job: Job, today: string, settings: Pick<BusinessSettings, "quoteValidDays">): QuoteState {
  if (!job.quoteSentOn) return { kind: "draft" };
  const validUntil = quoteValidUntil(job, settings);
  const daysLeft = daysBetween(today, validUntil);
  return daysLeft < 0 ? { kind: "expired", validUntil } : { kind: "sent", validUntil, daysLeft };
}

/** The patch that accepts a quote, either to book it in or because the work is done. */
export function acceptQuotePatch(job: Job, today: string, workDone: boolean): Partial<Job> {
  return {
    status: workDone ? "done" : "booked",
    quoteAcceptedOn: today,
    quotedTotalPence: jobTotalPence(job.lineItems),
    ...(workDone ? { date: today } : {}),
  };
}

/** How far the current charges have moved from what was quoted (pence, + is more). */
export function changeSinceQuote(job: Job): number | null {
  if (job.quotedTotalPence === undefined) return null;
  return jobTotalPence(job.lineItems) - job.quotedTotalPence;
}
