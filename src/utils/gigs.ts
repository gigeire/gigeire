import { Gig } from "@/types";

/**
 * Determines if a gig is overdue based on its invoice due date.
 * A gig is considered overdue if:
 * - It has an invoice with a due date
 * - The due date is in the past
 * - The gig is not marked as paid
 */
export function isOverdue(gig: Gig): boolean {
  if (!gig.invoice || gig.invoice.status !== "sent" || !gig.invoice.due_date) return false;

  const dueDate = new Date(gig.invoice.due_date);
  const now = new Date();

  const dueUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  const nowUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

  return dueUTC < nowUTC;
}

/**
 * Gets the display status for a gig, taking into account overdue state.
 * This is a UI-only concern and does not reflect the database status.
 */
export function getDisplayStatus(gig: Gig): string {
  if (isOverdue(gig)) return "Overdue";
  switch (gig.status) {
    case "inquiry": return "Inquiry";
    case "confirmed": return "Confirmed";
    case "invoice_sent": return "Invoice Sent";
    case "paid": return "Paid";
    default: return gig.status;
  }
}

/**
 * Gets the status key for styling/display purposes.
 * This is a UI-only concern and does not reflect the database status.
 */
export function getStatusKey(gig: Gig): string {
  if (isOverdue(gig)) return "overdue";
  return gig.status;
} 