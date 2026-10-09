import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { readSheet } from "read-excel-file/universal";
import { parseCsv, Row } from "@/lib/priceList";

export interface PickedSpreadsheet {
  fileName: string;
  rows: Row[];
}

const TYPES = [
  "text/csv", "text/comma-separated-values", "text/plain", "application/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

/** Lets the plumber pick a CSV/Excel price list (from email, Files, Drive...) and reads its rows. */
export async function pickSpreadsheet(): Promise<PickedSpreadsheet | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: TYPES, copyToCacheDirectory: true });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const name = asset.name ?? "price list";
  const lower = name.toLowerCase();

  if (lower.endsWith(".xls")) {
    throw new Error("That's an old-style Excel file (.xls). Open it in Excel or Google Sheets and save it as .xlsx or CSV, then try again.");
  }

  const isExcel = lower.endsWith(".xlsx") || asset.mimeType?.includes("spreadsheetml");
  const buffer = Platform.OS === "web" && asset.file ? await asset.file.arrayBuffer() : await new File(asset.uri).arrayBuffer();

  if (isExcel) {
    const rows = await readSheet(buffer);
    return { fileName: name, rows: rows as Row[] };
  }
  return { fileName: name, rows: parseCsv(decodeUtf8(new Uint8Array(buffer))) };
}

// Hermes doesn't always ship TextDecoder; merchant CSVs are UTF-8 or plain
// ASCII/Latin-1 (where "£" is byte 0xA3), so decode by hand and accept both.
function decodeUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    try {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    }
  }
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b < 0x80) out += String.fromCharCode(b);
    else if (b >= 0xc0 && b < 0xe0 && i + 1 < bytes.length && (bytes[i + 1] & 0xc0) === 0x80) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i] & 0x3f));
    } else if (b >= 0xe0 && b < 0xf0 && i + 2 < bytes.length) {
      out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[++i] & 0x3f) << 6) | (bytes[++i] & 0x3f));
    } else out += String.fromCharCode(b); // Latin-1 fallback
  }
  return out;
}
