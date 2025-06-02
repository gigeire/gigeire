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
      return { canAddGig: false, currentCount: 0, limit: 0 }; // Should not happen if called correctly
    }
    try {
      console.log('[checkGigLimit] Using uid:', userId);
      
      // Fetch subscription plan from our new API route
      const response = await fetch('/api/user/subscription');
      if (!response.ok) {
        console.error('Failed to fetch subscription plan:', await response.text());
        return { canAddGig: false, currentCount: 0, limit: 10 }; // Default to restrictive on error
      }
      
      const { subscriptionPlan } = await response.json();
      console.log('[checkGigLimit] Subscription plan:', subscriptionPlan);

      // Count gigs for this user (no deleted_at filter)
      const { count, error: countError } = await supabase
        .from('gigs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (countError) {
        throw countError;
      }

      const currentCount = count || 0;
      const plan = subscriptionPlan || 'free';
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

  // ... existing code ...
} 