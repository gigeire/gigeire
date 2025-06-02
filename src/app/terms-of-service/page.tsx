"use client";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function TermsOfServicePage() {
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

        {/* Terms of Service Content */}
        <div className="bg-white rounded-2xl shadow p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Terms of Service</h1>
          
          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-sm text-gray-600 mb-6">
              <strong>Effective Date: 29 May 2025</strong>
            </p>

            <p className="mb-6 text-gray-700">
              By using the GigÉire mobile or web app, you agree to the following:
            </p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">1. Use of the App:</h2>
            <p className="mb-6 text-gray-700">
              You may use GigÉire only for lawful freelance or client management purposes. You are responsible for any content you add.
            </p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">2. Data Ownership:</h2>
            <p className="mb-6 text-gray-700">
              You retain full ownership of your gigs, clients, and documents. We simply store them for your use.
            </p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">3. Paid Features:</h2>
            <p className="mb-6 text-gray-700">
              Free accounts may be limited in functionality. Upgrading to Premium removes limits on gig usage.
            </p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">4. Account Termination:</h2>
            <p className="mb-6 text-gray-700">
              We reserve the right to suspend or delete accounts that violate our terms.
            </p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">5. Liability:</h2>
            <p className="mb-6 text-gray-700">
              GigÉire is provided &quot;as is.&quot; We are not liable for any financial loss, lost data, or damages arising from the use of the app.
            </p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">6. Changes to Terms:</h2>
            <p className="mb-6 text-gray-700">
              We may update these Terms from time to time. Continued use of the app constitutes agreement to the updated terms.
            </p>

            <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Contact:</h2>
            <p className="text-gray-700">
              Questions? Email us at{" "}
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