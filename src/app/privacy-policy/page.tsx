"use client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/settings">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Settings
            </Button>
          </Link>
        </div>

        {/* Privacy Policy Content */}
        <div className="bg-white rounded-2xl shadow p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Privacy Policy</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-sm text-gray-600 mb-6">
              <strong>Effective Date: 29 May 2025</strong>
            </p>

            <p className="mb-6 text-gray-700">
              GigÉire (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use the GigÉire mobile and web application (&quot;App&quot;).
            </p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Information We Collect:</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li><strong>Account Data:</strong> Your name, email, and business information provided during registration.</li>
              <li><strong>App Usage Data:</strong> Gigs, clients, and documents you store in the app. This data is used only to provide core functionality.</li>
            </ul>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">What We Don&apos;t Do:</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>We do not sell your data.</li>
              <li>We do not share your data with third parties for marketing purposes.</li>
            </ul>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Data Storage:</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>All data is securely stored using Supabase, a GDPR-compliant provider.</li>
              <li>We do not use cookies or third-party trackers.</li>
            </ul>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Your Rights:</h2>
            <ul className="list-disc pl-6 mb-6 space-y-2 text-gray-700">
              <li>You can request to export or delete your data by contacting hello@gigeire.com.</li>
              <li>You can delete your account at any time through the app or by contacting us.</li>
            </ul>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Contact:</h2>
            <p className="text-gray-700">
              If you have any questions, contact us at{" "}
              <a 
                href="mailto:hello@gigeire.com" 
                className="text-green-600 hover:text-green-700 font-medium underline"
              >
                hello@gigeire.com
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 