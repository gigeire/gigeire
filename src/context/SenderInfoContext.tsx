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

// Helper to get user-scoped storage key
const getUserScopedStorageKey = (userId: string | null) => {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
};

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

  // Clear all user-scoped storage on logout
  const clearUserScopedStorage = useCallback(() => {
    console.debug("[SenderInfoContext] Clearing user-scoped storage");
    // Clear current user's storage
    if (userId) {
      localStorage.removeItem(getUserScopedStorageKey(userId));
    }
    // Clear any legacy storage
    localStorage.removeItem(STORAGE_KEY);
  }, [userId]);

  useEffect(() => {
    let mounted = true;
    console.debug("[SenderInfoContext] Attempting to get session...");
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        console.error("[SenderInfoContext] Error getting session:", error.message);
      }
      if (mounted && data.session?.user?.id) {
        console.debug("[SenderInfoContext] User session found, userId:", data.session.user.id);
        setUserId(data.session.user.id);
      } else if (mounted) {
        console.debug("[SenderInfoContext] No active session or user ID found.");
        setUserId(null);
        setSenderInfo(defaultSenderInfo);
        setLoading(false);
      }
    }).catch(err => {
      console.error("[SenderInfoContext] Exception during getSession:", err.message);
    });
    return () => { 
      mounted = false;
      console.debug("[SenderInfoContext] Unmounting session effect.");
    };
  }, [supabase]);

  const fetchSenderInfo = useCallback(async () => {
    console.debug(`[SenderInfoContext] fetchSenderInfo called. Current userId: ${userId}`);
    if (!userId) {
      console.debug("[SenderInfoContext] No userId, setting default senderInfo and stopping fetch.");
      setSenderInfo(defaultSenderInfo);
      setLoading(false);
      return;
    }
    setLoading(true);
    console.debug(`[SenderInfoContext] Fetching sender info for userId: ${userId} from DB.`);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("invoice_sender_info")
        .eq("id", userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("[SenderInfoContext] Error fetching sender info from DB:", error.message);
        // Keep existing local/localStorage data or default if error is critical
        const stored = localStorage.getItem(getUserScopedStorageKey(userId));
        setSenderInfo(stored ? JSON.parse(stored) : defaultSenderInfo);
      } else if (data && data.invoice_sender_info && Object.keys(data.invoice_sender_info).length > 0) {
        console.debug("[SenderInfoContext] Sender info fetched from DB:", data.invoice_sender_info);
        const dbInfo = { ...defaultSenderInfo, ...data.invoice_sender_info };
        setSenderInfo(dbInfo);
        localStorage.setItem(getUserScopedStorageKey(userId), JSON.stringify(dbInfo));
      } else {
        console.debug("[SenderInfoContext] No sender info in DB or it was empty. Falling back to localStorage (if any).");
        const stored = localStorage.getItem(getUserScopedStorageKey(userId));
        setSenderInfo(stored ? JSON.parse(stored) : defaultSenderInfo);
      }
    } catch (err: any) {
      console.error("[SenderInfoContext] Exception during DB fetch:", err.message);
      const stored = localStorage.getItem(getUserScopedStorageKey(userId));
      setSenderInfo(stored ? JSON.parse(stored) : defaultSenderInfo);
    } finally {
      setLoading(false);
      console.debug("[SenderInfoContext] fetchSenderInfo finished.");
    }
  }, [userId, supabase]);

  useEffect(() => {
    if (userId) {
      console.debug("[SenderInfoContext] userId changed or set, calling fetchSenderInfo.");
      fetchSenderInfo();
    } else {
      console.debug("[SenderInfoContext] No userId, clearing senderInfo to default and removing from localStorage.");
      setSenderInfo(defaultSenderInfo);
      clearUserScopedStorage();
      setLoading(false);
    }
  }, [userId, fetchSenderInfo, clearUserScopedStorage]);

  const updateSenderInfo = async (info: Partial<SenderInfo>): Promise<boolean> => {
    console.debug("[SenderInfoContext] updateSenderInfo called with:", info);
    const newInfo = { ...defaultSenderInfo, ...senderInfo, ...info };
    setSenderInfo(newInfo);

    if (!userId) {
      console.warn("[SenderInfoContext] No userId, sender info updated in localStorage only.");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newInfo));
      return true;
    }

    // Store in user-scoped localStorage
    localStorage.setItem(getUserScopedStorageKey(userId), JSON.stringify(newInfo));

    console.debug(`[SenderInfoContext] Updating sender info in DB for userId: ${userId}`);
    try {
      const { error } = await supabase
        .from("users")
        .update({ invoice_sender_info: newInfo })
        .eq("id", userId);

      if (error) {
        console.error("[SenderInfoContext] Error updating sender info in DB:", error.message);
        return false;
      }
      console.debug("[SenderInfoContext] Sender info successfully updated in DB.");
      return true;
    } catch (err: any) {
      console.error("[SenderInfoContext] Exception during DB update:", err.message);
      return false;
    }
  };
  
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.debug("[SenderInfoContext] Auth state changed:", event);
      if (event === "SIGNED_IN") {
        console.debug("[SenderInfoContext] User SIGNED_IN, new userId:", session?.user?.id);
        setUserId(session?.user?.id || null);
      } else if (event === "SIGNED_OUT") {
        console.debug("[SenderInfoContext] User SIGNED_OUT. Clearing userId, senderInfo, and localStorage.");
        clearUserScopedStorage();
        setUserId(null);
        setSenderInfo(defaultSenderInfo);
        setLoading(false);
      } else if (event === "USER_UPDATED" || event === "TOKEN_REFRESHED") {
        console.debug("[SenderInfoContext] Auth event ", event, ", re-validating session and possibly refetching sender info.");
        if(session?.user?.id && session.user.id !== userId){
          setUserId(session.user.id);
        } else if (session?.user?.id && session.user.id === userId) {
          fetchSenderInfo();
        }
      }
    });
    return () => {
      console.debug("[SenderInfoContext] Unsubscribing auth listener.");
      subscription.unsubscribe();
    };
  }, [supabase, userId, fetchSenderInfo, clearUserScopedStorage]);

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