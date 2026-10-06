import type { BusinessSettings, Customer, Job } from "../types/models";
import { formatPence, jobTotalPence, lineTotalPence } from "./money.ts";
import { addDays, formatUkDate } from "./dates.ts";

export function formatInvoiceNumber(n: number): string {
  return `INV-${String(n).padStart(4, "0")}`;
}

// Plain-text invoice for sharing by SMS/WhatsApp/email. A PDF version comes
// later; most small jobs are settled off a text message today.
export function buildInvoiceText(job: Job, customer: Customer | undefined, settings: BusinessSettings): string {
  const issued = job.invoicedOn ?? job.date;
  const lines = job.lineItems.map((item) => {
    const qty = item.kind === "labour" && item.quantity !== 1 ? ` (${item.quantity} hrs)` : "";
    return `  ${item.description}${qty}: ${formatPence(lineTotalPence(item))}`;
  });
  return [
    `${settings.tradingName || "Invoice"}`,
    `Invoice ${job.invoiceNumber ?? "(draft)"} - ${formatUkDate(issued)}`,
    customer ? `To: ${customer.name}` : null,
    "",
    job.title,
    ...lines,
    "",
    `Total: ${formatPence(jobTotalPence(job.lineItems))}`,
    `Due by: ${formatUkDate(addDays(issued, settings.paymentTermsDays))}`,
    settings.bankDetails ? `\nPay to: ${settings.bankDetails}` : null,
    "\nThank you!",
  ]
    .filter((l): l is string => l !== null)
    .join("\n");
}
