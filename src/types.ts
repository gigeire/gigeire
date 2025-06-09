export type GigStatus =
  | "inquiry"
  | "confirmed"
  | "invoice_sent"
  | "paid";

export interface Invoice {
  invoiceNumber: number;
  dueDate: string; // ISO string (YYYY-MM-DD)
  vatIncluded: boolean;
  subtotal: number;
  vatAmount: number;
  total: number;
  number: string;
  invoice_sent_at?: string; // ISO string timestamp, optional
}

// Renamed from Invoice in InvoicesContext.tsx
export interface FullInvoice {
  id: string;
  user_id: string;
  gig_id: string;
  client_id?: string;
  invoice_number: string;
  due_date: string; // ISO string (YYYY-MM-DD)
  include_vat: boolean;
  vat_rate: number;
  status: 'sent' | 'paid' | 'overdue';
  created_at: string; // ISO string timestamp
  subtotal: number;
  vat_amount: number;
  total: number;
  invoice_sent_at?: string | null;
  invoice_paid_at?: string | null;
}

export interface Gig {
  id: string; // unique identifier
  title: string;
  date: string; // ISO string (YYYY-MM-DD)
  client: string; // This will store the client's name
  client_id: string; // foreign key to clients table
  amount: number; // e.g. 450
  location: string;
  status: GigStatus;
  notes?: string;
  invoice?: Invoice; // Uses the Invoice interface defined above
  email?: string; // Client's email, potentially denormalized for quick access
  phone?: string; // Client's phone, potentially denormalized
  user_id: string; // foreign key to users table
  created_at: string; // ISO string timestamp
  // Ensure all properties from src/types/index.ts Gig are here or intentionally omitted
}

// Client type remains in src/types/index.ts 