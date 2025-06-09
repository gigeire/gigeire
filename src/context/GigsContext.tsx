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

interface GigWithClient extends Omit<Gig, 'client'> {
  clients: {
    name: string;
  };
}

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
        .select(`
          id,
          user_id,
          client_id,
          title,
          date,
          location,
          amount,
          status,
          notes,
          created_at,
          clients (
            name
          ),
          invoice:invoices!gig_id (
            id,
            status,
            due_date,
            amount,
            invoice_number,
            invoice_sent_at,
            invoice_paid_at,
            subtotal,
            vat_amount,
            total,
            include_vat,
            vat_rate
          )
        `)
        .eq("user_id", userId)
        .order("date", { ascending: true });

      if (fetchError) throw fetchError;
      
      const transformedGigs = data ? data.map(gig => ({
        ...gig,
        client: (gig as unknown as GigWithClient).clients?.name || 'Unknown Client',
        invoice: (gig as any).invoice?.[0] || null // Take the first invoice if it exists
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
      const gigPayload = {
        title: gig.title,
        date: gig.date,
        amount: gig.amount,
        location: gig.location || '',
        status: gig.status.toLowerCase(),
        client_id: gig.client_id,
        user_id: userId,
        created_at: new Date().toISOString(),
        notes: gig.notes || null
      };

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
        .select(`
          id,
          user_id,
          client_id,
          title,
          date,
          location,
          amount,
          status,
          notes,
          created_at,
          clients (
            name
          )
        `)
        .eq("id", insertData[0].id)
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (insertedGig) {
        const finalGig = {
          ...insertedGig,
          client: (insertedGig as unknown as GigWithClient).clients?.name || 'Unknown Client'
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

      if (statusBeingSetToPaid) {
        const existingGig = gigs.find(g => g.id === id) || updatedGigPrimaryFields?.[0];
        if (existingGig && existingGig.id) {
          const { data: existingInvoice, error: fetchInvoiceError } = await supabase
            .from('invoices')
            .select('id, invoice_paid_at, status')
            .eq('gig_id', existingGig.id)
            .eq('user_id', userId)
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
                .eq('id', existingInvoice.id)
                .eq('user_id', userId);

              if (updateInvoiceError) {
                setError(updateInvoiceError.message || "Failed to update linked invoice payment status.");
                // Do not throw, allow gig status update to proceed.
              } else {
                await refetchInvoices();
              }
            }
          }
        }
      }

      if (statusBeingSetToInvoiceSent) {
        const existingGig = gigs.find(g => g.id === id) || updatedGigPrimaryFields?.[0];
        if (existingGig && existingGig.id) {
          const { data: existingInvoice, error: fetchInvoiceError } = await supabase
            .from('invoices')
            .select('id')
            .eq('gig_id', existingGig.id)
            .eq('user_id', userId)
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
              vat_rate: 0
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
        .select(`
          id,
          user_id,
          client_id,
          title,
          date,
          location,
          amount,
          status,
          notes,
          created_at,
          clients (
            name
          )
        `)
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
          client: (fullyUpdatedGig as unknown as GigWithClient).clients?.name || 'Unknown Client'
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
    try {
      // Get session instead of user directly
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error("Gig limit check: Error fetching session:", sessionError);
        throw sessionError;
      }

      const user = session?.user;
      if (!user?.id) {
        console.log("Gig limit check: No authenticated user found in session");
        return { canAddGig: false, currentCount: 0, limit: 0 };
      }

      const { data: userDetails, error: userError } = await supabase
        .from('users')
        .select('id, plan')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error("Gig limit check: Error fetching user details:", userError);
        throw userError;
      }

      // Count gigs for this user - Note: No soft delete filtering as deleted_at column does not exist
      const { count, error: countError } = await supabase
        .from('gigs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (countError) {
        console.error("Gig limit check: Error counting gigs:", countError);
        throw countError;
      }

      const currentCount = count || 0;
      const plan = userDetails?.plan || 'free';
      let limit = 10; // Default for free tier

      if (plan === 'premium') {
        limit = Infinity; // Or a very high number
      }
      // Add other plans here if necessary
      
      console.log("Gig limit check:", { 
        userId: user.id, 
        currentCount, 
        limit, 
        plan,
        canAddGig: currentCount < limit 
      });
      
      return { canAddGig: currentCount < limit, currentCount, limit };

    } catch (err) {
      console.error("Gig limit check: Error in checkGigLimit:", err);
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