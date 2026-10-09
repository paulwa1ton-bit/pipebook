import { Platform, Share } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as MailComposer from "expo-mail-composer";
import { File, Paths } from "expo-file-system";
import { buildDocumentHtml, documentFileName, DocumentKind } from "@/lib/documentHtml";
import { buildDocumentEmail } from "@/lib/emailMessage";
import type { BusinessSettings, Customer, Job } from "@/types/models";

export type SendMethod = "email" | "share";

/** What actually happened, so the screen can tell the plumber. */
export type SendOutcome = "emailed" | "email-cancelled" | "shared" | "printed";

async function renderPdf(kind: DocumentKind, job: Job, customer: Customer | undefined, settings: BusinessSettings) {
  const { uri } = await Print.printToFileAsync({ html: buildDocumentHtml(kind, job, customer, settings) });
  // Give the file a name the customer will recognise, not "Print-8F2A....pdf".
  const named = new File(Paths.cache, documentFileName(kind, job, customer));
  if (named.exists) named.delete();
  new File(uri).move(named);
  return named.uri;
}

/**
 * Sends an invoice/quote as a PDF.
 * - "email" opens a new email with the PDF attached and the customer's
 *   address, subject and a short message filled in.
 * - "share" opens the share sheet (WhatsApp, Messages, Files...).
 * If the phone has no mail account set up for the system composer (e.g. an
 * iPhone that only uses the Gmail app), email falls back to the share sheet,
 * passing the message along where the platform allows.
 * In a browser there's no file sharing, so it opens the print dialog instead.
 */
export async function sendDocument(
  kind: DocumentKind,
  job: Job,
  customer: Customer | undefined,
  settings: BusinessSettings,
  method: SendMethod,
): Promise<SendOutcome> {
  if (Platform.OS === "web") {
    await Print.printAsync({ html: buildDocumentHtml(kind, job, customer, settings) });
    return "printed";
  }

  const pdfUri = await renderPdf(kind, job, customer, settings);
  const email = buildDocumentEmail(kind, job, customer, settings);

  if (method === "email" && (await MailComposer.isAvailableAsync())) {
    const result = await MailComposer.composeAsync({
      recipients: customer?.email ? [customer.email.trim()] : [],
      subject: email.subject,
      body: email.body,
      attachments: [pdfUri],
    });
    // Android can't tell whether the email was actually sent, only iOS can.
    return result.status === MailComposer.MailComposerStatus.CANCELLED ? "email-cancelled" : "emailed";
  }

  if (Platform.OS === "ios") {
    // iOS's share sheet can carry the file and the message together, so apps
    // like Gmail and Outlook get the attachment and the text.
    await Share.share({ url: pdfUri, message: email.body, title: email.subject }, { subject: email.subject });
    return "shared";
  }

  await Sharing.shareAsync(pdfUri, {
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
    dialogTitle: email.subject,
  });
  return "shared";
}
