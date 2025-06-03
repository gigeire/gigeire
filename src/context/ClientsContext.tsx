"use client";
import { ReactNode, createContext, useContext, useState, useEffect, useCallback } from "react";
import { Client } from "@/types/index";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface ClientsContextType {
  clients: Client[];
  loading: boolean;
  error: string | null;
  addClient: (client: Omit<Client, "id">) => Promise<Client | null>;
  updateClient: (id: string, update: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

const ClientsContext = createContext<ClientsContextType | undefined>(undefined);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
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
          setLoading(false); // No user, not loading clients.
          setClients([]); // Ensure clients are cleared if no initial user
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
        setClients([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]); // Only depends on supabase client

  // useCallback for fetchClients
  const fetchClients = useCallback(async () => {
    if (!userId) {
      console.debug("[ClientsContext] fetchClients called without userId. Skipping fetch.");
      setClients([]); // Ensure clients are cleared if no user
      setLoading(false);
      return;
    }
    console.debug("[ClientsContext] fetchClients called for userId:", userId);
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("clients")
        .select(`
          id,
          user_id,
          name,
          email, 
          phone
        `)
        .eq("user_id", userId)
        .order("name", { ascending: true });

      if (fetchError) {
        console.error("[ClientsContext] Error fetching clients:", fetchError);
        throw fetchError;
      }
      
      console.debug("[ClientsContext] Clients fetched successfully:", data);
      setClients(data as Client[] || []);
    } catch (err) {
      console.error("[ClientsContext] Exception in fetchClients:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch clients");
      setClients([]); // Clear clients on error
    } finally {
      setLoading(false);
      console.debug("[ClientsContext] fetchClients finished. Loading set to false.");
    }
  }, [supabase, userId]); // Depends on supabase and userId state

  // useEffect for Data Fetching when userId changes
  useEffect(() => {
    if (userId) {
      fetchClients();
    } else {
      setClients([]);
      setLoading(false);
    }
  }, [userId, fetchClients]); // Depends on userId and fetchClients function reference

  // Add a new client
  const addClient = async (client: Omit<Client, "id">): Promise<Client | null> => {
    if (!userId) return null;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("clients")
      .insert([{ ...client, user_id: userId }])
      .select();
    setLoading(false);
    if (error) {
      setError(error.message);
      return null;
    } else if (data && data.length > 0) {
      const newClient = data[0] as Client;
      setClients(prev => [...prev, newClient].sort((a,b) => a.name.localeCompare(b.name)));
      return newClient;
    }
    return null;
  };

  // Update a client
  const updateClient = async (id: string, update: Partial<Client>) => {
    if (!userId) {
      console.warn("[ClientsContext] updateClient called without userId. Aborting.");
      throw new Error("User not authenticated. Cannot update client.");
    }
    
    console.debug(`[ClientsContext] updateClient called for id: ${id} with partial update:`, update);
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch current full client record from Supabase to get all existing fields
      console.debug(`[ClientsContext] Fetching current client data for id: ${id}`);
      const { data: currentClientData, error: fetchError } = await supabase
        .from("clients")
        .select("*") // Select all columns to ensure we have the full current state
        .eq("id", id)
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        console.error("[ClientsContext] Error fetching client before update:", fetchError);
        setError(fetchError.message);
        throw fetchError;
      }
      if (!currentClientData) {
        console.error("[ClientsContext] Client not found in DB for id:", id);
        throw new Error("Client not found in database. Cannot update.");
      }
      console.debug("[ClientsContext] Current client data fetched:", currentClientData);

      // 2. Merge the current client data with the new fields provided in 'update'
      // This ensures that fields not included in 'update' retain their existing values.
      const mergedUpdateData: Client = {
        ...currentClientData,
        ...update,
        // Ensure critical fields like id and user_id are not accidentally changed if they are part of 'update'
        // (though 'update' is Partial<Client> and shouldn't typically include these for an update operation)
        id: currentClientData.id, 
        user_id: currentClientData.user_id 
      };
      console.debug("[ClientsContext] Merged data for Supabase update:", mergedUpdateData);
      
      // 3. Update Supabase with the merged complete client object
      // And select the updated row back to confirm changes and get the latest version
      console.debug("[ClientsContext] Sending update to Supabase for id:", id);
      const { data: updatedClientFromDB, error: updateError } = await supabase
        .from("clients")
        .update(mergedUpdateData) // Send the entire merged object
        .eq("id", id)
        .eq("user_id", userId)
        .select("*") // Select all fields of the updated record
        .single();   // Expect a single record to be returned

      if (updateError) {
        console.error("[ClientsContext] Error updating client in Supabase:", updateError);
        setError(updateError.message);
        throw updateError;
      }
      if (!updatedClientFromDB) {
        console.error("[ClientsContext] Supabase update call succeeded but returned no data for id:", id);
        // This scenario should ideally not happen if the update was successful and .single() was used.
        // It might indicate an issue with RLS or the select query.
        throw new Error("Failed to retrieve updated client data from database after update.");
      }
      console.debug("[ClientsContext] Client updated successfully in DB. DB response:", updatedClientFromDB);

      // 4. Update the local context state with this fresh, complete data from the database
      setClients(prevClients => {
        const newClients = prevClients.map(c =>
          c.id === id ? updatedClientFromDB : c
        );
        console.debug("[ClientsContext] Local clients state updated. Client after update in context:", newClients.find(c => c.id === id));
        return newClients;
      });
      // No need to call a full refetch (like fetchClients()) as we've precisely updated the specific client.

    } catch (err) {
      console.error("[ClientsContext] Exception caught in updateClient:", err);
      // Set error state if not already set by a more specific Supabase error.
      if (!error && err instanceof Error) { 
        setError(err.message);
      } else if (!error) {
        setError("An unexpected error occurred during client update.");
      }
      throw err; // Re-throw to allow calling component to handle (e.g., show toast)
    } finally {
      setLoading(false);
      console.debug("[ClientsContext] updateClient finished. Loading set to false for id:", id);
    }
  };

  // Delete a client
  const deleteClient = async (id: string) => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      
      if (error) {
        setError(error.message);
        throw error;
      }
      
      // Update local state immediately
      setClients(prev => prev.filter(c => c.id !== id));
      
      // Trigger a refetch to ensure all related data is updated
      await fetchClients();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete client");
    } finally {
      setLoading(false);
    }
  };

  // Manual refetch
  const refetch = fetchClients;

  return (
    <ClientsContext.Provider value={{ clients, loading, error, addClient, updateClient, deleteClient, refetch }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function useClients() {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClients must be used within a ClientsProvider");
  return ctx;
} 