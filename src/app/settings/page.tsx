"use client";
import { MainNav } from "@/components/MainNav";
import { Button } from "@/components/ui/button";
import { Mail, ExternalLink, LogOut, Crown, Shield, FileText, MessageCircle, Instagram, Gift } from "lucide-react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const supabase = createClientComponentClient();
  const router = useRouter();

  const handleLogout = async () => {
    if (confirm("Are you sure you want to logout?")) {
      await supabase.auth.signOut();
      router.replace("/auth");
    }
  };

  const handleUpgradeClick = () => {
    // Open Stripe checkout in new tab
    window.open("https://buy.stripe.com/00w5kCfzc4SA9okbSg3gk01", "_blank");
  };

  const handleReferFriendClick = () => {
    const mailtoLink = "mailto:hello@gigeire.com?subject=Referral&body=Hi! I want to refer a freelancer: [Insert Name + Email]";
    window.location.href = mailtoLink;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center text-gray-800">Settings</h1>
        <MainNav />
        
        <div className="mt-8 space-y-6">
          {/* Current Plan Section */}
          <section className="bg-white rounded-2xl shadow p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Crown className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-gray-800">Current Plan</h2>
            </div>
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="sm:order-1 mb-2 sm:mb-0">
                <p className="text-lg font-semibold text-gray-700">Free Plan</p>
                <p className="text-sm text-gray-500">
                  Limited to 10 gigs total.<br />
                  Upgrade to unlock unlimited gigs and support our development!
                </p>
              </div>
              <Button 
                onClick={handleUpgradeClick}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white sm:order-2"
              >
                Upgrade to Premium
              </Button>
            </div>
          </section>

          {/* Refer a Friend Section - STYLED */}
          <section className="bg-white rounded-2xl shadow p-6 md:p-8">
            <div className="flex items-center gap-3 mb-4">
              <Gift className="w-6 h-6 text-pink-500" /> 
              <h2 className="text-xl font-bold text-gray-800">Refer a Friend</h2>
            </div>
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left">
              <div className="sm:order-1">
                <p className="text-sm text-gray-500 mb-2 sm:mb-0">
                  Invite a freelancer. You both get 1 free month of Premium.
                </p>
                </div>
              <Button 
                onClick={handleReferFriendClick}
                className="bg-pink-500 hover:bg-pink-600 text-white sm:order-2"
              >
                <span role="img" aria-label="gift" className="mr-2">🎁</span>
                Refer a Friend
              </Button>
            </div>
          </section>

          {/* Support Section */}
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

          {/* Follow Us Section */}
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

          {/* Account & Privacy Section */}
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

          {/* Logout Section */}
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