import type { Customer, Job, ReminderKind } from "../types/models";
import { addMonths, daysBetween } from "./dates.ts";

export const REMINDER_LABELS: Record<ReminderKind, string> = {
  boiler_service: "Annual boiler service",
  landlord_gas_safety: "Landlord gas safety (CP12)",
  unvented_service: "Unvented cylinder service",
};

export type ReminderUrgency = "overdue" | "due_soon" | "upcoming";

export interface Reminder {
  jobId: string;
  customerId: string;
  customerName: string;
  kind: ReminderKind;
  dueDate: string;
  daysUntilDue: number;
  urgency: ReminderUrgency;
}

const DUE_SOON_DAYS = 30;

// Every annual job produces one reminder 12 months on. A later job of the same
// kind for the same customer supersedes it, so we only ever chase the latest.
export function buildReminders(jobs: Job[], customers: Customer[], today: string): Reminder[] {
  const latest = new Map<string, Job>();
  for (const job of jobs) {
    if (!job.reminderKind || job.status === "quote" || job.status === "booked") continue;
    const key = `${job.customerId}:${job.reminderKind}`;
    const existing = latest.get(key);
    if (!existing || job.date > existing.date) latest.set(key, job);
  }

  const names = new Map(customers.map((c) => [c.id, c.name]));
  return [...latest.values()]
    .map((job) => {
      const dueDate = addMonths(job.date, 12);
      const daysUntilDue = daysBetween(today, dueDate);
      const urgency: ReminderUrgency =
        daysUntilDue < 0 ? "overdue" : daysUntilDue <= DUE_SOON_DAYS ? "due_soon" : "upcoming";
      return {
        jobId: job.id,
        customerId: job.customerId,
        customerName: names.get(job.customerId) ?? "Unknown customer",
        kind: job.reminderKind!,
        dueDate,
        daysUntilDue,
        urgency,
      };
    })
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}
