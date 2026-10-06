// Money is always stored as integer pence to avoid floating-point drift.
// Dates are ISO calendar dates ("YYYY-MM-DD") unless the field ends in "At".

export type LineItemKind = "labour" | "parts" | "other";

export interface LineItem {
  id: string;
  kind: LineItemKind;
  description: string;
  quantity: number;
  unitPricePence: number;
}

export type JobStatus = "quote" | "booked" | "done" | "invoiced" | "paid";

export type ReminderKind = "boiler_service" | "landlord_gas_safety" | "unvented_service";

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  customerId: string;
  title: string;
  status: JobStatus;
  date: string;
  lineItems: LineItem[];
  notes?: string;
  invoiceNumber?: string;
  invoicedOn?: string;
  paidOn?: string;
  // Set when the work is something that comes round every year, so the job
  // spawns a reminder to win the repeat booking.
  reminderKind?: ReminderKind;
  createdAt: string;
  updatedAt: string;
}

// Expense categories line up with the HMRC MTD quarterly update headings so
// the quarterly summary can be submitted without re-categorising.
export type ExpenseCategory =
  | "costOfGoods"
  | "travelCosts"
  | "adminCosts"
  | "premisesRunningCosts"
  | "professionalFees"
  | "otherExpenses";

export interface Expense {
  id: string;
  date: string;
  description: string;
  amountPence: number;
  category: ExpenseCategory;
  updatedAt: string;
}

export interface BusinessSettings {
  tradingName: string;
  hourlyRatePence: number;
  calloutPence: number;
  paymentTermsDays: number;
  nextInvoiceNumber: number;
  bankDetails?: string;
  // Shown in the header of PDF invoices and quotes.
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  gasSafeNumber?: string;
  logoDataUri?: string;
  updatedAt: string;
}

export interface SyncedRecord {
  id: string;
  updatedAt: string;
}
