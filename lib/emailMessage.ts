import type { BusinessSettings, Customer, Job } from "../types/models";
import { formatPence, jobTotalPence } from "./money.ts";
import { addDays, formatUkDate } from "./dates.ts";
import { quoteReference, type DocumentKind } from "./documentHtml.ts";
import { quoteValidUntil } from "./quotes.ts";

// Subject and body for the email that carries an invoice/quote PDF. Short and
// plain on purpose: the PDF has the detail, the email just has to say what it
// is, how much, and how to pay.

export interface EmailMessage {
  subject: string;
  body: string;
}

function greetingName(customer: Customer | undefined): string {
  const name = customer?.name.trim();
  return name ? name : "there";
}

function signOff(settings: BusinessSettings): string {
  return ["Thanks,", settings.tradingName, settings.businessPhone].filter(Boolean).join("\n");
}

export function buildDocumentEmail(
  kind: DocumentKind,
  job: Job,
  customer: Customer | undefined,
  settings: BusinessSettings,
): EmailMessage {
  const total = formatPence(jobTotalPence(job.lineItems));
  const business = settings.tradingName ? ` - ${settings.tradingName}` : "";
  const work = job.title.trim() || "your job";
  const hi = `Hi ${greetingName(customer)},`;

  if (kind === "quote") {
    const ref = quoteReference(job);
    const validUntil = formatUkDate(quoteValidUntil(job, settings));
    return {
      subject: `Quote ${ref} - ${work}${business}`,
      body: [
        hi,
        `Please find attached quote ${ref} for ${work.toLowerCase()}.`,
        `Total: ${total}. This quote is valid until ${validUntil}.`,
        "Just reply to this email if you'd like to go ahead or have any questions.",
        signOff(settings),
      ].join("\n\n"),
    };
  }

  const ref = job.invoiceNumber ?? "Invoice";
  if (job.status === "paid") {
    return {
      subject: `Receipt for invoice ${ref} - ${work}${business}`,
      body: [
        hi,
        `Thank you for your payment of ${total}. Please find attached your receipt for invoice ${ref} (${work.toLowerCase()}).`,
        signOff(settings),
      ].join("\n\n"),
    };
  }

  const issued = job.invoicedOn ?? job.date;
  const due = formatUkDate(addDays(issued, settings.paymentTermsDays));
  const payment = settings.bankDetails
    ? `Payment details:\n${settings.bankDetails}\nPlease use ${ref} as the reference.`
    : null;
  return {
    subject: `Invoice ${ref} - ${work}${business}`,
    body: [
      hi,
      `Please find attached invoice ${ref} for ${work.toLowerCase()}.`,
      `Total due: ${total}, by ${due}.`,
      payment,
      signOff(settings),
    ].filter(Boolean).join("\n\n"),
  };
}
