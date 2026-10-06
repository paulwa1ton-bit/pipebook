/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { quarterFor, summariseQuarter, taxYearStartFor } from "./taxQuarters.ts";
import type { Expense, Job } from "../types/models";

test("tax year boundary is 6 April", () => {
  assert.equal(taxYearStartFor("2027-04-05"), 2026);
  assert.equal(taxYearStartFor("2027-04-06"), 2027);
});

test("quarters and deadlines", () => {
  assert.deepEqual(quarterFor("2026-10-06"), {
    taxYear: "2026-27", quarter: 3, start: "2026-10-06", end: "2027-01-05", deadline: "2027-02-07",
  });
  assert.equal(quarterFor("2027-01-05").quarter, 3);
  assert.equal(quarterFor("2027-01-06").quarter, 4);
  assert.equal(quarterFor("2026-07-05").quarter, 1);
});

test("summary counts income when paid (cash basis) and buckets expenses", () => {
  const job = (id: string, paidOn: string | undefined, status: Job["status"]): Job => ({
    id, customerId: "c", title: "t", status, date: "2026-06-01", createdAt: "",
    paidOn, lineItems: [{ id: "l", kind: "labour", description: "x", quantity: 2, unitPricePence: 5000 }],
  });
  const jobs = [
    job("paid-in-q2", "2026-07-10", "paid"),
    job("paid-in-q1", "2026-07-05", "paid"),
    job("invoiced-only", undefined, "invoiced"),
  ];
  const expenses: Expense[] = [
    { id: "e1", date: "2026-08-01", description: "Fittings", amountPence: 3000, category: "costOfGoods" },
    { id: "e2", date: "2026-09-01", description: "Diesel", amountPence: 2000, category: "travelCosts" },
    { id: "e3", date: "2026-10-06", description: "Next quarter", amountPence: 999, category: "otherExpenses" },
  ];
  const s = summariseQuarter(quarterFor("2026-08-01"), jobs, expenses);
  assert.equal(s.paidJobCount, 1);
  assert.equal(s.turnoverPence, 10000);
  assert.equal(s.expensesPence, 5000);
  assert.equal(s.expensesByCategory.costOfGoods, 3000);
  assert.equal(s.profitPence, 5000);
});
