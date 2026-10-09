/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDocumentEmail } from "./emailMessage.ts";
import type { BusinessSettings, Customer, Job } from "../types/models";

const settings: BusinessSettings = {
  tradingName: "J Bloggs Plumbing", businessPhone: "07700 900123", hourlyRatePence: 5000, calloutPence: 6000,
  paymentTermsDays: 14, nextInvoiceNumber: 4, bankDetails: "Sort code 12-34-56\nAccount 12345678", updatedAt: "",
};
const customer: Customer = { id: "c", name: "Mrs Smith", email: "smith@example.com", createdAt: "", updatedAt: "" };
const job: Job = {
  id: "ab12cd34-0000", customerId: "c", title: "Boiler service", status: "invoiced", date: "2026-10-09",
  invoiceNumber: "INV-0003", invoicedOn: "2026-10-09", createdAt: "", updatedAt: "",
  lineItems: [{ id: "1", kind: "labour", description: "Labour", quantity: 1, unitPricePence: 8000, hourly: true }],
};

test("invoice email: job and number in the subject, total, due date and payment reference in the body", () => {
  const { subject, body } = buildDocumentEmail("invoice", job, customer, settings);
  assert.equal(subject, "Invoice INV-0003 - Boiler service - J Bloggs Plumbing");
  assert.match(body, /^Hi Mrs Smith,/);
  assert.match(body, /attached invoice INV-0003 for boiler service/);
  assert.match(body, /Total due: £80\.00, by 23\/10\/2026/);
  assert.match(body, /Account 12345678\nPlease use INV-0003 as the reference/);
  assert.match(body, /Thanks,\nJ Bloggs Plumbing\n07700 900123$/);
});

test("quote and paid-receipt emails", () => {
  const quote = buildDocumentEmail("quote", { ...job, status: "quote" }, customer, settings);
  assert.equal(quote.subject, "Quote QUO-AB12CD - Boiler service - J Bloggs Plumbing");
  assert.match(quote.body, /valid until 08\/11\/2026/);
  assert.doesNotMatch(quote.body, /Sort code/);

  const receipt = buildDocumentEmail("invoice", { ...job, status: "paid" }, customer, settings);
  assert.equal(receipt.subject, "Receipt for invoice INV-0003 - Boiler service - J Bloggs Plumbing");
  assert.match(receipt.body, /Thank you for your payment of £80\.00/);
  assert.doesNotMatch(receipt.body, /Sort code/);
});

test("copes with missing name, trading name and bank details", () => {
  const { subject, body } = buildDocumentEmail("invoice", job, undefined, { ...settings, tradingName: "", bankDetails: undefined });
  assert.equal(subject, "Invoice INV-0003 - Boiler service");
  assert.match(body, /^Hi there,/);
  assert.doesNotMatch(body, /Payment details/);
});
