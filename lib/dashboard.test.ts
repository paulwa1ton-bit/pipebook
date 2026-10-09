/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDashboard, greeting } from "./dashboard.ts";
import type { BusinessSettings, Job } from "../types/models";

const settings: BusinessSettings = {
  tradingName: "J Bloggs", hourlyRatePence: 5000, calloutPence: 6000, paymentTermsDays: 14, nextInvoiceNumber: 1, updatedAt: "",
};
let n = 0;
const job = (status: Job["status"], pence: number, extra: Partial<Job> = {}): Job => ({
  id: `j${++n}`, customerId: "c", title: "", status, date: "2026-10-01", createdAt: "", updatedAt: `2026-10-0${n % 9}`,
  lineItems: [{ id: "l", kind: "other", description: "x", quantity: 1, unitPricePence: pence }], ...extra,
});

test("dashboard tallies money owed (and overdue), quotes, unbilled and booked work", () => {
  const today = "2026-10-20";
  const jobs = [
    job("invoiced", 10000, { invoicedOn: "2026-10-01" }), // due 15/10 -> overdue
    job("invoiced", 5000, { invoicedOn: "2026-10-15" }), // due 29/10
    job("quote", 150000), // not sent
    job("quote", 80000, { quoteSentOn: "2026-09-25" }), // expires 25/10 -> expiring soon
    job("quote", 20000, { quoteSentOn: "2026-10-18" }),
    job("done", 9000),
    job("booked", 40000),
    job("paid", 7000, { paidOn: "2026-10-10" }),
    job("declined", 99999),
  ];
  const d = buildDashboard(jobs, [], [], settings, today);
  assert.deepEqual(d.owed, { count: 2, pence: 15000, overdue: { count: 1, pence: 10000 } });
  assert.deepEqual(d.quotes, { count: 3, pence: 250000, notSent: 1, expiringSoon: 1 });
  assert.deepEqual(d.notInvoiced, { count: 1, pence: 9000 });
  assert.deepEqual(d.booked, { count: 1, pence: 40000 });
  assert.equal(d.quarter.turnoverPence, 7000);
  assert.equal(d.daysToMtdDeadline, 110); // Q3 deadline 7 Feb 2027
  assert.equal(d.recent.length, 3);
});

test("greeting by time of day", () => {
  assert.equal(greeting(new Date(2026, 9, 9, 8)), "Good morning");
  assert.equal(greeting(new Date(2026, 9, 9, 14)), "Good afternoon");
  assert.equal(greeting(new Date(2026, 9, 9, 20)), "Good evening");
});
