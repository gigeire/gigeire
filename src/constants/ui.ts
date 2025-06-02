import { GigStatus } from "@/types";

export const statusColors: Record<GigStatus | "overdue", string> = {
  "inquiry": "bg-blue-100 text-blue-800",
  "confirmed": "bg-green-100 text-green-800",
  "invoice_sent": "bg-yellow-100 text-yellow-800",
  "paid": "bg-violet-100 text-violet-800",
  "overdue": "bg-red-100 text-red-800"
};

export const feeColors: Record<GigStatus | "overdue", string> = {
  "inquiry": "bg-blue-50 text-blue-700",
  "confirmed": "bg-green-100 text-green-700",
  "invoice_sent": "bg-yellow-50 text-yellow-700",
  "paid": "bg-violet-100 text-violet-700",
  "overdue": "bg-red-50 text-red-700"
}; 