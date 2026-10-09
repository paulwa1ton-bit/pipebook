/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { recentParts, searchParts } from "./partsSearch.ts";
import type { Job, PriceList } from "../types/models";

const job = (date: string, items: Job["lineItems"]): Job => ({
  id: date, customerId: "c", title: "", status: "done", date, lineItems: items, createdAt: "", updatedAt: "",
});

const jobs = [
  job("2026-09-01", [
    { id: "1", kind: "parts", description: "Magnetic filter", quantity: 1, unitPricePence: 9200, costPence: 8000, markupPercent: 15 },
    { id: "2", kind: "parts", description: "Parts & materials", quantity: 1, unitPricePence: 500 },
  ]),
  job("2026-10-01", [
    { id: "3", kind: "parts", description: "magnetic  filter", quantity: 1, unitPricePence: 8500 },
    { id: "4", kind: "labour", description: "Labour", quantity: 2, unitPricePence: 5000, hourly: true },
  ]),
];

const list: PriceList = {
  id: "L1", supplier: "Bradfords", itemCount: 3, importedAt: "", vatAdded: false,
  items: [
    { name: "Worcester Bosch Greenstar 4000 30kW Combi", sku: "WB30I", costPence: 100000 },
    { name: "15mm Isolation Valve", sku: "IV15", costPence: 210 },
    { name: "Fernox TF1 Compact Magnetic Filter 22mm", sku: "TF1", costPence: 7600 },
  ],
};

test("recent parts keep the latest price paid (cost before commission), skip generic lines", () => {
  const recent = recentParts(jobs);
  assert.equal(recent.length, 1);
  assert.equal(recent[0].costPence, 8500);
  assert.equal(recent[0].detail, "2026-10-01");
});

test("search matches every word, ranks recent first and handles product codes", () => {
  const recent = recentParts(jobs);
  const results = searchParts("magnetic filter", recent, [list]);
  assert.deepEqual(results.map((r) => [r.source, r.name]), [
    ["recent", "magnetic  filter"],
    ["priceList", "Fernox TF1 Compact Magnetic Filter 22mm"],
  ]);
  assert.equal(searchParts("30kw combi", recent, [list])[0].sku, "WB30I");
  assert.equal(searchParts("iv15", recent, [list])[0].name, "15mm Isolation Valve");
  assert.deepEqual(searchParts("b", recent, [list]), []);
});
