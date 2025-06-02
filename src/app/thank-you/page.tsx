"use client";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";
import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 flex items-center justify-center p-4 md:p-8">
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-white rounded-2xl shadow p-6 md:p-8">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            Thanks for upgrading to Premium!
          </h1>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            You&apos;ll be upgraded shortly — we&apos;ve received your payment and are on it!
          </p>
          
          <Link href="/dashboard">
            <Button className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white">
              <Home className="w-4 h-4" />
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
} 