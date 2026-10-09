import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import type {
  BusinessSettings, Customer, Expense, Job, JobStatus, LineItem,
} from "@/types/models";
import type { QuickEntryDraft } from "@/lib/quickEntry";
import type { PendingLog, PendingOp } from "@/lib/syncMerge";
import { formatInvoiceNumber } from "@/lib/invoice";
import { todayIso } from "@/lib/dates";
import { repriceHourly } from "@/lib/pricing";

// Local-first: everything lives on the phone so it works in lofts and
// basements with no signal. Every change is timestamped and logged in
// `pending` so lib/cloudSync can back it up once there's a connection.

export type SyncedCollection = "customers" | "jobs" | "expenses";

export interface Account {
  uid: string;
  email: string;
}

export type SyncStatus = "idle" | "syncing" | "error";

interface BookState {
  customers: Customer[];
  jobs: Job[];
  expenses: Expense[];
  settings: BusinessSettings;

  // Sync bookkeeping
  pending: Record<SyncedCollection, PendingLog>;
  settingsDirty: boolean;
  account: Account | null;
  lastSyncedUid: string | null;
  lastSyncedAt: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;

  addJobFromDraft: (draft: QuickEntryDraft, status?: JobStatus) => Job;
  updateJob: (id: string, patch: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  addLineItem: (jobId: string, item: Omit<LineItem, "id">) => void;
  removeLineItem: (jobId: string, lineItemId: string) => void;
  updateLineItem: (jobId: string, lineItemId: string, patch: Partial<LineItem>) => void;
  setJobHourlyRate: (jobId: string, ratePence: number) => void;
  markInvoiced: (jobId: string) => void;
  markPaid: (jobId: string) => void;

  updateCustomer: (id: string, patch: Partial<Customer>) => void;

  addExpense: (input: Omit<Expense, "id" | "updatedAt">) => void;
  deleteExpense: (id: string) => void;

  updateSettings: (patch: Partial<BusinessSettings>) => void;

  setAccount: (account: Account | null) => void;
  markEverythingPending: () => void;
  setSyncStatus: (status: SyncStatus, error?: string | null) => void;
  applySync: (result: {
    customers: Customer[];
    jobs: Job[];
    expenses: Expense[];
    pending: Record<SyncedCollection, PendingLog>;
    settings: BusinessSettings;
    settingsDirty: boolean;
    uid: string;
  }) => void;
  clearLocalData: () => void;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  tradingName: "",
  hourlyRatePence: 5000,
  calloutPence: 6000,
  paymentTermsDays: 14,
  nextInvoiceNumber: 1,
  updatedAt: new Date(0).toISOString(),
};

const EMPTY_PENDING: Record<SyncedCollection, PendingLog> = { customers: {}, jobs: {}, expenses: {} };

const now = () => new Date().toISOString();

function logChange(
  pending: Record<SyncedCollection, PendingLog>,
  name: SyncedCollection,
  id: string,
  op: PendingOp,
): Record<SyncedCollection, PendingLog> {
  return { ...pending, [name]: { ...pending[name], [id]: { op, at: now() } } };
}

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => {
      const patchJob = (id: string, patch: Partial<Job>) =>
        set((s) => ({
          jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch, updatedAt: now() } : j)),
          pending: logChange(s.pending, "jobs", id, "upsert"),
        }));

      return {
        customers: [],
        jobs: [],
        expenses: [],
        settings: DEFAULT_SETTINGS,
        pending: EMPTY_PENDING,
        settingsDirty: false,
        account: null,
        lastSyncedUid: null,
        lastSyncedAt: null,
        syncStatus: "idle",
        syncError: null,

        addJobFromDraft: (draft, status = "done") => {
          const name = draft.customerName.trim() || "New customer";
          let customer = get().customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (!customer) {
            const created: Customer = { id: uuidv4(), name, createdAt: now(), updatedAt: now() };
            customer = created;
            set((s) => ({
              customers: [...s.customers, created],
              pending: logChange(s.pending, "customers", created.id, "upsert"),
            }));
          }
          const job: Job = {
            id: uuidv4(),
            customerId: customer.id,
            title: draft.title || "Job",
            status,
            date: todayIso(),
            lineItems: draft.lineItems.map((li) => ({ ...li, id: uuidv4() })),
            // Pin the rate used, so changing the default later doesn't alter this job.
            hourlyRatePence: get().settings.hourlyRatePence,
            reminderKind: draft.reminderKind,
            createdAt: now(),
            updatedAt: now(),
          };
          set((s) => ({ jobs: [job, ...s.jobs], pending: logChange(s.pending, "jobs", job.id, "upsert") }));
          return job;
        },

        updateJob: patchJob,

        deleteJob: (id) =>
          set((s) => ({
            jobs: s.jobs.filter((j) => j.id !== id),
            pending: logChange(s.pending, "jobs", id, "delete"),
          })),

        addLineItem: (jobId, item) => {
          const job = get().jobs.find((j) => j.id === jobId);
          if (job) patchJob(jobId, { lineItems: [...job.lineItems, { ...item, id: uuidv4() }] });
        },

        removeLineItem: (jobId, lineItemId) => {
          const job = get().jobs.find((j) => j.id === jobId);
          if (job) patchJob(jobId, { lineItems: job.lineItems.filter((li) => li.id !== lineItemId) });
        },

        updateLineItem: (jobId, lineItemId, patch) => {
          const job = get().jobs.find((j) => j.id === jobId);
          if (!job) return;
          patchJob(jobId, { lineItems: job.lineItems.map((li) => (li.id === lineItemId ? { ...li, ...patch } : li)) });
        },

        setJobHourlyRate: (jobId, ratePence) => {
          const job = get().jobs.find((j) => j.id === jobId);
          if (job) patchJob(jobId, { hourlyRatePence: ratePence, lineItems: repriceHourly(job.lineItems, ratePence) });
        },

        markInvoiced: (jobId) => {
          const job = get().jobs.find((j) => j.id === jobId);
          if (!job) return;
          if (job.invoiceNumber) {
            patchJob(jobId, { status: "invoiced" });
            return;
          }
          const n = get().settings.nextInvoiceNumber;
          get().updateSettings({ nextInvoiceNumber: n + 1 });
          patchJob(jobId, { status: "invoiced", invoiceNumber: formatInvoiceNumber(n), invoicedOn: todayIso() });
        },

        markPaid: (jobId) => patchJob(jobId, { status: "paid", paidOn: todayIso() }),

        updateCustomer: (id, patch) =>
          set((s) => ({
            customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: now() } : c)),
            pending: logChange(s.pending, "customers", id, "upsert"),
          })),

        addExpense: (input) => {
          const expense: Expense = { ...input, id: uuidv4(), updatedAt: now() };
          set((s) => ({
            expenses: [expense, ...s.expenses],
            pending: logChange(s.pending, "expenses", expense.id, "upsert"),
          }));
        },

        deleteExpense: (id) =>
          set((s) => ({
            expenses: s.expenses.filter((e) => e.id !== id),
            pending: logChange(s.pending, "expenses", id, "delete"),
          })),

        updateSettings: (patch) =>
          set((s) => ({ settings: { ...s.settings, ...patch, updatedAt: now() }, settingsDirty: true })),

        setAccount: (account) => set({ account }),

        // Used when this phone's data first joins an account (e.g. the plumber
        // used the app offline, then created an account): upload all of it.
        markEverythingPending: () =>
          set((s) => {
            const at = now();
            const all = (records: { id: string }[]): PendingLog =>
              Object.fromEntries(records.map((r) => [r.id, { op: "upsert" as const, at }]));
            return {
              pending: {
                customers: { ...all(s.customers), ...s.pending.customers },
                jobs: { ...all(s.jobs), ...s.pending.jobs },
                expenses: { ...all(s.expenses), ...s.pending.expenses },
              },
              settingsDirty: true,
            };
          }),

        setSyncStatus: (syncStatus, syncError = null) => set({ syncStatus, syncError }),

        applySync: ({ uid, ...result }) =>
          set({
            ...result,
            lastSyncedUid: uid,
            lastSyncedAt: now(),
            syncStatus: "idle",
            syncError: null,
          }),

        clearLocalData: () =>
          set({
            customers: [],
            jobs: [],
            expenses: [],
            settings: DEFAULT_SETTINGS,
            pending: EMPTY_PENDING,
            settingsDirty: false,
            account: null,
            lastSyncedUid: null,
            lastSyncedAt: null,
            syncStatus: "idle",
            syncError: null,
          }),
      };
    },
    {
      name: "pipebook-book",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      partialize: ({ syncStatus, syncError, ...rest }) => rest,
      // v0 (first MVP build) had no updatedAt or sync bookkeeping.
      migrate: (persisted, version) => {
        const state = persisted as Record<string, any>;
        if (version < 1) {
          const stamp = <T extends { createdAt?: string }>(r: T) => ({ ...r, updatedAt: r.createdAt ?? now() });
          state.customers = (state.customers ?? []).map(stamp);
          state.jobs = (state.jobs ?? []).map(stamp);
          state.expenses = (state.expenses ?? []).map((e: Expense) => ({ ...e, updatedAt: `${e.date}T00:00:00.000Z` }));
          state.settings = { ...DEFAULT_SETTINGS, ...state.settings, updatedAt: new Date(0).toISOString() };
          state.pending = EMPTY_PENDING;
        }
        if (version < 2) {
          // v1 had no `hourly` flag: plain "Labour" lines were always hours x rate.
          state.jobs = (state.jobs ?? []).map((j: Job) => ({
            ...j,
            lineItems: j.lineItems.map((li) =>
              li.kind === "labour" && li.description === "Labour" ? { ...li, hourly: true } : li),
          }));
        }
        return state as BookState;
      },
    },
  ),
);
