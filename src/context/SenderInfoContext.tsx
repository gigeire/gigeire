"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export interface SenderInfo {
  name: string;
  email: string;
  phone?: string;
  website?: string;
  vatNumber?: string;
}

interface SenderInfoContextType {
  senderInfo: SenderInfo;
  updateSenderInfo: (info: Partial<SenderInfo>) => Promise<boolean>;
  loading: boolean;
  refetchSenderInfo: () => Promise<void>;
}

const SenderInfoContext = createContext<SenderInfoContextType | undefined>(undefined);

const STORAGE_KEY = "gigeire_sender_info";

const defaultSenderInfo: SenderInfo = {
  name: "",
  email: "",
  phone: "",
  website: "",
  vatNumber: "",
};

export function SenderInfoProvider({ children }: { children: ReactNode }) {
  const [senderInfo, setSenderInfo] = useState<SenderInfo>(defaultSenderInfo);
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    console.log("[SenderInfoContext] Attempting to get session...");
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("[SenderInfoContext] Error getting session:", error.message);
      }
      if (mounted && data.session?.user?.id) {
        console.log("[SenderInfoContext] User session found, userId:", data.session.user.id);
        setUserId(data.session.user.id);
      } else if (mounted) {
        console.log("[SenderInfoContext] No active session or user ID found.");
        setUserId(null); // Explicitly set to null if no session
        setSenderInfo(defaultSenderInfo); // Reset to default if no user
        setLoading(false);
      }
    }).catch(err => {
       console.error("[SenderInfoContext] Exception during getSession:", err.message);
    });
    return () => { 
      mounted = false; 
      console.log("[SenderInfoContext] Unmounting session effect.");
    };
  }, [supabase]);

  const fetchSenderInfo = useCallback(async () => {
    console.log(`[SenderInfoContext] fetchSenderInfo called. Current userId: ${userId}`);
    if (!userId) {
      console.log("[SenderInfoContext] No userId, setting default senderInfo and stopping fetch.");
      setSenderInfo(defaultSenderInfo);
      setLoading(false);
      return;
    }
    setLoading(true);
    console.log(`[SenderInfoContext] Fetching sender info for userId: ${userId} from DB.`);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("invoice_sender_info")
        .eq("id", userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: PostgREST error for no rows found, which is not a critical error here
        console.error("[SenderInfoContext] Error fetching sender info from DB:", error.message);
        // Keep existing local/localStorage data or default if error is critical
        const stored = localStorage.getItem(STORAGE_KEY);
        setSenderInfo(stored ? JSON.parse(stored) : defaultSenderInfo);
      } else if (data && data.invoice_sender_info && Object.keys(data.invoice_sender_info).length > 0) {
        console.log("[SenderInfoContext] Sender info fetched from DB:", data.invoice_sender_info);
        const dbInfo = { ...defaultSenderInfo, ...data.invoice_sender_info }; // Merge with default to ensure all fields exist
        setSenderInfo(dbInfo);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dbInfo));
      } else {
        console.log("[SenderInfoContext] No sender info in DB or it was empty. Falling back to localStorage (if any). UserId:", userId);
        const stored = localStorage.getItem(STORAGE_KEY);
        setSenderInfo(stored ? JSON.parse(stored) : defaultSenderInfo);
      }
    } catch (err: any) {
        console.error("[SenderInfoContext] Exception during DB fetch:", err.message);
        const stored = localStorage.getItem(STORAGE_KEY);
        setSenderInfo(stored ? JSON.parse(stored) : defaultSenderInfo);
    } finally {
        setLoading(false);
        console.log("[SenderInfoContext] fetchSenderInfo finished.");
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) {
      console.log("[SenderInfoContext] userId changed or set, calling fetchSenderInfo.");
      fetchSenderInfo();
    } else {
      console.log("[SenderInfoContext] No userId, clearing senderInfo to default and removing from localStorage.");
      setSenderInfo(defaultSenderInfo);
      localStorage.removeItem(STORAGE_KEY);
      setLoading(false); // Ensure loading is false if no user
    }
  }, [userId, fetchSenderInfo]);

  const updateSenderInfo = async (info: Partial<SenderInfo>): Promise<boolean> => {
    console.log("[SenderInfoContext] updateSenderInfo called with:", info);
    const newInfo = { ...defaultSenderInfo, ...senderInfo, ...info }; // Ensure all fields from default are present
    setSenderInfo(newInfo); // Optimistic update
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newInfo));

    if (!userId) {
      console.warn("[SenderInfoContext] No userId, sender info updated in localStorage only.");
      return true; // localStorage update is successful
    }

    console.log(`[SenderInfoContext] Updating sender info in DB for userId: ${userId}`);
    try {
      const { error } = await supabase
        .from("users")
        .update({ invoice_sender_info: newInfo })
        .eq("id", userId);

      if (error) {
        console.error("[SenderInfoContext] Error updating sender info in DB:", error.message);
        // Optionally revert optimistic update or notify user
        // For now, we keep the optimistic update in local state/localStorage
        return false;
      }
      console.log("[SenderInfoContext] Sender info successfully updated in DB.");
      // Optionally refetch to confirm, but optimistic update should cover UI.
      // await fetchSenderInfo(); 
      return true;
    } catch (err: any) {
      console.error("[SenderInfoContext] Exception during DB update:", err.message);
      return false;
    }
  };
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[SenderInfoContext] Auth state changed:", event);
      if (event === "SIGNED_IN") {
        console.log("[SenderInfoContext] User SIGNED_IN, new userId:", session?.user?.id);
        setUserId(session?.user?.id || null);
        // fetchSenderInfo will be called by the userId dependency effect
      } else if (event === "SIGNED_OUT") {
        console.log("[SenderInfoContext] User SIGNED_OUT. Clearing userId, senderInfo, and localStorage.");
        localStorage.removeItem(STORAGE_KEY);
        setUserId(null);
        setSenderInfo(defaultSenderInfo);
        setLoading(false); // Ensure loading is false
      } else if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        // If user data might have changed (e.g. email verified), refetch.
        // Or if the session is refreshed, ensure userId is current.
        console.log("[SenderInfoContext] Auth event ", event, ", re-validating session and possibly refetching sender info.");
        if(session?.user?.id && session.user.id !== userId){
            setUserId(session.user.id);
        } else if (session?.user?.id && session.user.id === userId) {
            fetchSenderInfo(); // Re-fetch if user is the same but info might have changed elsewhere
        }
      }
    });
    return () => {
      console.log("[SenderInfoContext] Unsubscribing auth listener.");
      subscription.unsubscribe();
    };
  }, [supabase, userId, fetchSenderInfo]); // Added fetchSenderInfo to deps

  return (
    <SenderInfoContext.Provider value={{ senderInfo, updateSenderInfo, loading, refetchSenderInfo: fetchSenderInfo }}>
      {children}
    </SenderInfoContext.Provider>
  );
}

export function useSenderInfo() {
  const context = useContext(SenderInfoContext);
  if (context === undefined) {
    throw new Error("useSenderInfo must be used within a SenderInfoProvider");
  }
  return context;
} 