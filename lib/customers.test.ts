/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { addressFirstLine, customerSummary, searchCustomers } from "./customers.ts";
import type { Customer, Job } from "../types/models";

const c = (id: string, name: string, extra: Partial<Customer> = {}): Customer => ({ id, name, createdAt: "", updatedAt: "", ...extra });
const customers = [
  c("2", "Mrs Smith", { address: "12 Park Road\nLeeds LS6 1AA", phone: "07700 900123", email: "smith@example.com" }),
  c("1", "Mr Khan", { address: "8 Oak Avenue, Leeds LS8 2BB", phone: "0113 496 0000" }),
  c("3", "Bob Jones"),
];

test("search by name, street, postcode with or without a space, phone, email; sorted A-Z", () => {
  assert.deepEqual(searchCustomers(customers, "").map((x) => x.name), ["Bob Jones", "Mr Khan", "Mrs Smith"]);
  assert.deepEqual(searchCustomers(customers, "smith").map((x) => x.id), ["2"]);
  assert.deepEqual(searchCustomers(customers, "oak").map((x) => x.id), ["1"]);
  assert.deepEqual(searchCustomers(customers, "ls61aa").map((x) => x.id), ["2"]);
  assert.deepEqual(searchCustomers(customers, "LS8 2BB").map((x) => x.id), ["1"]);
  assert.deepEqual(searchCustomers(customers, "07700900123").map((x) => x.id), ["2"]);
  assert.deepEqual(searchCustomers(customers, "example.com").map((x) => x.id), ["2"]);
  assert.deepEqual(searchCustomers(customers, "zzz"), []);
});

test("summary counts jobs, open quotes and money owed", () => {
  const job = (status: Job["status"], date: string, pence: number): Job => ({
    id: date + status, customerId: "2", title: "", status, date, createdAt: "", updatedAt: "",
    lineItems: [{ id: "l", kind: "other", description: "x", quantity: 1, unitPricePence: pence }],
  });
  const s = customerSummary([job("invoiced", "2026-09-01", 12000), job("quote", "2026-10-01", 50000), job("paid", "2026-08-01", 9000)], "2");
  assert.deepEqual(s, { jobCount: 3, openQuotes: 1, owedPence: 12000, lastJobDate: "2026-10-01" });
  assert.deepEqual(customerSummary([], "2"), { jobCount: 0, openQuotes: 0, owedPence: 0, lastJobDate: undefined });
});

test("first line of address", () => {
  assert.equal(addressFirstLine("12 Park Road\nLeeds"), "12 Park Road");
  assert.equal(addressFirstLine("8 Oak Avenue, Leeds"), "8 Oak Avenue");
  assert.equal(addressFirstLine(undefined), "");
});
