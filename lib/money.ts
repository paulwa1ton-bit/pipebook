import type { LineItem } from "../types/models";

export function formatPence(pence: number): string {
  const sign = pence < 0 ? "-" : "";
  const abs = Math.abs(Math.round(pence));
  const pounds = Math.floor(abs / 100).toLocaleString("en-GB");
  return `${sign}£${pounds}.${String(abs % 100).padStart(2, "0")}`;
}

export function poundsToPence(input: string): number | null {
  const cleaned = input.replace(/[£,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100);
}

export function lineTotalPence(item: LineItem): number {
  return Math.round(item.quantity * item.unitPricePence);
}

export function jobTotalPence(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + lineTotalPence(item), 0);
}
