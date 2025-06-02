"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { createClientComponentClient, Session } from "@supabase/auth-helpers-nextjs";
import { User } from "@supabase/supabase-js";
import { Gig } from "@/types";
import { Client } from "@/types/index";

interface AnalyticsData {
  totalInvoiced: number;
  totalPaid: number;
  averageGigValue: number;
  statusCounts: {
    inquiry: number;
    confirmed: number;
    invoice_sent: number;
    paid: number;
  };
  bookingFunnel: {
    inquiry: number;
    confirmed: number;
    paid: number;
    conversionRates: {
      inquiryToConfirmed: number;
      confirmedToPaid: number;
    };
  };
  monthlyEarnings: {
    month: string;
    amount: number;
  }[];
  topClients: {
    name: string;
    total: number;
  }[];
}

interface AnalyticsContextType {
  data: AnalyticsData | null;
  isLoading: boolean;
  error: Error | null;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  data: null,
  isLoading: true,
  error: null,
});

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const supabase = createClientComponentClient();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        setUser(session?.user ?? null);
        setSessionChecked(true);
      }
    );
    // Initial session check
    supabase.auth.getSession().then(({ data: sessionData }: { data: { session: Session | null } }) => {
      setUser(sessionData.session?.user ?? null);
      setSessionChecked(true);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!sessionChecked || !user) {
      setIsLoading(false);
      if (!user && sessionChecked) setError(new Error("User not authenticated"));
      setData(null);
      return;
    }
    async function fetchAnalytics() {
      setIsLoading(true);
      try {
        if (!user) {
          throw new Error("User became null unexpectedly during fetchAnalytics");
        }
        // Fetch all gigs for the user
        const { data: gigs, error: gigsError } = await supabase
          .from("gigs")
          .select("*")
          .eq("user_id", user.id);

        if (gigsError) throw gigsError;

        // Calculate analytics data
        const analyticsData: AnalyticsData = {
          totalInvoiced: gigs.reduce((sum: number, gig: Gig) => {
            if (gig.status === "invoice_sent" || gig.status === "overdue" || gig.status === "paid") {
              return sum + (gig.amount || 0);
            }
            return sum;
          }, 0),
          totalPaid: gigs.reduce((sum: number, gig: Gig) => sum + (gig.status === "paid" ? (gig.amount || 0) : 0), 0),
          averageGigValue: gigs.length > 0
            ? gigs.reduce((sum: number, gig: Gig) => sum + (gig.amount || 0), 0) / gigs.length
            : 0,
          statusCounts: {
            inquiry: gigs.filter((gig: Gig) => gig.status === "inquiry").length,
            confirmed: gigs.filter((gig: Gig) => gig.status === "confirmed").length,
            invoice_sent: gigs.filter((gig: Gig) => gig.status === "invoice_sent").length,
            paid: gigs.filter((gig: Gig) => gig.status === "paid").length,
          },
          bookingFunnel: {
            inquiry: gigs.filter((gig: Gig) => gig.status === "inquiry").length,
            confirmed: gigs.filter((gig: Gig) => gig.status === "confirmed").length,
            paid: gigs.filter((gig: Gig) => gig.status === "paid").length,
            conversionRates: {
              inquiryToConfirmed: gigs.filter((gig: Gig) => gig.status === "inquiry").length > 0
                ? (gigs.filter((gig: Gig) => gig.status === "confirmed").length / gigs.filter((gig: Gig) => gig.status === "inquiry").length) * 100
                : 0,
              confirmedToPaid: gigs.filter((gig: Gig) => gig.status === "confirmed").length > 0
                ? (gigs.filter((gig: Gig) => gig.status === "paid").length / gigs.filter((gig: Gig) => gig.status === "confirmed").length) * 100
                : 0,
            },
          },
          monthlyEarnings: gigs
            .filter((gig: Gig) => gig.status === "paid")
            .reduce((acc: { month: string; amount: number }[], gig: Gig) => {
              const date = new Date(gig.date);
              const month = date.toLocaleString("default", { month: "short" });
              const existingMonth = acc.find(m => m.month === month);
              if (existingMonth) {
                existingMonth.amount += gig.amount || 0;
              } else {
                acc.push({ month, amount: gig.amount || 0 });
              }
              return acc;
            }, [])
            .sort((a: { month: string; amount: number }, b: { month: string; amount: number }) => {
              const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              return months.indexOf(a.month) - months.indexOf(b.month);
            }),
          topClients: await Promise.all(
            Array.from(new Set(gigs.map((gig: Gig) => gig.client_id)))
              .map(async (clientId) => {
                const { data: clientData } = await supabase
                  .from("clients")
                  .select("name")
                  .eq("id", clientId)
                  .single();
                const total = gigs
                  .filter((gig: Gig) => gig.client_id === clientId)
                  .reduce((sum: number, gig: Gig) => sum + (gig.amount || 0), 0);
                return { name: (clientData as Client)?.name || "Unknown", total };
              })
          ).then(clients => clients.sort((a: { name: string; total: number }, b: { name: string; total: number }) => b.total - a.total).slice(0, 5)),
        };

        setData(analyticsData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch analytics"));
        setData(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAnalytics();
  }, [user, sessionChecked]);

  return (
    <AnalyticsContext.Provider value={{ data, isLoading, error }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
} 