/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPriceListItems, detectColumns, parseCsv, parsePricePence } from "./priceList.ts";

test("CSV parsing handles quotes, commas in fields, CRLF, BOM and semicolons", () => {
  assert.deepEqual(parseCsv('﻿Code,Description,Price\r\nA1,"Valve, 15mm ""compression""",2.50\r\n'), [
    ["Code", "Description", "Price"],
    ["A1", 'Valve, 15mm "compression"', "2.50"],
  ]);
  assert.deepEqual(parseCsv("a;b\n1;2"), [["a", "b"], ["1", "2"]]);
});

test("prices in all the usual shapes", () => {
  assert.equal(parsePricePence("£1,234.50"), 123450);
  assert.equal(parsePricePence(12.3), 1230);
  assert.equal(parsePricePence("8.995"), 900);
  assert.equal(parsePricePence("POA"), null);
  assert.equal(parsePricePence(""), null);
});

test("finds the header below merchant title rows and prefers the net/trade price", () => {
  const rows = parseCsv([
    "Bradfords Building Supplies - Account price list",
    "Account: 12345,,,,",
    "",
    "Product Code,Product Description,UOM,RRP,Your Price",
    "WB30I,Worcester Bosch Greenstar 4000 30kW Combi,EA,\"£1,450.00\",\"£1,000.00\"",
    "IV15,15mm Isolation Valve,EA,4.20,2.10",
    "DISC,Discontinued line,EA,,POA",
  ].join("\n"));
  const mapping = detectColumns(rows)!;
  assert.deepEqual(mapping, { headerRow: 2, name: 1, price: 4, sku: 0, unit: 2 });
  const out = buildPriceListItems(rows, mapping, { addVat: false });
  assert.deepEqual(out.items, [
    { name: "Worcester Bosch Greenstar 4000 30kW Combi", costPence: 100000, sku: "WB30I", unit: "EA" },
    { name: "15mm Isolation Valve", costPence: 210, sku: "IV15", unit: "EA" },
  ]);
  assert.equal(out.skipped, 1);
});

test("adds 20% VAT for plumbers who aren't VAT registered", () => {
  const rows = parseCsv("Description,Net Price\nCylinder,500.00");
  const out = buildPriceListItems(rows, detectColumns(rows)!, { addVat: true });
  assert.equal(out.items[0].costPence, 60000);
});

test("guesses columns when there's no header row", () => {
  const rows = parseCsv("T15,15mm copper tee,0.89\nE22,22mm copper elbow,1.45\nP15,15mm pipe 3m,12.00");
  assert.deepEqual(detectColumns(rows), { headerRow: null, name: 1, price: 2 });
});

test("gives up rather than guessing wildly on non-price data", () => {
  assert.equal(detectColumns(parseCsv("Name,Phone\nBob,unknown\nSue,n/a")), null);
});
