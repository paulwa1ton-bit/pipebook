/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { acceptQuotePatch, changeSinceQuote, quoteState, quoteValidUntil } from "./quotes.ts";
import type { Job } from "../types/models";

const quote: Job = {
  id: "q1", customerId: "c", title: "New combi boiler", status: "quote", date: "2026-10-01", createdAt: "", updatedAt: "",
  lineItems: [
    { id: "1", kind: "labour", description: "Labour", quantity: 8, unitPricePence: 5000, hourly: true },
    { id: "2", kind: "parts", description: "Boiler", quantity: 1, unitPricePence: 115000, costPence: 100000, markupPercent: 15 },
  ],
};

test("validity runs from when the quote was sent, using the plumber's setting", () => {
  assert.equal(quoteValidUntil(quote, {}), "2026-10-31");
  assert.equal(quoteValidUntil({ ...quote, quoteSentOn: "2026-10-05" }, { quoteValidDays: 14 }), "2026-10-19");
});

test("quote state: draft, sent with days left, expired", () => {
  assert.deepEqual(quoteState(quote, "2026-10-09", {}), { kind: "draft" });
  const sent = { ...quote, quoteSentOn: "2026-10-05" };
  assert.deepEqual(quoteState(sent, "2026-10-09", {}), { kind: "sent", validUntil: "2026-11-04", daysLeft: 26 });
  assert.deepEqual(quoteState(sent, "2026-11-05", {}), { kind: "expired", validUntil: "2026-11-04" });
});

test("accepting keeps the charges and records what was quoted", () => {
  assert.deepEqual(acceptQuotePatch(quote, "2026-10-09", false), {
    status: "booked", quoteAcceptedOn: "2026-10-09", quotedTotalPence: 155000,
  });
  assert.deepEqual(acceptQuotePatch(quote, "2026-10-09", true), {
    status: "done", quoteAcceptedOn: "2026-10-09", quotedTotalPence: 155000, date: "2026-10-09",
  });
});

test("tracks how far the bill has moved from the quote", () => {
  assert.equal(changeSinceQuote(quote), null);
  const accepted = { ...quote, ...acceptQuotePatch(quote, "2026-10-09", false) };
  assert.equal(changeSinceQuote(accepted), 0);
  const extraHour = { ...accepted, lineItems: [{ ...accepted.lineItems[0], quantity: 9 }, accepted.lineItems[1]] };
  assert.equal(changeSinceQuote(extraHour), 5000);
});
