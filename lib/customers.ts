import type { Customer, Job } from "../types/models";
import { jobTotalPence } from "./money.ts";

// Customer list helpers: search across everything a plumber might remember
// (name, street, postcode, number, email) and a per-customer summary.

const squash = (s: string | undefined) => (s ?? "").toLowerCase().replace(/\s+/g, "");

export function searchCustomers(customers: Customer[], query: string): Customer[] {
  const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return sorted;
  return sorted.filter((c) => {
    const hay = [c.name, c.address, c.email].map((s) => (s ?? "").toLowerCase()).join(" ");
    const compact = squash(c.address) + " " + squash(c.phone); // "ls61aa", "07700900123"
    return words.every((w) => hay.includes(w) || compact.includes(squash(w)));
  });
}

export interface CustomerSummary {
  jobCount: number;
  openQuotes: number;
  owedPence: number;
  lastJobDate?: string;
}

export function customerSummary(jobs: Job[], customerId: string): CustomerSummary {
  const theirs = jobs.filter((j) => j.customerId === customerId);
  return {
    jobCount: theirs.length,
    openQuotes: theirs.filter((j) => j.status === "quote").length,
    owedPence: theirs.filter((j) => j.status === "invoiced").reduce((sum, j) => sum + jobTotalPence(j.lineItems), 0),
    lastJobDate: theirs.map((j) => j.date).sort().at(-1),
  };
}

/** First line of an address, for compact lists. */
export function addressFirstLine(address: string | undefined): string {
  return (address ?? "").split(/[\n,]/)[0]?.trim() ?? "";
}
