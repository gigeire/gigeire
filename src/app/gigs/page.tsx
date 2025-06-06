"use client";

export const dynamic = "force-dynamic";

import { Suspense } from 'react';
import GigsPageContent from "@/components/pages/GigsPageContent";

function GigsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center" style={{minHeight: 'calc(100vh - 150px)'}} >
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700 mb-4"></div>
        <p className="text-lg text-gray-600">Loading gigs...</p>
      </div>
    </div>
  );
}

export default function GigsPage() {
  return (
    <Suspense fallback={<GigsLoading />}>
      <GigsPageContent />
    </Suspense>
  );
}