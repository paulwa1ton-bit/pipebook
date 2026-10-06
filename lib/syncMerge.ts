import type { BusinessSettings, SyncedRecord } from "../types/models";

// Local-first sync. The phone keeps a list of records changed since the last
// successful sync ("pending"). When we sync we pull the cloud copy and merge:
//   - a record with a pending local delete stays deleted
//   - a record with a pending local edit keeps the local copy, unless the cloud
//     copy is newer (edited later on another device), in which case the cloud wins
//   - otherwise the cloud copy is the truth, including records that are gone
//     from the cloud because another device deleted them
// The merge also says which pending changes still need writing to the cloud.

export type PendingOp = "upsert" | "delete";
export type PendingMap = Record<string, PendingOp>;

export interface MergeResult<T> {
  merged: T[];
  toUpsert: T[];
  toDelete: string[];
}

export function mergeCollection<T extends SyncedRecord>(local: T[], remote: T[], pending: PendingMap): MergeResult<T> {
  const localById = new Map(local.map((r) => [r.id, r]));
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const merged = new Map<string, T>();
  const toUpsert: T[] = [];
  const toDelete: string[] = [];

  for (const r of remote) {
    if (pending[r.id] !== "delete") merged.set(r.id, r);
  }

  for (const [id, op] of Object.entries(pending)) {
    if (op === "delete") {
      if (remoteById.has(id)) toDelete.push(id);
      continue;
    }
    const mine = localById.get(id);
    if (!mine) continue;
    const theirs = remoteById.get(id);
    if (theirs && theirs.updatedAt > mine.updatedAt) continue;
    merged.set(id, mine);
    toUpsert.push(mine);
  }

  return { merged: orderLike(local, [...merged.values()]), toUpsert, toDelete };
}

// Keep the user's familiar ordering. Records new to this phone (added on
// another device) go on top, newest first, matching how new jobs are prepended.
function orderLike<T extends SyncedRecord>(local: T[], records: T[]): T[] {
  const position = new Map(local.map((r, i) => [r.id, i]));
  return records.sort((a, b) => {
    const pa = position.get(a.id);
    const pb = position.get(b.id);
    if (pa !== undefined && pb !== undefined) return pa - pb;
    if (pa !== undefined) return 1;
    if (pb !== undefined) return -1;
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

// Settings: newest wins, except the invoice counter which must never go
// backwards or two devices could issue the same invoice number.
export function mergeSettings(
  local: BusinessSettings,
  remote: BusinessSettings | null,
  localDirty: boolean,
): { merged: BusinessSettings; needsUpload: boolean } {
  if (!remote) return { merged: local, needsUpload: true };
  const nextInvoiceNumber = Math.max(local.nextInvoiceNumber, remote.nextInvoiceNumber);
  const localWins = localDirty && local.updatedAt >= remote.updatedAt;
  const base = localWins ? local : remote;
  const merged = { ...base, nextInvoiceNumber };
  return { merged, needsUpload: localWins || nextInvoiceNumber !== remote.nextInvoiceNumber };
}

// Applying a finished sync to the store. Anything the user changed while the
// sync was in flight (updatedAt / pending time at or after startedAt) wins over
// the merged result and stays pending for the next round; everything else
// pending at the start was either uploaded or superseded, so it's cleared.
export interface PendingEntry {
  op: PendingOp;
  at: string;
}
export type PendingLog = Record<string, PendingEntry>;

export function toPendingMap(log: PendingLog): PendingMap {
  return Object.fromEntries(Object.entries(log).map(([id, e]) => [id, e.op]));
}

export function reconcileAfterSync<T extends SyncedRecord>(
  merged: T[],
  currentLocal: T[],
  currentPending: PendingLog,
  startedAt: string,
): { records: T[]; pending: PendingLog } {
  const pending: PendingLog = {};
  for (const [id, entry] of Object.entries(currentPending)) {
    if (entry.at >= startedAt) pending[id] = entry;
  }

  const fresh = new Map(
    currentLocal.filter((r) => pending[r.id]?.op === "upsert").map((r) => [r.id, r]),
  );
  const deleted = (id: string) => pending[id]?.op === "delete";

  // Merged order, with mid-sync edits swapped in; records created mid-sync
  // (not in the merged set) go on top in their local order.
  const mergedIds = new Set(merged.map((r) => r.id));
  const records = [
    ...[...fresh.values()].filter((r) => !mergedIds.has(r.id)),
    ...merged.filter((r) => !deleted(r.id)).map((r) => fresh.get(r.id) ?? r),
  ];
  return { records, pending };
}
