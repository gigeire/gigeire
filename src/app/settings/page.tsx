"use client";

export const dynamic = "force-dynamic";

import { MainNav } from "@/components/MainNav";
import { Button } from "@/components/ui/button";
import { Crown, Gift, Mail, ExternalLink, LogOut, Shield, FileText, MessageCircle, Instagram } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  // State for Stripe checkout process
  const [stripeCheckoutLoading, setStripeCheckoutLoading] = useState(false);
  const [stripeCheckoutError, setStripeCheckoutError] = useState<string | null>(null);

  // State for user plan
  const [userPlan, setUserPlan] = useState<'free' | 'premium' | undefined>(undefined);
  const [planLoading, setPlanLoading] = useState<boolean>(true);
  const [planFetchError, setPlanFetchError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPlan = async () => {
      console.log("[SettingsPage] Fetching user plan...");
      setPlanLoading(true);
      setPlanFetchError(null);
      setUserPlan(undefined);

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[SettingsPage] Session error:", sessionError.message);
          setPlanFetchError("Auth: Could not retrieve user session.");
          setUserPlan(undefined);
          return;
        }

        if (!session?.user?.id) {
          console.log("[SettingsPage] User not authenticated.");
          setPlanFetchError("Auth: User not authenticated.");
          setUserPlan(undefined);
          return;
        }

        const userId = session.user.id;
        console.log(`[SettingsPage] Authenticated user ID: ${userId}`);

        const { data: userData, error: userFetchError } = await supabase
          .from("users")
          .select("plan")
          .eq("id", userId)
          .single();

        console.log("[SettingsPage] Raw userData from \'users\' table:", userData);
        console.log("[SettingsPage] Error fetching from \'users\' table:", userFetchError);

        if (userFetchError) {
          console.error("[SettingsPage] Error fetching user plan from \'users\' table:", userFetchError.message);
          setPlanFetchError(`DB: Failed to fetch plan. (${userFetchError.message})`);
          setUserPlan("free"); // Default to free on DB error
          return;
        }

        if (userData && typeof userData.plan === 'string') {
          const fetchedPlan = userData.plan.trim().toLowerCase();
          console.log(`[SettingsPage] Processed plan string: '${fetchedPlan}'`);
          console.log(`[SettingsPage] Raw plan value: '${userData.plan}'`);
          console.log(`[SettingsPage] Plan type: ${typeof userData.plan}`);
          if (fetchedPlan === "premium") {
            console.log("[SettingsPage] Setting user plan to: premium");
            setUserPlan("premium");
          } else {
            console.log(`[SettingsPage] Fetched plan '${fetchedPlan}' is not 'premium'. Setting to: free`);
            setUserPlan("free");
          }
        } else {
          console.log("[SettingsPage] No user data row found, or plan field is not a string. UserData:", userData);
          console.log("[SettingsPage] Plan field type:", typeof userData?.plan);
          setPlanFetchError("DB: No plan information found or plan field is invalid.");
          setUserPlan("free"); // Default to free if no/invalid plan data
        }

      } catch (err: any) {
        console.error("[SettingsPage] Unexpected error in fetchUserPlan:", err);
        setPlanFetchError(`Unexpected error: ${err.message}`);
        setUserPlan("free"); // Default to free on unexpected error
      } finally {
        setPlanLoading(false);
        console.log("[SettingsPage] Finished fetching user plan.");
      }
    };

    fetchUserPlan();
  }, [supabase]);

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await supabase.auth.signOut();
      router.replace("/auth");
    }
  };

  const handleUpgradeClick = async () => {
    setStripeCheckoutLoading(true);
    setStripeCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setStripeCheckoutError(data.error || "Failed to start checkout session");
      }
    } catch (err) {
      setStripeCheckoutError("Network error. Please try again.");
    } finally {
      setStripeCheckoutLoading(false);
    }
  };

  const handleReferFriendClick = () => {
    const mailtoLink = "mailto:hello@gigeire.com?subject=Referral&body=Hi! I want to refer a freelancer: [Insert Name + Email]";
    window.location.href = mailtoLink;
  };

  const supportEmail = "hello@gigeire.com";

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center text-gray-800">Settings</h1>
        <MainNav />
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Current Plan Section */}
          <section className="bg-white rounded-2xl shadow p-6 md:p-8 flex flex-col justify-between items-center text-center h-full">
            {planLoading ? (
              <div className="flex flex-col items-center justify-center h-40 w-full">
                <svg className="animate-spin h-8 w-8 text-gray-400 mb-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V4a10 10 0 00-9.95 9.5H2m2 0A8 8 0 0112 4v-.5A9.5 9.5 0 002.5 12H4zm8-8a8 8 0 018 8h.5A9.5 9.5 0 0012 2.5V4z" />
                </svg>
                <span className="text-gray-500">Loading your plan...</span>
              </div>
            ) : planFetchError ? (
              <div className="py-4 h-40 flex flex-col justify-center">
                <p className="text-lg font-semibold text-gray-700 mb-2">Plan Information</p>
                <p className="text-sm text-red-600">{planFetchError}</p>
                <p className="text-xs text-gray-400 mt-1">Please refresh or contact support.</p>
              </div>
            ) : userPlan === 'free' ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <Crown className="w-6 h-6 text-amber-500" strokeWidth={2} />
                    <h2 className="text-xl font-bold text-gray-800">Free Plan</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Limited to 10 gigs total. Upgrade to unlock unlimited gigs and support our development!
                  </p>
                </div>
                <Button
                  onClick={handleUpgradeClick}
                  className="w-3/4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:outline-none"
                  aria-label="Upgrade to Premium"
                  disabled={stripeCheckoutLoading}
                >
                  {stripeCheckoutLoading ? "Redirecting..." : "Upgrade to Premium"}
                </Button>
                {stripeCheckoutError && <div className="text-red-600 text-sm mt-2 w-full">{stripeCheckoutError}</div>}
              </>
            ) : userPlan === 'premium' ? (
              <>
                <div>
                  <div className="flex items-center gap-2 mb-4 justify-center">
                    <Crown className="w-6 h-6 text-amber-500 fill-amber-400" strokeWidth={0} />
                    <h2 className="text-xl font-bold text-gray-800">Premium Plan</h2>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">
                    Unlimited gigs — thank you for supporting our development!
                  </p>
                </div>
                <a
                  href={`mailto:${supportEmail}`}
                  className="w-3/4 flex justify-center"
                  aria-label="Contact Support"
                >
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full px-4 py-2 text-green-700 border-green-200 hover:bg-green-50 focus:ring-2 focus:ring-green-400 focus:ring-offset-2 focus:outline-none text-sm"
                  >
                    Contact Support
                  </Button>
                </a>
              </>
            ) : ( 
              <div className="py-4 h-40 flex flex-col justify-center">
                <p className="text-lg font-semibold text-gray-700 mb-2">Plan Information</p>
                <p className="text-sm text-gray-500">Could not determine your current plan.</p>
                <p className="text-xs text-gray-400 mt-1">Please contact support.</p>
              </div>
            )}
          </section>

          {/* Refer a Friend Section */}
          <section className="bg-white rounded-2xl shadow p-6 md:p-8 flex flex-col justify-between items-center text-center h-full">
            <div>
              <div className="flex items-center gap-2 mb-4 justify-center">
                <Gift className="w-6 h-6 text-pink-500" aria-hidden="true" />
                <h2 className="text-xl font-bold text-gray-800">Refer a Friend</h2>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                Invite a freelancer. You both get 1 free month of Premium.
              </p>
            </div>
            <Button
              onClick={handleReferFriendClick}
              className="w-3/4 bg-pink-500 hover:bg-pink-600 text-white font-semibold focus:ring-2 focus:ring-pink-400 focus:ring-offset-2 focus:outline-none"
              aria-label="Refer a Friend"
            >
              Refer a Friend
            </Button>
          </section>
        </div>

        {/* Other sections: Support, Follow Us, Account & Privacy, Logout */}
        <div className="mt-8 space-y-6">
          <section className="bg-white rounded-2xl shadow p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <MessageCircle className="w-6 h-6 text-green-500" />
              <h2 className="text-xl font-bold text-gray-800">Support</h2>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-500" />
              <span className="text-gray-600">Need help? Have product feedback? Contact us at</span>
              <a
                href="mailto:hello@gigeire.com"
                className="text-green-600 hover:text-green-700 font-medium underline"
              >
                hello@gigeire.com
              </a>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Instagram className="w-6 h-6 text-pink-500" />
              <h2 className="text-xl font-bold text-gray-800">Follow Us</h2>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600">See app tips, updates and memes — follow us on Instagram.</p>
              </div>
              <a
                href="https://instagram.com/gigeire"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors font-medium text-gray-700"
              >
                @gigeire
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6 md:p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Account & Privacy</h2>
            <div className="space-y-4">
              <Link
                href="/privacy-policy"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-700">Privacy Policy</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </Link>
              <Link
                href="/terms-of-service"
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <span className="font-medium text-gray-700">Terms of Service</span>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow p-6 md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Account Actions</h2>
                <p className="text-gray-500">Sign out of your GigÉire account</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="flex items-center gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
} 