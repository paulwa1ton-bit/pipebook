/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDocumentHtml, documentFileName, quoteReference } from "./documentHtml.ts";
import type { BusinessSettings, Customer, Job } from "../types/models";

const settings: BusinessSettings = {
  tradingName: "Bloggs & Son Plumbing", hourlyRatePence: 5000, calloutPence: 6000, paymentTermsDays: 14,
  nextInvoiceNumber: 2, bankDetails: "J Bloggs 12-34-56 12345678", gasSafeNumber: "123456", updatedAt: "",
};
const customer: Customer = { id: "c", name: "Mrs O'Neil", address: "1 High St", createdAt: "", updatedAt: "" };
const job: Job = {
  id: "abcdef12-3456", customerId: "c", title: "Replace <tap>", status: "invoiced", date: "2026-10-01",
  invoiceNumber: "INV-0001", invoicedOn: "2026-10-02", createdAt: "", updatedAt: "",
  lineItems: [
    { id: "1", kind: "labour", description: "Labour", quantity: 1.5, unitPricePence: 5000 },
    { id: "2", kind: "parts", description: "Parts & materials", quantity: 1, unitPricePence: 8500 },
  ],
};

test("invoice shows totals, due date, payment box and escapes text", () => {
  const html = buildDocumentHtml("invoice", job, customer, settings);
  assert.match(html, /INVOICE/);
  assert.match(html, /INV-0001/);
  assert.match(html, /£160\.00/);
  assert.match(html, /1\.5 hrs/);
  assert.match(html, /Due: 16\/10\/2026/);
  assert.match(html, /How to pay/);
  assert.match(html, /Gas Safe reg\. 123456/);
  assert.match(html, /Replace &lt;tap&gt;/);
  assert.match(html, /Bloggs &amp; Son/);
  assert.doesNotMatch(html, /PAID/);
});

test("paid invoice is stamped and drops the payment box", () => {
  const html = buildDocumentHtml("invoice", { ...job, status: "paid", paidOn: "2026-10-05" }, customer, settings);
  assert.match(html, /PAID 05\/10\/2026/);
  assert.doesNotMatch(html, /How to pay/);
});

test("quote has its own reference, validity and no payment box", () => {
  const html = buildDocumentHtml("quote", { ...job, status: "quote" }, customer, settings);
  assert.equal(quoteReference(job), "QUO-ABCDEF");
  assert.match(html, /QUOTE/);
  assert.match(html, /Valid until: 31\/10\/2026/);
  assert.doesNotMatch(html, /How to pay/);
});

test("file names are filesystem-safe", () => {
  assert.equal(documentFileName("invoice", job, customer), "INV-0001_Mrs-O-Neil.pdf");
  assert.equal(documentFileName("quote", job, undefined), "QUO-ABCDEF.pdf");
});
