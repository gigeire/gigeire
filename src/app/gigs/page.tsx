export const dynamic = "force-dynamic";

"use client";

import { Suspense, useState, useMemo, useEffect } from 'react';
import { useGigs } from "@/context/GigsContext";
import { useClients } from "@/context/ClientsContext";
import { Gig } from "@/types";
import { MainNav } from "@/components/MainNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { formatDate } from "@/utils/date";
import { statusColors } from "@/constants/ui";
import { GigModal } from "@/components/GigModal";
import { useToast } from "@/hooks/use-toast";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import GigsPageContent from "@/components/pages/GigsPageContent";

type SortField = 'name' | 'client' | 'date' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Gigs' },
  { value: 'inquiries', label: 'Inquiries' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'invoice_sent', label: 'Invoice Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

const EMPTY_STATE_MESSAGES = {
  inquiries: {
    icon: "📝",
    title: "No curious cats just yet.",
    subtitle: "Start logging your leads — inquiries will show up here when they come sniffing around."
  },
  confirmed: {
    icon: "✅",
    title: "No green lights yet.",
    subtitle: "Once a client gives you the go-ahead, you'll see their gig here, ready to roll."
  },
  invoice_sent: {
    icon: "📨",
    title: "All quiet on the invoicing front.",
    subtitle: "Fire off an invoice and it'll land here, waiting to be paid (hopefully quickly)."
  },
  paid: {
    icon: "💸",
    title: "No gigs have made it rain (yet).",
    subtitle: "Once your clients pay up, the cashflow will show up here."
  },
  overdue: {
    icon: "⏰",
    title: "No ghosts in your inbox.",
    subtitle: "If any invoices go AWOL, you'll see them here so you can chase them down (nicely, of course)."
  },
  default: {
    icon: "📂",
    title: "No gigs found.",
    subtitle: "There are no gigs for this filter."
  }
};

function isOverdue(gig: Gig): boolean {
  if (gig.status !== "invoice_sent" || !gig.invoice || !gig.invoice.dueDate) return false;
  const dueDate = new Date(gig.invoice.dueDate);
  return dueDate < new Date();
}

function getDisplayStatus(gig: Gig): string {
  if (isOverdue(gig)) return "Overdue";
  switch (gig.status) {
    case "inquiry": return "Inquiry";
    case "confirmed": return "Confirmed";
    case "invoice_sent": return "Invoice Sent";
    case "paid": return "Paid";
    default: return gig.status;
  }
}

function getStatusKey(gig: Gig): string {
  if (isOverdue(gig)) return "overdue";
  return gig.status;
}

function GigsLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <MainNav />
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