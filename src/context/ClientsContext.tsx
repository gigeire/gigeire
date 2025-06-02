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
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from("clients")
        .select(`
          id,
          user_id,
          name
        `)
        .eq("user_id", userId)
        .order("name", { ascending: true });
      if (fetchError) throw fetchError;
      setClients(data as Client[] || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch clients");
      setClients([]);
    } finally {
      setLoading(false);
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
    if (!userId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("clients")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId)
      .select();
    if (error) {
      setError(error.message);
    } else if (data) {
      setClients(prev => prev.map(c => c.id === id ? { ...c, ...update } : c));
    }
    setLoading(false);
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