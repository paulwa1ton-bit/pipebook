import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
import { buildDocumentHtml, documentFileName, DocumentKind } from "@/lib/documentHtml";
import type { BusinessSettings, Customer, Job } from "@/types/models";

/**
 * Renders the invoice/quote to a PDF and opens the share sheet (WhatsApp,
 * email, Messages, Files...). In a browser there's no share sheet for files,
 * so it opens the print dialog instead, where "Save as PDF" is available.
 */
export async function shareDocument(
  kind: DocumentKind,
  job: Job,
  customer: Customer | undefined,
  settings: BusinessSettings,
): Promise<void> {
  const html = buildDocumentHtml(kind, job, customer, settings);
  if (Platform.OS === "web") {
    await Print.printAsync({ html });
    return;
  }

  const { uri } = await Print.printToFileAsync({ html });
  // Give the file a name the customer will recognise, not "Print-8F2A....pdf".
  const named = new File(Paths.cache, documentFileName(kind, job, customer));
  new File(uri).move(named, { overwrite: true });

  await Sharing.shareAsync(named.uri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: kind === "invoice" ? "Send invoice" : "Send quote",
  });
}
