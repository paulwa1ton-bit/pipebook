/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeCollection, mergeSettings, reconcileAfterSync } from "./syncMerge.ts";
import type { BusinessSettings } from "../types/models";

const r = (id: string, updatedAt: string, v = id) => ({ id, updatedAt, v });

test("cloud is the truth when nothing is pending", () => {
  const out = mergeCollection([r("a", "1"), r("gone", "1")], [r("a", "2", "a2"), r("new", "1")], {});
  assert.deepEqual(out.merged.map((x) => x.v), ["new", "a2"]);
  assert.deepEqual(out.toUpsert, []);
  assert.deepEqual(out.toDelete, []);
});

test("pending local edits and new records are kept and uploaded", () => {
  const out = mergeCollection([r("fresh", "5"), r("a", "3", "mine")], [r("a", "2", "theirs")], { fresh: "upsert", a: "upsert" });
  assert.deepEqual(out.merged.map((x) => x.v), ["fresh", "mine"]);
  assert.deepEqual(out.toUpsert.map((x) => x.id).sort(), ["a", "fresh"]);
});

test("a newer cloud edit beats an older pending local edit", () => {
  const out = mergeCollection([r("a", "2", "mine")], [r("a", "4", "theirs")], { a: "upsert" });
  assert.deepEqual(out.merged.map((x) => x.v), ["theirs"]);
  assert.deepEqual(out.toUpsert, []);
});

test("pending deletes stay deleted and are pushed", () => {
  const out = mergeCollection([], [r("a", "9"), r("b", "1")], { a: "delete", neverUploaded: "delete" });
  assert.deepEqual(out.merged.map((x) => x.id), ["b"]);
  assert.deepEqual(out.toDelete, ["a"]);
});

const settings = (over: Partial<BusinessSettings>): BusinessSettings => ({
  tradingName: "", hourlyRatePence: 5000, calloutPence: 6000, paymentTermsDays: 14,
  nextInvoiceNumber: 1, updatedAt: "1", ...over,
});

test("settings: invoice counter never goes backwards", () => {
  const out = mergeSettings(settings({ nextInvoiceNumber: 4, updatedAt: "1" }), settings({ nextInvoiceNumber: 9, tradingName: "Cloud", updatedAt: "2" }), true);
  assert.equal(out.merged.nextInvoiceNumber, 9);
  assert.equal(out.merged.tradingName, "Cloud");
  assert.equal(out.needsUpload, false);

  const out2 = mergeSettings(settings({ nextInvoiceNumber: 12, updatedAt: "1" }), settings({ nextInvoiceNumber: 9, updatedAt: "2" }), false);
  assert.equal(out2.merged.nextInvoiceNumber, 12);
  assert.equal(out2.needsUpload, true);
});

test("settings: newer local edit wins and is uploaded; missing cloud copy is uploaded", () => {
  const out = mergeSettings(settings({ tradingName: "Mine", updatedAt: "3" }), settings({ tradingName: "Cloud", updatedAt: "2" }), true);
  assert.equal(out.merged.tradingName, "Mine");
  assert.equal(out.needsUpload, true);
  assert.equal(mergeSettings(settings({}), null, false).needsUpload, true);
});

test("reconcile keeps mid-sync edits, creates and deletes; clears what was synced", () => {
  const merged = [r("a", "2", "a-merged"), r("b", "2"), r("c", "2")];
  const currentLocal = [r("new", "7"), r("a", "6", "a-edited"), r("b", "1"), r("c", "1")];
  const currentPending = {
    old: { op: "upsert" as const, at: "1" },
    new: { op: "upsert" as const, at: "7" },
    a: { op: "upsert" as const, at: "6" },
    c: { op: "delete" as const, at: "6" },
  };
  const out = reconcileAfterSync(merged, currentLocal, currentPending, "5");
  assert.deepEqual(out.records.map((x) => x.v), ["new", "a-edited", "b"]);
  assert.deepEqual(Object.keys(out.pending).sort(), ["a", "c", "new"]);
});
