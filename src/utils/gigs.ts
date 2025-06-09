import { Gig } from "@/types";

/**
 * Determines if a gig is overdue based on its invoice due date.
 * A gig is considered overdue if:
 * - It has an invoice with a due date
 * - The due date is in the past
 * - The gig is not marked as paid
 */
export function isOverdue(gig: Gig): boolean {
  if (gig.status === 'paid' || !gig.invoice?.dueDate) {
    return false;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today to the beginning of the day

  const dueDate = new Date(gig.invoice.dueDate);
  dueDate.setHours(0, 0, 0, 0); // Normalize due date to the beginning of the day

  return dueDate < today;
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