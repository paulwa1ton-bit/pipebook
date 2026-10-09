/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuickEntry } from "./quickEntry.ts";

const rates = { hourlyRatePence: 5000, calloutPence: 6000 };

test("parses the canonical dictated note", () => {
  const draft = parseQuickEntry("Mrs Smith, replaced kitchen tap, 1 hour, £85 parts", rates);
  assert.equal(draft.customerName, "Mrs Smith");
  assert.equal(draft.title, "Replaced kitchen tap");
  assert.deepEqual(draft.lineItems, [
    { kind: "labour", description: "Labour", quantity: 1, unitPricePence: 5000, hourly: true },
    { kind: "parts", description: "Parts & materials", quantity: 1, unitPricePence: 8500 },
  ]);
  assert.equal(draft.reminderKind, undefined);
});

test("handles word hours, minutes, call-out and spoken pounds", () => {
  const draft = parseQuickEntry("Dave Jones, leaking radiator valve, call out, an hour 30 mins, 12.50 pounds parts", rates);
  assert.deepEqual(draft.lineItems, [
    { kind: "labour", description: "Call-out", quantity: 1, unitPricePence: 6000 },
    { kind: "labour", description: "Labour", quantity: 1.5, unitPricePence: 5000, hourly: true },
    { kind: "parts", description: "Parts & materials", quantity: 1, unitPricePence: 1250 },
  ]);
});

test("named priced items become their own lines", () => {
  const draft = parseQuickEntry("Flat 3, new TRV, £24 thermostatic valve, labour £40", rates);
  assert.deepEqual(draft.lineItems, [
    { kind: "parts", description: "Thermostatic valve", quantity: 1, unitPricePence: 2400 },
    { kind: "labour", description: "Labour", quantity: 1, unitPricePence: 4000 },
  ]);
});

test("flags annual work for a reminder", () => {
  assert.equal(parseQuickEntry("Mr Patel, boiler service, £80 labour", rates).reminderKind, "boiler_service");
  assert.equal(parseQuickEntry("12 High St, landlord CP12, £70 labour", rates).reminderKind, "landlord_gas_safety");
  assert.equal(parseQuickEntry("Ann, unvented cylinder check, 1h", rates).reminderKind, "unvented_service");
});

test("commission is added to supplied parts but not labour", () => {
  const draft = parseQuickEntry("Mr Khan, new combi boiler, 4 hours, £1000 boiler, £60 parts", { ...rates, markupPercent: 15 });
  assert.deepEqual(draft.lineItems, [
    { kind: "labour", description: "Labour", quantity: 4, unitPricePence: 5000, hourly: true },
    { kind: "parts", description: "Boiler", quantity: 1, unitPricePence: 115000, costPence: 100000, markupPercent: 15 },
    { kind: "parts", description: "Parts & materials", quantity: 1, unitPricePence: 6900, costPence: 6000, markupPercent: 15 },
  ]);
});
