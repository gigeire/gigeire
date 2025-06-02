"use client";
import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";
import { Gig, GigStatus } from "@/types";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useInvoices } from "./InvoicesContext";

interface GigsContextType {
  gigs: Gig[];
  loading: boolean;
  error: string | null;
  addGig: (gig: Omit<Gig, "id" | "user_id" | "created_at">) => Promise<Gig | null>;
  updateGig: (id: string, update: Partial<Gig>) => Promise<Gig | null>;
  deleteGig: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
  checkGigLimit: () => Promise<{ canAddGig: boolean; currentCount: number; limit: number }>;
}

const GigsContext = createContext<GigsContextType | undefined>(undefined);

export function GigsProvider({ children }: { children: ReactNode }) {
  const [gigs, setGigs] = useState<Gig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState<string | null>(null);
  const { refetch: refetchInvoices } = useInvoices();

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: sessionData }) => {
      if (mounted) {
        const initialUserId = sessionData.session?.user?.id ?? null;
        setUserId(initialUserId);
        if (!initialUserId) {
          setLoading(false);
          setGigs([]);
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
        setGigs([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const fetchGigs = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("gigs")
        .select("*, clients(name)")
        .eq("user_id", userId)
        .order("date", { ascending: true });
      if (fetchError) throw fetchError;
      
      const transformedGigs = data ? data.map(gig => ({
        ...gig,
        client: gig.clients?.name || 'Unknown Client' 
      })) : [];
      setGigs(transformedGigs as Gig[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch gigs");
      setGigs([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, userId]);

  useEffect(() => {
    if (userId) {
      fetchGigs();
    } else {
      setGigs([]);
      setLoading(false);
    }
  }, [userId, fetchGigs]);

  const addGig = async (gig: Omit<Gig, "id" | "user_id" | "created_at">): Promise<Gig | null> => {
    if (!userId) {
      setError("User not authenticated to add gig.");
      return null;
    }

    // Check gig limit before proceeding
    const limitCheck = await checkGigLimit();
    if (!limitCheck.canAddGig) {
      setError(`You\'ve reached your limit of ${limitCheck.limit} gigs. Upgrade to Premium to add more gigs.`);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const gigPayload: any = {
        title: gig.title,
        date: gig.date,
        amount: gig.amount,
        location: gig.location || '',
        status: gig.status.toLowerCase(),
        client_id: gig.client_id,
        user_id: userId,
        created_at: new Date().toISOString(),
      };
      if (gig.notes) gigPayload.notes = gig.notes;
      if (!gigPayload.client_id) throw new Error('Missing or invalid client_id for gig insert');
      const { data: insertData, error: insertError } = await supabase
        .from("gigs")
        .insert([gigPayload])
        .select();
      
      if (insertError) {
        throw insertError;
      }
      
      if (!insertData || !Array.isArray(insertData) || insertData.length === 0) {
        throw new Error('Failed to insert gig - no data returned');
      }

      const { data: insertedGig, error: fetchError } = await supabase
        .from("gigs")
        .select("*, clients(name)")
        .eq("id", insertData[0].id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (insertedGig) {
        const finalGig = {
          ...insertedGig,
          client: insertedGig.clients?.name || 'Unknown Client'
        };
        setGigs(prev => [...prev, finalGig as Gig].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
        return finalGig as Gig;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add gig. Please check that all fields are filled correctly.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateGig = async (id: string, update: Partial<Gig>): Promise<Gig | null> => {
    if (!userId) {
      setError("User not authenticated to update gig.");
      return null;
    }
    setLoading(true);
    setError(null);
    try {
      const validGigTableFields: Partial<Gig> = {};
      if (update.title !== undefined) validGigTableFields.title = update.title;
      if (update.date !== undefined) validGigTableFields.date = update.date;
      if (update.amount !== undefined) validGigTableFields.amount = update.amount;
      if (update.location !== undefined) validGigTableFields.location = update.location;
      if (update.notes !== undefined) validGigTableFields.notes = update.notes;
      if (update.client_id !== undefined) validGigTableFields.client_id = update.client_id;
      
      let statusBeingSetToPaid = false;
      let statusBeingSetToInvoiceSent = false;
      if (update.status !== undefined) {
        const lowerCaseStatus = update.status.toLowerCase() as GigStatus;
        validGigTableFields.status = lowerCaseStatus;
        if (lowerCaseStatus === 'paid') {
          statusBeingSetToPaid = true;
        }
        if (lowerCaseStatus === 'invoice_sent') {
          statusBeingSetToInvoiceSent = true;
        }
      }

      if (Object.keys(validGigTableFields).length === 0) {
        const originalGig = gigs.find(g => g.id === id);
        return originalGig || null;
      }

      const { data: updatedGigPrimaryFields, error: updateError } = await supabase
        .from("gigs")
        .update(validGigTableFields)
        .eq("id", id)
        .eq("user_id", userId)
        .select("id, client_id, amount");

      if (updateError) {
        setError(`Failed to update gig: ${updateError.message}`);
        throw updateError;
      }
      
      if (!updatedGigPrimaryFields || updatedGigPrimaryFields.length === 0) {
        // This can be a normal case if .select() doesn't match, not necessarily an error to log to console
      }

      if (statusBeingSetToPaid) {
        const existingGig = gigs.find(g => g.id === id) || updatedGigPrimaryFields?.[0];

        if (existingGig && existingGig.id) {
          const { data: existingInvoice, error: fetchInvoiceError } = await supabase
            .from('invoices')
            .select('id, invoice_paid_at, status')
            .eq('gig_id', existingGig.id)
            .maybeSingle();

          if (fetchInvoiceError) {
            // Do not block gig update if invoice fetch fails, just log it.
          } else if (existingInvoice) {
            // Invoice exists, update it
            if (existingInvoice.status !== 'paid' || !existingInvoice.invoice_paid_at) {
              const { error: updateInvoiceError } = await supabase
                .from('invoices')
                .update({ 
                  status: 'paid', 
                  invoice_paid_at: existingInvoice.invoice_paid_at || new Date().toISOString() 
                })
                .eq('id', existingInvoice.id);

              if (updateInvoiceError) {
                setError(updateInvoiceError.message || "Failed to update linked invoice payment status.");
                // Do not throw, allow gig status update to proceed.
              } else {
                await refetchInvoices();
              }
            } else {
              // Existing invoice (ID: existingInvoice.id) is already marked 'paid' with payment date. No update needed.
            }
          } else {
            // No existing invoice found for gig ID: existingGig.id. Gig will be marked 'paid' without an invoice update.
          }
        } else {
          // Could not find existing gig data to check for an invoice when marking as paid. Gig ID: id
        }
      }

      if (statusBeingSetToInvoiceSent) {
        // Placeholder invoice logic
        const existingGig = gigs.find(g => g.id === id) || updatedGigPrimaryFields?.[0];
        if (existingGig && existingGig.id) {
          const { data: existingInvoice, error: fetchInvoiceError } = await supabase
            .from('invoices')
            .select('id')
            .eq('gig_id', existingGig.id)
            .maybeSingle();
          if (!existingInvoice && !fetchInvoiceError) {
            // Create minimal placeholder invoice
            const now = new Date();
            const invoiceNumber = `INV-${now.getFullYear()}-${now.getTime()}`;
            const dueDate = now.toISOString().split('T')[0];
            const payload = {
              user_id: userId,
              gig_id: existingGig.id,
              client_id: existingGig.client_id || null,
              invoice_number: invoiceNumber,
              due_date: dueDate,
              status: 'sent',
              created_at: now.toISOString(),
              invoice_sent_at: now.toISOString(),
              subtotal: existingGig.amount || 0,
              vat_amount: 0,
              total: existingGig.amount || 0,
              include_vat: false,
              vat_rate: 0,
            };
            const { error: insertError } = await supabase
              .from('invoices')
              .insert([payload]);
            if (insertError) {
              // Failed to create placeholder invoice for gig ID: existingGig.id
            } else {
              await refetchInvoices();
            }
          }
        }
      }

      const { data: fullyUpdatedGig, error: fetchError } = await supabase
        .from("gigs")
        .select("*, clients(name)")
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        setError(`Failed to refresh gig data: ${fetchError.message}`);
        const existingGig = gigs.find(g => g.id === id);
        if (existingGig) {
          const optimisticallyUpdatedGig = { ...existingGig, ...validGigTableFields };
          setGigs(prevGigs => 
            prevGigs.map(g => g.id === id ? optimisticallyUpdatedGig : g)
                    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          );
          return optimisticallyUpdatedGig;
        }
        return null;
      }

      if (fullyUpdatedGig) {
        const finalUpdatedGig = {
          ...fullyUpdatedGig,
          client: fullyUpdatedGig.clients?.name || 'Unknown Client'
        };
        setGigs(prev => 
          prev.map(g => g.id === id ? (finalUpdatedGig as Gig) : g)
              .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        );
        return finalUpdatedGig as Gig;
      }
      return null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update gig");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteGig = async (id: string): Promise<void> => {
    if (!userId) {
      setError("User not authenticated to delete gig.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from("gigs")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);

      if (deleteError) {
        setError(deleteError.message);
        throw deleteError;
      }

      setGigs(prev => prev.filter(gig => gig.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete gig");
    } finally {
      setLoading(false);
    }
  };

  const refetch = fetchGigs;

  const checkGigLimit = async (): Promise<{ canAddGig: boolean; currentCount: number; limit: number }> => {
    if (!userId) {
      return { canAddGig: false, currentCount: 0, limit: 0 }; // Should not happen if called correctly
    }
    try {
      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('subscription_plan')
        .eq('id', userId)
        .single();

      if (userError) {
        throw userError;
      }

      // Count only non-deleted gigs
      const { count, error: countError } = await supabase
        .from('gigs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('deleted_at', null);

      if (countError) {
        throw countError;
      }

      const currentCount = count || 0;
      const plan = userDetails?.subscription_plan || 'free';
      let limit = 10; // Default for free tier

      if (plan === 'premium') {
        limit = Infinity; // Or a very high number
      }
      // Add other plans here if necessary
      
      return { canAddGig: currentCount < limit, currentCount, limit };

    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not verify gig limit.");
      return { canAddGig: false, currentCount: 0, limit: 10 }; // Default to restrictive on error
    }
  };

  return (
    <GigsContext.Provider value={{ gigs, loading, error, addGig, updateGig, deleteGig, refetch, checkGigLimit }}>
      {children}
    </GigsContext.Provider>
  );
}

export function useGigs() {
  const ctx = useContext(GigsContext);
  if (!ctx) throw new Error("useGigs must be used within a GigsProvider");
  return ctx;
} 