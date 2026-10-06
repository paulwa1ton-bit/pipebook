import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { v4 as uuidv4 } from "uuid";
import type {
  BusinessSettings, Customer, Expense, Job, JobStatus, LineItem,
} from "@/types/models";
import type { QuickEntryDraft } from "@/lib/quickEntry";
import { formatInvoiceNumber } from "@/lib/invoice";
import { todayIso } from "@/lib/dates";

// Local-first: everything lives on the phone so it works in lofts and
// basements with no signal. Cloud sync/backup gets layered on later.

interface BookState {
  customers: Customer[];
  jobs: Job[];
  expenses: Expense[];
  settings: BusinessSettings;

  addJobFromDraft: (draft: QuickEntryDraft, status?: JobStatus) => Job;
  updateJob: (id: string, patch: Partial<Job>) => void;
  deleteJob: (id: string) => void;
  addLineItem: (jobId: string, item: Omit<LineItem, "id">) => void;
  removeLineItem: (jobId: string, lineItemId: string) => void;
  markInvoiced: (jobId: string) => void;
  markPaid: (jobId: string) => void;

  updateCustomer: (id: string, patch: Partial<Customer>) => void;

  addExpense: (input: Omit<Expense, "id">) => void;
  deleteExpense: (id: string) => void;

  updateSettings: (patch: Partial<BusinessSettings>) => void;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  tradingName: "",
  hourlyRatePence: 5000,
  calloutPence: 6000,
  paymentTermsDays: 14,
  nextInvoiceNumber: 1,
};

export const useBookStore = create<BookState>()(
  persist(
    (set, get) => ({
      customers: [],
      jobs: [],
      expenses: [],
      settings: DEFAULT_SETTINGS,

      addJobFromDraft: (draft, status = "done") => {
        const name = draft.customerName.trim() || "New customer";
        let customer = get().customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (!customer) {
          customer = { id: uuidv4(), name, createdAt: new Date().toISOString() };
          set((s) => ({ customers: [...s.customers, customer!] }));
        }
        const job: Job = {
          id: uuidv4(),
          customerId: customer.id,
          title: draft.title || "Job",
          status,
          date: todayIso(),
          lineItems: draft.lineItems.map((li) => ({ ...li, id: uuidv4() })),
          reminderKind: draft.reminderKind,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ jobs: [job, ...s.jobs] }));
        return job;
      },

      updateJob: (id, patch) =>
        set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)) })),

      deleteJob: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),

      addLineItem: (jobId, item) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId ? { ...j, lineItems: [...j.lineItems, { ...item, id: uuidv4() }] } : j,
          ),
        })),

      removeLineItem: (jobId, lineItemId) =>
        set((s) => ({
          jobs: s.jobs.map((j) =>
            j.id === jobId ? { ...j, lineItems: j.lineItems.filter((li) => li.id !== lineItemId) } : j,
          ),
        })),

      markInvoiced: (jobId) => {
        const job = get().jobs.find((j) => j.id === jobId);
        if (!job || job.invoiceNumber) {
          get().updateJob(jobId, { status: "invoiced" });
          return;
        }
        const n = get().settings.nextInvoiceNumber;
        set((s) => ({
          settings: { ...s.settings, nextInvoiceNumber: n + 1 },
          jobs: s.jobs.map((j) =>
            j.id === jobId
              ? { ...j, status: "invoiced", invoiceNumber: formatInvoiceNumber(n), invoicedOn: todayIso() }
              : j,
          ),
        }));
      },

      markPaid: (jobId) => get().updateJob(jobId, { status: "paid", paidOn: todayIso() }),

      updateCustomer: (id, patch) =>
        set((s) => ({ customers: s.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

      addExpense: (input) => set((s) => ({ expenses: [{ ...input, id: uuidv4() }, ...s.expenses] })),

      deleteExpense: (id) => set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    { name: "pipebook-book", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
