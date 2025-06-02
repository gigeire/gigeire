"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
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
  updateSenderInfo: (info: Partial<SenderInfo>) => Promise<void>;
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

  // Get user id on mount
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && data.session?.user?.id) {
        setUserId(data.session.user.id);
      }
    });
    return () => { mounted = false; };
  }, [supabase]);

  // Fetch sender info from Supabase or localStorage
  const fetchSenderInfo = async () => {
    setLoading(true);
    if (!userId) {
      setSenderInfo(defaultSenderInfo);
      setLoading(false);
      return;
    }
    // Try Supabase first
    const { data, error } = await supabase
      .from("users")
      .select("invoice_sender_info")
      .eq("id", userId)
      .single();
    if (!error && data && data.invoice_sender_info) {
      setSenderInfo(data.invoice_sender_info);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data.invoice_sender_info));
    } else {
      // Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      setSenderInfo(stored ? JSON.parse(stored) : defaultSenderInfo);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (userId) fetchSenderInfo();
  }, [userId]);

  const updateSenderInfo = async (info: Partial<SenderInfo>) => {
    const newInfo = { ...senderInfo, ...info };
    setSenderInfo(newInfo);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newInfo));
    if (userId) {
      await supabase
        .from("users")
        .update({ invoice_sender_info: newInfo })
        .eq("id", userId);
    }
  };

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