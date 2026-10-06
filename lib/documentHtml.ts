import type { BusinessSettings, Customer, Job } from "../types/models";
import { formatPence, jobTotalPence, lineTotalPence } from "./money.ts";
import { addDays, formatUkDate } from "./dates.ts";

// HTML for the PDF invoice/quote. expo-print renders it to a PDF on the phone,
// so it must be self-contained (inline CSS, logo as a data URI, no web fonts).

export type DocumentKind = "invoice" | "quote";

export const QUOTE_VALID_DAYS = 30;

export function quoteReference(job: Job): string {
  return `QUO-${job.id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

function esc(value: string | undefined): string {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");
}

export function documentFileName(kind: DocumentKind, job: Job, customer: Customer | undefined): string {
  const ref = kind === "invoice" ? job.invoiceNumber ?? "Invoice" : quoteReference(job);
  const who = (customer?.name ?? "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return [ref, who].filter(Boolean).join("_") + ".pdf";
}

export function buildDocumentHtml(
  kind: DocumentKind,
  job: Job,
  customer: Customer | undefined,
  settings: BusinessSettings,
): string {
  const isInvoice = kind === "invoice";
  const issued = isInvoice ? job.invoicedOn ?? job.date : job.date;
  const reference = isInvoice ? job.invoiceNumber ?? "Draft" : quoteReference(job);
  const total = formatPence(jobTotalPence(job.lineItems));
  const paid = isInvoice && job.status === "paid";

  const rows = job.lineItems
    .map((item) => {
      const qty = item.kind === "labour" && item.quantity !== 1 ? `${item.quantity} hrs` : String(item.quantity);
      return `<tr><td>${esc(item.description)}</td><td class="num">${esc(qty)}</td><td class="num">${formatPence(lineTotalPence(item))}</td></tr>`;
    })
    .join("");

  const contact = [settings.businessPhone, settings.businessEmail].filter(Boolean).map(esc).join(" &middot; ");

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>${esc(reference)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #14212B; margin: 40px; font-size: 13px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0E4C6E; padding-bottom: 16px; }
  .logo { max-width: 180px; max-height: 80px; }
  .biz { font-size: 12px; color: #5B6B78; line-height: 1.5; margin-top: 6px; }
  .biz strong { color: #14212B; font-size: 16px; }
  h1 { margin: 0; font-size: 28px; color: #0E4C6E; text-align: right; letter-spacing: 1px; }
  .meta { text-align: right; font-size: 12px; line-height: 1.6; margin-top: 6px; }
  .to { margin: 24px 0; line-height: 1.5; }
  .label { font-size: 11px; text-transform: uppercase; color: #5B6B78; letter-spacing: .5px; }
  .work { font-size: 15px; font-weight: 600; margin: 8px 0 12px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; color: #5B6B78; border-bottom: 1px solid #DDE3E8; padding: 8px 0; }
  td { padding: 10px 0; border-bottom: 1px solid #EEF1F4; }
  .num { text-align: right; width: 110px; }
  .total td { border-bottom: none; font-size: 17px; font-weight: 700; padding-top: 14px; }
  .box { margin-top: 28px; padding: 14px 16px; background: #F4F6F8; border-radius: 8px; line-height: 1.6; }
  .paid { display: inline-block; margin-top: 18px; padding: 6px 16px; border: 3px solid #2E7D32; color: #2E7D32; font-weight: 800; font-size: 20px; border-radius: 6px; transform: rotate(-4deg); }
  .foot { margin-top: 36px; font-size: 11px; color: #5B6B78; text-align: center; }
</style></head>
<body>
  <div class="head">
    <div>
      ${settings.logoDataUri ? `<img class="logo" src="${settings.logoDataUri}"/>` : ""}
      <div class="biz">
        <strong>${esc(settings.tradingName || "")}</strong><br/>
        ${settings.businessAddress ? `${esc(settings.businessAddress)}<br/>` : ""}
        ${contact ? `${contact}<br/>` : ""}
        ${settings.gasSafeNumber ? `Gas Safe reg. ${esc(settings.gasSafeNumber)}` : ""}
      </div>
    </div>
    <div>
      <h1>${isInvoice ? "INVOICE" : "QUOTE"}</h1>
      <div class="meta">
        <b>${esc(reference)}</b><br/>
        Date: ${formatUkDate(issued)}<br/>
        ${isInvoice
          ? `Due: ${formatUkDate(addDays(issued, settings.paymentTermsDays))}`
          : `Valid until: ${formatUkDate(addDays(issued, QUOTE_VALID_DAYS))}`}
      </div>
    </div>
  </div>

  <div class="to">
    <div class="label">${isInvoice ? "Bill to" : "Prepared for"}</div>
    <b>${esc(customer?.name)}</b><br/>
    ${customer?.address ? `${esc(customer.address)}<br/>` : ""}
    ${customer?.phone ? esc(customer.phone) : ""}
  </div>

  <div class="label">${isInvoice ? "Work carried out" : "Proposed work"}</div>
  <div class="work">${esc(job.title)}</div>

  <table>
    <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr class="total"><td>Total</td><td></td><td class="num">${total}</td></tr></tfoot>
  </table>

  ${paid ? `<div class="paid">PAID ${job.paidOn ? formatUkDate(job.paidOn) : ""}</div>` : ""}

  ${isInvoice && !paid && settings.bankDetails
    ? `<div class="box"><div class="label">How to pay</div>${esc(settings.bankDetails)}<br/>Please use <b>${esc(reference)}</b> as the reference.</div>`
    : ""}
  ${!isInvoice
    ? `<div class="box">This quote is valid for ${QUOTE_VALID_DAYS} days. Prices include parts and labour as listed. Any extra work found once started will be discussed with you before it goes ahead.</div>`
    : ""}

  <div class="foot">Thank you for your business.</div>
</body></html>`;
}
