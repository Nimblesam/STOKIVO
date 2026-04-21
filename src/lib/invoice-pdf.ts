import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";

/**
 * Render a DOM node into an A4 PDF Blob.
 *
 * Strategy: We always try to fit the entire invoice onto a SINGLE A4 page by
 * scaling the snapshot down proportionally when it would otherwise overflow.
 * This produces a clean, professional, one-page invoice that reads well on
 * email and WhatsApp. Only if the content is extremely tall (>1.6× page
 * height ratio) do we fall back to multi-page rendering to preserve legibility.
 */
export async function renderNodeToPdfBlob(node: HTMLElement): Promise<Blob> {
  // Wait for all images (e.g., merchant logo) inside the node to fully load
  // before snapshotting. Without this, html2canvas may rasterize a half-loaded
  // logo and produce a blurry/empty image in the PDF.
  const imgs = Array.from(node.querySelectorAll("img"));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        }),
    ),
  );

  const canvas = await html2canvas(node, {
    scale: 3, // higher scale = crisper logo and text in the rasterised PDF
    useCORS: true,
    allowTaint: false,
    backgroundColor: "#ffffff",
    logging: false,
    imageTimeout: 15000,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.95);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Natural height if we scale image to full page width
  const naturalImgHeight = (canvas.height * pageWidth) / canvas.width;
  const overflowRatio = naturalImgHeight / pageHeight;

  // Single-page mode: scale down to fit when content is up to ~1.6 pages tall.
  if (overflowRatio <= 1.6) {
    const imgHeight = Math.min(naturalImgHeight, pageHeight);
    const imgWidth = (canvas.width * imgHeight) / canvas.height;
    const x = (pageWidth - imgWidth) / 2; // horizontal centre when scaled down
    pdf.addImage(imgData, "JPEG", x, 0, imgWidth, imgHeight);
    return pdf.output("blob");
  }

  // Fallback: very long invoice → paginate naturally (legibility wins).
  const imgWidth = pageWidth;
  const imgHeight = naturalImgHeight;
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
