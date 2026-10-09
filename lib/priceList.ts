import type { PriceListItem } from "../types/models";

// Turning a merchant's price list (CSV or Excel, every one laid out a bit
// differently) into searchable parts. Merchants' exports often start with
// title/address rows, so we hunt for the header row, then guess which columns
// hold the description, price, code and unit. The import screen shows the
// guess and lets the plumber correct it.

export type Cell = string | number | boolean | Date | null | undefined;
export type Row = Cell[];

export const MAX_PRICE_LIST_ITEMS = 20_000;
export const UK_VAT_PERCENT = 20;

/** RFC 4180-ish CSV: quoted fields, escaped quotes, commas/newlines inside quotes, ; or tab separators. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length] as const);
  const delimiter = counts.sort((a, b) => b[1] - a[1])[0][0];

  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** "£1,234.50", "1234.5", 12.3, "12.30 GBP" -> pence. Null if not a price. */
// 8.995 * 100 is 899.4999... in floating point; trim the noise before rounding.
const toPence = (pounds: number) => Math.round(Number((pounds * 100).toFixed(6)));

export function parsePricePence(cell: Cell): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) && cell >= 0 ? toPence(cell) : null;
  if (typeof cell !== "string") return null;
  const cleaned = cell.replace(/[£,\s]|GBP/gi, "");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  return toPence(parseFloat(cleaned));
}

function text(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  return String(cell).trim();
}

const HEADER_PATTERNS = {
  name: /^(product |item |part )?(description|desc|name|product|item|details)$|description/i,
  price: /(net|trade|your|unit|nett|sell|buy|cost|list)?\s*(price|cost|rate)|^(net|nett|ex vat|price ex\.? vat)$/i,
  sku: /(product|item|part|stock|our|supplier|cat(alogue)?)\s*(code|no\.?|number|ref)|^(sku|code|ref|part ?no\.?|mpn|ean)$/i,
  unit: /^(unit|uom|units|pack( size)?|unit of measure)$/i,
};

// Prefer the price the plumber pays over list/RRP when a list has several.
const PRICE_PREFERENCE = [/your|nett?|trade/i, /ex\.? ?vat/i, /unit|price/i];

export interface ColumnMapping {
  headerRow: number | null; // index of the header row, or null if the file has none
  name: number;
  price: number;
  sku?: number;
  unit?: number;
}

export function columnHeaders(rows: Row[], mapping: Pick<ColumnMapping, "headerRow">): string[] {
  const width = Math.max(0, ...rows.slice(0, 50).map((r) => r.length));
  const header = mapping.headerRow !== null ? rows[mapping.headerRow] ?? [] : [];
  return Array.from({ length: width }, (_, i) => text(header[i]) || `Column ${String.fromCharCode(65 + (i % 26))}`);
}

export function detectColumns(rows: Row[]): ColumnMapping | null {
  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const cells = rows[r].map(text);
    const name = cells.findIndex((c) => HEADER_PATTERNS.name.test(c));
    const priceCandidates = cells
      .map((c, i) => ({ c, i }))
      .filter(({ c, i }) => i !== name && HEADER_PATTERNS.price.test(c) && !/rrp|retail|inc\.? ?vat|vat amount|qty|quantity/i.test(c));
    if (name < 0 || priceCandidates.length === 0) continue;
    const preferred =
      PRICE_PREFERENCE.map((re) => priceCandidates.find(({ c }) => re.test(c))).find(Boolean) ?? priceCandidates[0];
    const sku = cells.findIndex((c, i) => i !== name && HEADER_PATTERNS.sku.test(c));
    const unit = cells.findIndex((c, i) => i !== name && HEADER_PATTERNS.unit.test(c));
    return { headerRow: r, name, price: preferred.i, sku: sku >= 0 ? sku : undefined, unit: unit >= 0 ? unit : undefined };
  }
  return guessWithoutHeader(rows);
}

// No recognisable header: the price is the column that is most often a
// number, the description the one with the longest text.
function guessWithoutHeader(rows: Row[]): ColumnMapping | null {
  const sample = rows.slice(0, 50);
  const width = Math.max(0, ...sample.map((r) => r.length));
  if (width < 2) return null;
  const score = (i: number, fn: (c: Cell) => number) => sample.reduce((s, r) => s + fn(r[i]), 0);
  const cols = Array.from({ length: width }, (_, i) => i);
  const isPrice = (c: Cell) => (parsePricePence(c) !== null ? 1 : 0);
  const textLength = (c: Cell) => (parsePricePence(c) === null ? text(c).length : 0);
  const best = (candidates: number[], fn: (c: Cell) => number) =>
    candidates.reduce((top, i) => (score(i, fn) > score(top, fn) ? i : top), candidates[0]);
  const price = best(cols, isPrice);
  const name = best(cols.filter((i) => i !== price), textLength);
  if (score(price, isPrice) < sample.length / 2) return null;
  return { headerRow: null, name, price };
}

export interface BuildResult {
  items: PriceListItem[];
  skipped: number;
  truncated: boolean;
}

export function buildPriceListItems(rows: Row[], mapping: ColumnMapping, opts: { addVat: boolean }): BuildResult {
  const items: PriceListItem[] = [];
  let skipped = 0;
  const start = mapping.headerRow === null ? 0 : mapping.headerRow + 1;
  for (const row of rows.slice(start)) {
    const name = text(row[mapping.name]).replace(/\s+/g, " ");
    const price = parsePricePence(row[mapping.price]);
    if (!name || price === null || price === 0) {
      skipped++;
      continue;
    }
    if (items.length >= MAX_PRICE_LIST_ITEMS) return { items, skipped, truncated: true };
    const sku = mapping.sku !== undefined ? text(row[mapping.sku]) : "";
    const unit = mapping.unit !== undefined ? text(row[mapping.unit]) : "";
    items.push({
      name,
      costPence: opts.addVat ? Math.round(price * (1 + UK_VAT_PERCENT / 100)) : price,
      ...(sku ? { sku } : {}),
      ...(unit ? { unit } : {}),
    });
  }
  return { items, skipped, truncated: false };
}
