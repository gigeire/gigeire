"use client";
import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { FullInvoice } from "@/types";

interface InvoicesContextType {
  invoices: FullInvoice[];
  loading: boolean;
  error: string | null;
  createInvoice: (params: {
    gigId: string;
    dueDate: string;
    includeVat: boolean;
    vatRate: number;
    subtotal: number;
  }) => Promise<void>;
  getInvoiceByGigId: (gigId: string) => FullInvoice | undefined;
  updateInvoiceStatus: (invoiceId: string, status: FullInvoice['status']) => Promise<void>;
  refetch: () => Promise<void>;
}

const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined);

export function InvoicesProvider({ children }: { children: ReactNode }) {
  const [invoices, setInvoices] = useState<FullInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState<string | null>(null);

  // Effect for handling authentication state and setting userId
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (mounted) {
        const initialUserId = sessionData.session?.user?.id ?? null;
        setUserId(initialUserId);
        if (!initialUserId) {
          setLoading(false); // No user, not loading invoices.
          setInvoices([]); // Ensure invoices are cleared if no initial user
        }
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const newUserId = session?.user?.id ?? null;
      setUserId(prevUserId => {
        if (prevUserId !== newUserId) {
          return newUserId;
        }
        return prevUserId;
      });
      if (event === "SIGNED_OUT") {
        setInvoices([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]); // Only depends on supabase client

  // useCallback for fetchInvoices
  const fetchInvoices = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("invoices")
        .select(`
          id,
          user_id,
          gig_id,
          invoice_number,
          due_date,
          include_vat,
          vat_rate,
          status,
          created_at,
          invoice_paid_at,
          client_id,
          invoice_sent_at,
          subtotal,
          vat_amount,
          total
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (fetchError) throw fetchError;
      setInvoices(data as FullInvoice[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch invoices");
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]); // Depends on supabase and userId state

  // useEffect for Data Fetching when userId changes
  useEffect(() => {
    if (userId) {
      fetchInvoices();
    } else {
      setInvoices([]);
      setLoading(false);
    }
  }, [userId, fetchInvoices]); // Depends on userId and fetchInvoices function reference

  // Create a new invoice
  const createInvoice = async ({
    gigId,
    dueDate,
    includeVat,
    vatRate,
    subtotal,
  }: {
    gigId: string;
    dueDate: string;
    includeVat: boolean;
    vatRate: number;
    subtotal: number;
  }) => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      // Calculate VAT and total
      const vatAmount = includeVat ? subtotal * (vatRate / 100) : 0;
      const total = subtotal + vatAmount;

      // Generate invoice number
      const invoiceNumber = `INV-${Date.now()}`;

      // Create invoice
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert([{
          user_id: userId,
          gig_id: gigId,
          invoice_number: invoiceNumber,
          due_date: dueDate,
          include_vat: includeVat,
          vat_rate: vatRate,
          status: 'sent',
          created_at: new Date().toISOString(),
          invoice_sent_at: new Date().toISOString(),
          subtotal,
          vat_amount: vatAmount,
          total,
        }])
        .select();

      if (invoiceError) throw invoiceError;

      // Update gig status
      const { error: gigError } = await supabase
        .from("gigs")
        .update({ status: 'invoice_sent' })
        .eq("id", gigId)
        .eq("user_id", userId);

      if (gigError) throw gigError;

      // Update local state
      if (invoiceData) {
        setInvoices(prev => [invoiceData[0] as FullInvoice, ...prev]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  // Update invoice status
  const updateInvoiceStatus = async (invoiceId: string, status: FullInvoice['status']) => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    const updatePayload: { status: FullInvoice['status']; invoice_paid_at?: string } = { status };

    // If the new status is 'paid' and invoice_paid_at is not already set for this invoice,
    // set it to the current timestamp.
    // We need to fetch the invoice first to check its current invoice_paid_at value.
    const currentInvoice = invoices.find(inv => inv.id === invoiceId);
    if (status === 'paid' && currentInvoice && !currentInvoice.invoice_paid_at) {
      updatePayload.invoice_paid_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("invoices")
      .update(updatePayload)
      .eq("id", invoiceId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
    } else {
      setInvoices(prev => prev.map(inv => 
        inv.id === invoiceId ? { ...inv, ...updatePayload } : inv
      ));
    }
    setLoading(false);
  };

  // Get invoice by gig ID
  const getInvoiceByGigId = (gigId: string) => {
    return invoices.find(inv => inv.gig_id === gigId);
  };

  // Manual refetch
  const refetch = fetchInvoices;

  return (
    <InvoicesContext.Provider value={{
      invoices,
      loading,
      error,
      createInvoice,
      getInvoiceByGigId,
      updateInvoiceStatus,
      refetch,
    }}>
      {children}
    </InvoicesContext.Provider>
  );
}

export function useInvoices() {
  const ctx = useContext(InvoicesContext);
  if (!ctx) throw new Error("useInvoices must be used within an InvoicesProvider");
  return ctx;
} 