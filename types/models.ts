// Money is always stored as integer pence to avoid floating-point drift.
// Dates are ISO calendar dates ("YYYY-MM-DD") unless the field ends in "At".

export type LineItemKind = "labour" | "parts" | "other";

export interface LineItem {
  id: string;
  kind: LineItemKind;
  description: string;
  quantity: number;
  // What the customer is charged per unit. Always the source of truth for totals.
  unitPricePence: number;
  // Labour charged by the hour: quantity is hours and unitPricePence the hourly
  // rate, so changing the job's rate re-prices these lines.
  hourly?: boolean;
  // Parts with commission: what the plumber paid per unit, and the % added on
  // top. Never shown to the customer.
  costPence?: number;
  markupPercent?: number;
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
  // Rate for this job's hourly labour; falls back to the settings rate.
  hourlyRatePence?: number;
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
  // Commission on parts the plumber supplies (sourcing, handling, warranty).
  markupEnabled?: boolean;
  markupPercent?: number;
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

// A supplier price list the plumber imported (CSV/Excel from their merchant).
// Prices are what the plumber pays per unit, after any VAT adjustment at import.
export interface PriceListItem {
  name: string;
  sku?: string;
  costPence: number;
  unit?: string;
}

export interface PriceListMeta {
  id: string;
  supplier: string;
  itemCount: number;
  importedAt: string;
  vatAdded: boolean;
  fileName?: string;
}

export interface PriceList extends PriceListMeta {
  items: PriceListItem[];
}

export interface SyncedRecord {
  id: string;
  updatedAt: string;
}
