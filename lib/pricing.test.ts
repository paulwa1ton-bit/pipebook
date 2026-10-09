/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  activeMarkupPercent, applyMarkup, hourlyLabourLine, markupEarnedPence, partsLine, repriceHourly, withMarkup,
} from "./pricing.ts";
import { jobTotalPence } from "./money.ts";

test("markup maths rounds to the penny", () => {
  assert.equal(applyMarkup(100000, 15), 115000);
  assert.equal(applyMarkup(1999, 12.5), 2249);
});

test("markup only applies when switched on", () => {
  assert.equal(activeMarkupPercent({ markupEnabled: false, markupPercent: 20 }), undefined);
  assert.equal(activeMarkupPercent({ markupEnabled: true, markupPercent: 20 }), 20);
  assert.equal(activeMarkupPercent({ markupEnabled: true }), 15);
});

test("a £1000 boiler with 15% commission is charged at £1150", () => {
  const boiler = partsLine("Combi boiler", 100000, 15);
  assert.deepEqual(boiler, {
    kind: "parts", description: "Combi boiler", quantity: 1, unitPricePence: 115000, costPence: 100000, markupPercent: 15,
  });
  assert.deepEqual(partsLine("Valve", 2400), { kind: "parts", description: "Valve", quantity: 1, unitPricePence: 2400 });
});

test("commission can be switched off and on again per line without losing the cost", () => {
  const on = partsLine("Combi boiler", 100000, 15);
  const off = withMarkup(on, undefined);
  assert.equal(off.unitPricePence, 100000);
  assert.equal(off.costPence, undefined);
  assert.equal(withMarkup(off, 20).unitPricePence, 120000);
  assert.equal(withMarkup(on, 10).unitPricePence, 110000);
  // Applied as a patch over the stored line (how the app saves it), commission must really be gone.
  const patched = { ...on, ...withMarkup(on, undefined) };
  assert.equal(patched.markupPercent, undefined);
  assert.equal(markupEarnedPence([{ id: "x", ...patched }]), 0);
});

test("changing the job rate re-prices hourly labour only", () => {
  const items = [
    { id: "1", ...hourlyLabourLine(4, 5000) },
    { id: "2", kind: "labour" as const, description: "Call-out", quantity: 1, unitPricePence: 6000 },
    { id: "3", ...partsLine("Boiler", 100000, 15) },
  ];
  assert.equal(jobTotalPence(items), 20000 + 6000 + 115000);
  const repriced = repriceHourly(items, 6500);
  assert.equal(repriced[0].unitPricePence, 6500);
  assert.equal(repriced[1].unitPricePence, 6000);
  assert.equal(jobTotalPence(repriced), 26000 + 6000 + 115000);
  assert.equal(markupEarnedPence(repriced), 15000);
});
