/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildReminders } from "./reminders.ts";
import { addMonths } from "./dates.ts";
import type { Job } from "../types/models";

const job = (id: string, date: string, extra: Partial<Job> = {}): Job => ({
  id, customerId: "c1", title: "Boiler service", status: "paid", date,
  lineItems: [], createdAt: "", reminderKind: "boiler_service", ...extra,
});

test("addMonths clamps to month end", () => {
  assert.equal(addMonths("2024-02-29", 12), "2025-02-28");
  assert.equal(addMonths("2026-11-15", 3), "2027-02-15");
});

test("latest job of a kind supersedes older ones and urgency is computed", () => {
  const reminders = buildReminders(
    [job("old", "2024-10-01"), job("new", "2025-10-20"), job("quote", "2026-01-01", { status: "quote" })],
    [{ id: "c1", name: "Mr Patel", createdAt: "" }],
    "2026-10-06",
  );
  assert.equal(reminders.length, 1);
  assert.equal(reminders[0].jobId, "new");
  assert.equal(reminders[0].dueDate, "2026-10-20");
  assert.equal(reminders[0].urgency, "due_soon");
  assert.equal(reminders[0].customerName, "Mr Patel");
});

test("overdue when past due", () => {
  const [r] = buildReminders([job("a", "2025-09-01")], [], "2026-10-06");
  assert.equal(r.urgency, "overdue");
});
