import type { Job, PriceList } from "../types/models";
import type { StandardPart } from "../data/standardParts";

// Suggestions for the "add a part" box: parts the plumber has charged before
// (worked out from their jobs, so nothing extra to store or back up), items
// from imported merchant price lists, and a built-in list of standard parts
// (no price - the plumber fills it in).

export interface PartSuggestion {
  key: string;
  name: string;
  // Undefined for standard parts, which carry no price.
  costPence?: number;
  source: "recent" | "priceList" | "standard";
  // Recent: the date last used. Price list: the supplier name. Standard: a description.
  detail: string;
  sku?: string;
  unit?: string;
}

const GENERIC = /^parts?( & | and )?materials?$/i;

export function normalise(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
}

/** Most recent price paid for each distinct part, newest first. */
export function recentParts(jobs: Job[]): PartSuggestion[] {
  const latest = new Map<string, PartSuggestion & { date: string }>();
  for (const job of jobs) {
    for (const item of job.lineItems) {
      if (item.kind !== "parts" || GENERIC.test(item.description.trim())) continue;
      const key = normalise(item.description);
      if (!key) continue;
      const existing = latest.get(key);
      if (existing && existing.date >= job.date) continue;
      latest.set(key, {
        key: `recent:${key}`,
        name: item.description,
        costPence: item.costPence ?? item.unitPricePence,
        source: "recent",
        detail: job.date,
        date: job.date,
      });
    }
  }
  return [...latest.values()]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(({ date: _d, ...s }) => s);
}

/**
 * Every word typed must appear in the name or code ("30i combi" finds
 * "Worcester Bosch 30i Combi"). Recent parts rank first, then price lists,
 * then standard parts; shorter names (closer matches) first within each, and
 * an exact product code beats everything. A standard part is left out when
 * the plumber already has a priced part of the same name.
 */
export function searchParts(
  query: string,
  recent: PartSuggestion[],
  lists: PriceList[],
  standard: StandardPart[] = [],
  limit = 8,
): PartSuggestion[] {
  const words = normalise(query).split(" ").filter(Boolean);
  if (words.length === 0 || query.trim().length < 2) return [];
  const exactCode = query.trim().toLowerCase();

  const matches = (name: string, sku?: string) => {
    const hay = `${normalise(name)} ${sku ? normalise(sku) : ""}`;
    return words.every((w) => hay.includes(w));
  };

  const scored: { s: PartSuggestion; score: number }[] = [];
  for (const r of recent) {
    if (matches(r.name)) scored.push({ s: r, score: 1000 - r.name.length });
  }
  for (const list of lists) {
    for (let i = 0; i < list.items.length; i++) {
      const item = list.items[i];
      if (!matches(item.name, item.sku)) continue;
      const codeHit = item.sku?.toLowerCase() === exactCode;
      scored.push({
        s: {
          key: `${list.id}:${i}`,
          name: item.name,
          costPence: item.costPence,
          source: "priceList",
          detail: list.supplier,
          sku: item.sku,
          unit: item.unit,
        },
        score: (codeHit ? 2000 : 500) - item.name.length,
      });
    }
  }
  const priced = new Set(scored.map(({ s }) => normalise(s.name)));
  for (const p of standard) {
    if (!matches(p.name) || priced.has(normalise(p.name))) continue;
    scored.push({
      s: { key: `standard:${p.name}`, name: p.name, source: "standard", detail: p.description },
      score: 200 - p.name.length,
    });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(({ s }) => s);
}
