"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Session, SupabaseClient } from "@supabase/supabase-js"; // Added SupabaseClient for type safety

// Interface for client documents (consistent with ClientDetailPage)
interface ClientDocument {
  id: string;
  client_id: string;
  gig_id?: string | null;
  user_id: string;
  file_url: string;
  file_name: string;
  uploaded_at: string;
  type: string;
}

interface ClientDocumentsContextType {
  clientDocuments: ClientDocument[];
  loading: boolean;
  error: string | null;
  currentClientId: string | null;
  fetchClientDocuments: (clientId: string) => Promise<void>;
  refetchCurrentClientDocuments: () => Promise<void>;
  clearClientDocuments: () => void;
}

const ClientDocumentsContext = createContext<
  ClientDocumentsContextType | undefined
>(undefined);

export function ClientDocumentsProvider({ children }: { children: ReactNode }) {
  const supabase: SupabaseClient = createClientComponentClient(); // Typed Supabase client
  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Effect for auth state to get userId
  useEffect(() => {
    const getSessionData = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      } else {
        setUserId(null);
        setCurrentClientId(null); // Clear current client if user logs out
        setClientDocuments([]); // Clear documents if user logs out
      }
    };

    getSessionData();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user?.id) {
          setUserId(session.user.id);
        } else {
          setUserId(null);
          setCurrentClientId(null);
          setClientDocuments([]);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [supabase]);

  const _fetchDocuments = useCallback(
    async (clientIdToFetch: string) => {
      if (!clientIdToFetch || !userId) {
        setClientDocuments([]); // Clear if no client id or user
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("client_documents")
          .select("*")
          .eq("client_id", clientIdToFetch)
          .eq("user_id", userId) // Ensure user owns these documents
          .order("uploaded_at", { ascending: false });

        if (fetchError) throw fetchError;
        setClientDocuments(data || []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch client documents"
        );
        setClientDocuments([]);
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId] // Depends on supabase and userId state
  );

  const fetchClientDocuments = useCallback(
    async (clientId: string) => {
      if (clientId && clientId !== currentClientId) {
        setCurrentClientId(clientId);
        // _fetchDocuments will be called by the useEffect below
      } else if (clientId && clientId === currentClientId) {
        await _fetchDocuments(clientId); // Explicitly refetch if called for the same client
      } else if (!clientId) {
        setCurrentClientId(null);
        setClientDocuments([]);
      }
    },
    [currentClientId, _fetchDocuments]
  );

  const refetchCurrentClientDocuments = useCallback(async () => {
    if (currentClientId) {
      await _fetchDocuments(currentClientId);
    } else {
      setClientDocuments([]); // Clear documents if no active client
    }
  }, [currentClientId, _fetchDocuments]);
  
  const clearClientDocuments = useCallback(() => {
    setClientDocuments([]);
    setCurrentClientId(null);
    setLoading(false);
    setError(null);
  }, []);

  // useEffect for Data Fetching when currentClientId or _fetchDocuments (due to userId change) changes
  useEffect(() => {
    if (currentClientId && userId) {
      _fetchDocuments(currentClientId);
    } else if (!currentClientId || !userId) {
      setClientDocuments([]);
      setLoading(false); // Ensure loading is false if we clear
    }
  }, [currentClientId, userId, _fetchDocuments]); // Add userId here

  return (
    <ClientDocumentsContext.Provider
      value={{
        clientDocuments,
        loading,
        error,
        currentClientId,
        fetchClientDocuments,
        refetchCurrentClientDocuments,
        clearClientDocuments,
      }}
    >
      {children}
    </ClientDocumentsContext.Provider>
  );
}

export function useClientDocuments() {
  const context = useContext(ClientDocumentsContext);
  if (context === undefined) {
    throw new Error(
      "useClientDocuments must be used within a ClientDocumentsProvider"
    );
  }
  return context;
} 