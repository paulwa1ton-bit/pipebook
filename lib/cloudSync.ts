import { AppState } from "react-native";
import { isFirebaseConfigured } from "@/lib/firebase";
import { CloudWrites, CollectionName, pullAll, pushChanges } from "@/lib/cloudApi";
import { mergeCollection, mergeSettings, reconcileAfterSync, toPendingMap } from "@/lib/syncMerge";
import { useBookStore, SyncedCollection } from "@/store/bookStore";
import type { SyncedRecord } from "@/types/models";

const COLLECTIONS: SyncedCollection[] = ["customers", "jobs", "expenses"];
const DEBOUNCE_MS = 3000;
const RETRY_MS = 60_000;

let running: Promise<void> | null = null;
let rerunRequested = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function describeSyncError(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  if (code === "unavailable" || code === "deadline-exceeded") return "No connection - will back up when you're back online.";
  if (code === "permission-denied") return "Backup was refused - try logging out and in again.";
  return "Backup failed - will retry shortly.";
}

/** Pull from the cloud, merge with local changes, push what's left, apply. */
export function syncNow(): Promise<void> {
  if (running) {
    rerunRequested = true;
    return running;
  }
  running = runSync().finally(() => {
    running = null;
    if (rerunRequested) {
      rerunRequested = false;
      void syncNow();
    }
  });
  return running;
}

async function runSync(): Promise<void> {
  const store = useBookStore.getState();
  const account = store.account;
  if (!isFirebaseConfigured || !account) return;

  if (retryTimer) clearTimeout(retryTimer);
  const startedAt = new Date().toISOString();
  const snapshot = useBookStore.getState();
  store.setSyncStatus("syncing");

  try {
    const remote = await pullAll(account.uid);

    const writes: CloudWrites = { upserts: [], deletes: [] };
    const merged = {} as Record<SyncedCollection, SyncedRecord[]>;
    for (const name of COLLECTIONS) {
      const result = mergeCollection<SyncedRecord>(
        snapshot[name], remote[name], toPendingMap(snapshot.pending[name]),
      );
      merged[name] = result.merged;
      writes.upserts.push(...result.toUpsert.map((record) => ({ name: name as CollectionName, record })));
      writes.deletes.push(...result.toDelete.map((id) => ({ name: name as CollectionName, id })));
    }

    const settingsMerge = mergeSettings(snapshot.settings, remote.settings, snapshot.settingsDirty);
    if (settingsMerge.needsUpload) writes.settings = settingsMerge.merged;

    await pushChanges(account.uid, writes);

    // The user may have kept working while we were on the network.
    const current = useBookStore.getState();
    if (current.account?.uid !== account.uid) return; // logged out mid-sync
    const out = {} as Record<SyncedCollection, ReturnType<typeof reconcileAfterSync<SyncedRecord>>>;
    for (const name of COLLECTIONS) {
      out[name] = reconcileAfterSync<SyncedRecord>(merged[name], current[name], current.pending[name], startedAt);
    }
    const settingsChangedMidSync = current.settings.updatedAt >= startedAt;
    current.applySync({
      uid: account.uid,
      customers: out.customers.records as typeof current.customers,
      jobs: out.jobs.records as typeof current.jobs,
      expenses: out.expenses.records as typeof current.expenses,
      pending: { customers: out.customers.pending, jobs: out.jobs.pending, expenses: out.expenses.pending },
      settings: settingsChangedMidSync
        ? { ...current.settings, nextInvoiceNumber: Math.max(current.settings.nextInvoiceNumber, settingsMerge.merged.nextInvoiceNumber) }
        : settingsMerge.merged,
      settingsDirty: settingsChangedMidSync,
    });
  } catch (err) {
    console.warn("[cloudSync] sync failed:", err);
    useBookStore.getState().setSyncStatus("error", describeSyncError(err));
    retryTimer = setTimeout(() => void syncNow(), RETRY_MS);
  }
}

export function scheduleSync(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => void syncNow(), DEBOUNCE_MS);
}

export function pendingChangeCount(): number {
  const { pending, settingsDirty } = useBookStore.getState();
  return COLLECTIONS.reduce((n, name) => n + Object.keys(pending[name]).length, 0) + (settingsDirty ? 1 : 0);
}

/** Back up shortly after any change, and whenever the app comes to the foreground. */
export function startAutoSync(): () => void {
  const unsubStore = useBookStore.subscribe((state, prev) => {
    if (state.pending !== prev.pending || state.settings !== prev.settings) scheduleSync();
  });
  const appStateSub = AppState.addEventListener("change", (s) => {
    if (s === "active") void syncNow();
  });
  void syncNow();
  return () => {
    unsubStore();
    appStateSub.remove();
  };
}
