"use client";
import { useGigs } from "@/context/GigsContext";
import { Gig } from "@/types";
import { 
  ClipboardList, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Euro,
  CheckSquare
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

function isOverdue(gig: Gig): boolean {
  if (gig.status === 'paid' || !gig.invoice?.dueDate) {
    return false;
  }
  // Parse due date as UTC
  const dueDate = new Date(gig.invoice.dueDate);
  const dueUTC = Date.UTC(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());
  // Get today in UTC
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return dueUTC < todayUTC;
}

const formatEuro = (value: number) => 
  new Intl.NumberFormat('en-IE', { 
    style: 'currency', 
    currency: 'EUR', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(value);

// Defensive fee extraction
const getFeeNum = (gig: Gig) => gig.amount || 0;

export function StatusSummary() {
  const { gigs } = useGigs();
  const [isMobile, setIsMobile] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Top row metrics (status counts)
  const statusMetrics = [
    {
      label: "Inquiries",
      count: gigs.filter(gig => gig.status === "inquiry").length,
      icon: ClipboardList,
      colorClass: "text-blue-600",
      numberClass: "text-blue-600"
    },
    {
      label: "Confirmed",
      count: gigs.filter(gig => gig.status === "confirmed").length,
      icon: CheckSquare,
      colorClass: "text-green-600",
      numberClass: "text-green-600"
    },
    {
      label: "Invoice Sent",
      count: gigs.filter(gig => gig.status === "invoice_sent").length,
      icon: FileText,
      colorClass: "text-yellow-600",
      numberClass: "text-yellow-600"
    },
    {
      label: "Paid",
      count: gigs.filter(gig => gig.status === "paid").length,
      icon: CheckCircle,
      colorClass: "text-violet-700",
      numberClass: "text-violet-700"
    },
    {
      label: "Overdue",
      count: gigs.filter(gig => isOverdue(gig)).length,
      icon: AlertCircle,
      colorClass: "text-red-600",
      numberClass: "text-red-600"
    }
  ];

  // Financial overview (2x2 grid)
  const totalInquiries = gigs.filter(gig => gig.status === "inquiry").reduce((sum, gig) => sum + getFeeNum(gig), 0);
  const totalConfirmed = gigs.filter(gig => gig.status === "confirmed").reduce((sum, gig) => sum + getFeeNum(gig), 0);
  const totalInvoiced = gigs.filter(gig => gig.status === "invoice_sent" || isOverdue(gig)).reduce((sum, gig) => sum + getFeeNum(gig), 0);
  const totalEarned = gigs.filter(gig => gig.status === "paid").reduce((sum, gig) => sum + getFeeNum(gig), 0);

  // Calculate average paid gig value (matching Analytics page methodology)
  const paidGigs = gigs.filter(gig => gig.status === "paid" && gig.amount);
  const averagePaidGigValue = paidGigs.length > 0 
    ? paidGigs.reduce((sum, gig) => sum + getFeeNum(gig), 0) / paidGigs.length 
    : 0;

  const financialMetrics = [
    {
      label: "Total Inquiries",
      value: formatEuro(totalInquiries),
      colorClass: "text-blue-600"
    },
    {
      label: "Total Confirmed",
      value: formatEuro(totalConfirmed),
      colorClass: "text-green-600"
    },
    {
      label: "Total Invoiced",
      value: formatEuro(totalInvoiced),
      colorClass: "text-yellow-600"
    },
    {
      label: "Total Earned",
      value: formatEuro(totalEarned),
      colorClass: "text-violet-700"
    },
    {
      label: "Avg. Paid Gig Value",
      value: formatEuro(averagePaidGigValue),
      colorClass: "text-gray-700"
    }
  ];

  // Combine status count and euro value for mobile, omitting Overdue and Avg. Paid Gig Value
  const allMetrics = [
    {
      label: "Inquiries",
      count: gigs.filter(gig => gig.status === "inquiry").length,
      euro: totalInquiries,
      icon: ClipboardList,
      colorClass: "text-blue-600",
      numberClass: "text-blue-600",
      isCount: true,
      showEuro: true,
    },
    {
      label: "Confirmed",
      count: gigs.filter(gig => gig.status === "confirmed").length,
      euro: totalConfirmed,
      icon: CheckSquare,
      colorClass: "text-green-600",
      numberClass: "text-green-600",
      isCount: true,
      showEuro: true,
    },
    {
      label: "Invoice Sent",
      count: gigs.filter(gig => gig.status === "invoice_sent").length,
      euro: totalInvoiced,
      icon: FileText,
      colorClass: "text-yellow-600",
      numberClass: "text-yellow-600",
      isCount: true,
      showEuro: true,
    },
    {
      label: "Paid",
      count: gigs.filter(gig => gig.status === "paid").length,
      euro: totalEarned,
      icon: CheckCircle,
      colorClass: "text-violet-700",
      numberClass: "text-violet-700",
      isCount: true,
      showEuro: true,
    },
    // Overdue is omitted on mobile
    // Financial only metrics (not already merged above)
    // Only add "Total Earned" if not already included? Already included with Paid above.
    // No need to add "Avg. Paid Gig Value" on mobile
  ];

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="border-t border-gray-200 dark:border-gray-700" />
      <div className="flex flex-col justify-center pt-4 pb-4">
        {/* Mobile: 2×4 Grid Layout */}
        {isMobile ? (
          <div className="grid grid-cols-2 gap-2 px-2">
            {allMetrics.map((metric) => {
              const Icon = metric.icon;
              // Map label to status param as on desktop
              const statusMap: Record<string, string> = {
                'Inquiries': 'inquiries',
                'Confirmed': 'confirmed',
                'Invoice Sent': 'invoice_sent',
                'Paid': 'paid'
              };
              const statusParam = statusMap[metric.label] || metric.label.toLowerCase();
              return (
                <Link
                  key={metric.label}
                  href={`/gigs?status=${statusParam}`}
                  className="block transition-transform hover:scale-105 active:scale-100 focus:scale-105 hover:shadow-md focus:shadow-md"
                >
                  <div
                    className="flex flex-col items-center justify-center rounded-lg bg-white shadow border border-gray-100 px-2 py-2 transition-shadow"
                  >
                    <div className="flex items-center gap-1 mb-1">
                      {metric.isCount && <Icon className={`w-4 h-4 ${metric.colorClass}`} />}
                      <span className="text-[10px] font-medium text-gray-500 uppercase whitespace-nowrap">{metric.label}</span>
                    </div>
                    <span className={`text-xl font-bold ${metric.colorClass}`}>
                      {formatEuro(metric.euro)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <>
            {/* Desktop: Two rows of five cards each */}
            {/* Top row: status cards */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {statusMetrics.map((metric) => {
                const Icon = metric.icon;
                // Map label to proper status parameter
                const statusMap: Record<string, string> = {
                  'Inquiries': 'inquiries',
                  'Confirmed': 'confirmed', 
                  'Invoice Sent': 'invoice_sent',
                  'Paid': 'paid',
                  'Overdue': 'overdue'
                };
                const statusParam = statusMap[metric.label] || metric.label.toLowerCase();
                
                return (
                  <Link
                    key={metric.label}
                    href={`/gigs?status=${statusParam}`}
                    className="block transition-transform hover:scale-105"
                  >
                    <div className="flex flex-col items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-2 min-w-0 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-center w-full justify-center gap-2 mb-2">
                        <Icon className={`w-5 h-5 ${metric.colorClass}`} />
                        <span className="text-xs uppercase text-gray-500 tracking-wide whitespace-nowrap hover:text-gray-700">{metric.label}</span>
                      </div>
                      <span className={`text-xl font-bold ${metric.numberClass} transition-all`}>{metric.count}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
            {/* Second row: financial overview */}
            <div className="grid grid-cols-5 gap-3">
              {financialMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="flex flex-col items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 px-3 py-4 min-w-0"
                >
                  <span className="text-xs uppercase text-gray-500 mb-1 tracking-wide text-center">{metric.label}</span>
                  <span className={`text-xl font-bold ${metric.colorClass}`}>{metric.value}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
} 