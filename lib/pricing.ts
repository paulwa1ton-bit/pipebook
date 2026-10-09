import type { BusinessSettings, Job, LineItem } from "../types/models";

// Hourly labour and commission ("markup") on parts. The customer-facing price
// always lives in unitPricePence; cost and markup are kept alongside so the
// plumber can see and change them, but they never appear on an invoice.

export const DEFAULT_MARKUP_PERCENT = 15;

export function applyMarkup(costPence: number, markupPercent: number): number {
  return Math.round(costPence * (1 + markupPercent / 100));
}

/** The commission % new parts lines should get, or undefined when switched off. */
export function activeMarkupPercent(settings: Pick<BusinessSettings, "markupEnabled" | "markupPercent">): number | undefined {
  return settings.markupEnabled ? settings.markupPercent ?? DEFAULT_MARKUP_PERCENT : undefined;
}

export function hourlyLabourLine(hours: number, ratePence: number): Omit<LineItem, "id"> {
  return { kind: "labour", description: "Labour", quantity: roundHours(hours), unitPricePence: ratePence, hourly: true };
}

/** A parts line priced from what the plumber paid, with commission if given. */
export function partsLine(description: string, costPence: number, markupPercent?: number, quantity = 1): Omit<LineItem, "id"> {
  if (!markupPercent) return { kind: "parts", description, quantity, unitPricePence: costPence };
  return {
    kind: "parts", description, quantity,
    unitPricePence: applyMarkup(costPence, markupPercent),
    costPence, markupPercent,
  };
}

/** Switches commission on (with a %) or off for one parts line. */
export function withMarkup<T extends Omit<LineItem, "id">>(item: T, markupPercent: number | undefined): T {
  const cost = item.costPence ?? item.unitPricePence;
  // Clear the commission fields explicitly (not just omit them) so the change
  // also applies when merged into the stored line as a patch.
  if (!markupPercent) return { ...item, unitPricePence: cost, costPence: undefined, markupPercent: undefined };
  return { ...item, costPence: cost, markupPercent, unitPricePence: applyMarkup(cost, markupPercent) };
}

export function jobHourlyRate(job: Pick<Job, "hourlyRatePence">, settings: Pick<BusinessSettings, "hourlyRatePence">): number {
  return job.hourlyRatePence ?? settings.hourlyRatePence;
}

/** Re-prices every hourly labour line on a job at a new rate. */
export function repriceHourly(items: LineItem[], ratePence: number): LineItem[] {
  return items.map((item) => (item.hourly ? { ...item, unitPricePence: ratePence } : item));
}

export function roundHours(hours: number): number {
  return Math.max(0, Math.round(hours * 100) / 100);
}

/** Commission earned on a set of lines: charged price minus cost, for marked-up parts. */
export function markupEarnedPence(items: LineItem[]): number {
  return items.reduce(
    (sum, item) => (item.costPence !== undefined ? sum + Math.round((item.unitPricePence - item.costPence) * item.quantity) : sum),
    0,
  );
}
