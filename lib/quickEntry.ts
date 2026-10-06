import type { LineItem, ReminderKind } from "../types/models";

// Turns a quick dictated/typed note such as
//   "Mrs Smith, replaced kitchen tap, 1 hour, £85 parts"
// into a job draft. Comma-separated: the first chunk is the customer, chunks
// with hours or £ amounts become line items, everything else is the job title.
// Dictation via the phone keyboard's mic produces exactly this kind of text,
// so this works for voice entry before we add on-device speech recognition.

export interface QuickEntryDraft {
  customerName: string;
  title: string;
  lineItems: Omit<LineItem, "id">[];
  reminderKind?: ReminderKind;
}

const HOURS_RE = /(\d+(?:\.\d+)?|an?|half an?|one|two|three|four|five|six|seven|eight)\s*(?:hours?|hrs?|h)\b/i;
const MINUTES_RE = /(\d+)\s*(?:minutes?|mins?|m)\b/i;
const AMOUNT_RE = /£\s*(\d+(?:\.\d{1,2})?)|(\d+(?:\.\d{1,2})?)\s*(?:quid|pounds?)\b/i;

const WORD_NUMBERS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
};

function parseHours(token: string): number {
  const lower = token.toLowerCase();
  if (lower.startsWith("half")) return 0.5;
  return WORD_NUMBERS[lower] ?? parseFloat(lower);
}

export function detectReminderKind(text: string): ReminderKind | undefined {
  const lower = text.toLowerCase();
  if (/\b(cp12|landlord|gas safety)\b/.test(lower)) return "landlord_gas_safety";
  if (/\bunvented\b/.test(lower)) return "unvented_service";
  if (/\bboiler\b/.test(lower) && /\b(service|serviced|servicing)\b/.test(lower)) return "boiler_service";
  return undefined;
}

export function parseQuickEntry(
  text: string,
  rates: { hourlyRatePence: number; calloutPence: number },
): QuickEntryDraft {
  const chunks = text.split(/[,;\n]/).map((c) => c.trim()).filter(Boolean);
  const customerName = chunks.shift() ?? "";
  const titleParts: string[] = [];
  const lineItems: Omit<LineItem, "id">[] = [];

  for (const chunk of chunks) {
    const amount = chunk.match(AMOUNT_RE);
    if (amount) {
      const pence = Math.round(parseFloat(amount[1] ?? amount[2]) * 100);
      const lower = chunk.toLowerCase();
      if (/call\s?-?out/.test(lower)) {
        lineItems.push({ kind: "labour", description: "Call-out", quantity: 1, unitPricePence: pence });
      } else if (/labou?r/.test(lower)) {
        lineItems.push({ kind: "labour", description: "Labour", quantity: 1, unitPricePence: pence });
      } else {
        const label = chunk.replace(AMOUNT_RE, "").replace(/\s+/g, " ").trim();
        const isParts = label === "" || /\b(parts?|materials?|bits)\b/i.test(label);
        lineItems.push({
          kind: isParts ? "parts" : "other",
          description: isParts ? "Parts & materials" : capitalise(label),
          quantity: 1,
          unitPricePence: pence,
        });
      }
      continue;
    }

    const hours = chunk.match(HOURS_RE);
    const minutes = chunk.match(MINUTES_RE);
    if (hours || minutes) {
      const total = (hours ? parseHours(hours[1]) : 0) + (minutes ? parseInt(minutes[1], 10) / 60 : 0);
      lineItems.push({
        kind: "labour",
        description: "Labour",
        quantity: Math.round(total * 100) / 100,
        unitPricePence: rates.hourlyRatePence,
      });
      continue;
    }

    if (/^call\s?-?out$/i.test(chunk)) {
      lineItems.push({ kind: "labour", description: "Call-out", quantity: 1, unitPricePence: rates.calloutPence });
      continue;
    }

    titleParts.push(chunk);
  }

  const title = capitalise(titleParts.join(", "));
  return { customerName, title, lineItems, reminderKind: detectReminderKind(title) };
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
