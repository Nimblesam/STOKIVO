import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

/**
 * Render a DOM node into a multi-page A4 PDF Blob.
 */
export async function renderNodeToPdfBlob(node: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf.output("blob");
}

/**
 * Upload an invoice PDF to the public 'invoices' bucket and return a public URL.
 * File path: <company_id>/<invoice_number>-<timestamp>.pdf
 */
export async function uploadInvoicePdf(
  blob: Blob,
  companyId: string,
  invoiceNumber: string,
): Promise<string> {
  const safeNumber = invoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  const path = `${companyId}/${safeNumber}-${Date.now()}.pdf`;
  const { error } = await supabase.storage
    .from("invoices")
    .upload(path, blob, { contentType: "application/pdf", upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("invoices").getPublicUrl(path);
  return data.publicUrl;
}
