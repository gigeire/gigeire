import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Gig } from '@/types';

interface GigsContextType {
  gigs: Gig[];
  loading: boolean;
  error: string | null;
  addGig: (gig: Omit<Gig, 'id' | 'created_at'>) => Promise<void>;
  updateGig: (id: string, updates: Partial<Gig>) => Promise<void>;
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

  const checkGigLimit = async (): Promise<{ canAddGig: boolean; currentCount: number; limit: number }> => {
    if (!userId) {
      console.log('[checkGigLimit] No userId available');
      return { canAddGig: false, currentCount: 0, limit: 0 };
    }
    try {
      console.log('[checkGigLimit] Using userId:', userId);
      console.log("[checkGigLimit] Current user ID:", userId);
      
      // Fetch subscription plan from our new API route
      const response = await fetch('/api/user/subscription');
      if (!response.ok) {
        console.error('[checkGigLimit] Failed to fetch subscription plan:', await response.text());
        return { canAddGig: false, currentCount: 0, limit: 10 };
      }
      
      const { subscriptionPlan } = await response.json();
      console.log('[checkGigLimit] Subscription plan:', subscriptionPlan);

      // Count gigs for this user
      const { count, error } = await supabase
        .from("gigs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      console.log("[checkGigLimit] Gig count result:", { count, error });

      if (error) {
        console.error('[checkGigLimit] Error fetching gigs:', error);
        throw error;
      }

      const currentCount = count || 0;
      const plan = subscriptionPlan || 'free';
      let limit = 10; // Default for free tier

      if (plan === 'premium') {
        limit = Infinity; // Or a very high number
      }
      
      const canAddGig = currentCount < limit;
      console.log('[checkGigLimit] Result:', {
        currentCount,
        limit,
        canAddGig,
        plan
      });
      
      return { canAddGig, currentCount, limit };

    } catch (err) {
      console.error('[checkGigLimit] Error:', err);
      setError(err instanceof Error ? err.message : "Could not verify gig limit.");
      return { canAddGig: false, currentCount: 0, limit: 10 };
    }
  };

  // ... existing code ...
} 