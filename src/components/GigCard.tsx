"use client";
import { useGigs } from "@/context/GigsContext";
import { Gig, GigStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, CheckCircle, MessageSquare, CheckSquare, ChevronDown, Info } from "lucide-react";
import { formatDistanceToNowStrict, isAfter } from "date-fns";
import { formatDate } from "@/utils/date";
import { statusColors, feeColors } from "@/constants/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { jsPDF } from "jspdf";
import { useSenderInfo } from "@/context/SenderInfoContext";
import { SenderInfoModal } from "./SenderInfoModal";
import { StandardInvoiceModal } from "./StandardInvoiceModal";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useToast } from "@/hooks/use-toast";
import Link from 'next/link';
import { isOverdue, getDisplayStatus, getStatusKey } from "@/utils/gigs";

function getDueDateText(gig: Gig): string | null {
  if (gig.status !== "invoice_sent" || !gig.invoice || !gig.invoice.dueDate) return null;
  const dueDate = new Date(gig.invoice.dueDate);
  const now = new Date();
  
  if (isAfter(dueDate, now)) {
    return `Due in ${formatDistanceToNowStrict(dueDate, { addSuffix: false })}`;
  } else {
    return `Due ${formatDistanceToNowStrict(dueDate, { addSuffix: true })}`;
  }
}

interface GigCardProps {
  gig: Gig;
  onEdit?: (gig: Gig) => void;
  onClone?: (gig: Gig) => void;
  onDelete: (id: string) => void;
  onStatusChange: (gigId: string, newStatus: GigStatus) => Promise<void>;
}

export function GigCard({ gig, onEdit, onClone, onDelete, onStatusChange }: GigCardProps) {
  const { updateGig } = useGigs();
  const isInvoiceOverdue = isOverdue(gig);
  const dueDateText = getDueDateText(gig);
  const { senderInfo, loading: senderInfoLoading } = useSenderInfo();
  const [showSenderInfoModal, setShowSenderInfoModal] = useState(false);
  const [showStandardInvoiceModal, setShowStandardInvoiceModal] = useState(false);
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  // Validate sender info before showing invoice modal
  const validateSenderInfo = useCallback(() => {
    if (senderInfoLoading) {
      console.debug("[GigCard] Sender info is still loading");
      return false;
    }
    if (!senderInfo?.name?.trim() || !senderInfo?.email?.trim()) {
      console.debug("[GigCard] Missing required sender info:", { name: senderInfo?.name, email: senderInfo?.email });
      return false;
    }
    return true;
  }, [senderInfo, senderInfoLoading]);

  const displayStatus = getDisplayStatus(gig);

  const handleEdit = () => {
    if (onEdit) {
      onEdit(gig);
    } else {
      console.warn("onEdit prop was not provided to GigCard. Cannot open edit modal.");
    }
  };
  const handleDelete = () => onDelete(gig.id);
  const handleLocalStatusChange = async (newStatus: GigStatus) => {
    await onStatusChange(gig.id, newStatus);
  };

  const getDynamicStatusOptions = () => {
    const options: { label: string; value: GigStatus; icon: React.ElementType }[] = [];
    switch (gig.status) {
      case "inquiry":
        options.push({ label: "Mark as Confirmed", value: "confirmed", icon: CheckSquare });
        break;
      case "confirmed":
        options.push({ label: "Mark as Invoice Sent", value: "invoice_sent", icon: FileText });
        break;
      case "invoice_sent":
      case "overdue":
        options.push({ label: "Mark as Paid", value: "paid", icon: CheckCircle });
        break;
      case "paid":
        break;
      default:
        break;
    }
    return options;
  };

  const dynamicStatusOptions = getDynamicStatusOptions();
  const isStatusClickable = true;

  const handleGenerateInvoiceClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.debug("[GigCard] Generate invoice clicked, validating sender info");
    
    if (!validateSenderInfo()) {
      console.debug("[GigCard] Invalid sender info, showing sender info modal");
      setShowSenderInfoModal(true);
      return;
    }
    
    console.debug("[GigCard] Sender info valid, showing invoice modal");
    setShowStandardInvoiceModal(true);
  };

  const formatEuro = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  let dynamicCtaButtonContent: { text: string; action: (e: React.MouseEvent) => void; visible: boolean } = {
    text: "",
    action: () => {},
    visible: false,
  };

  if (gig.status === "inquiry") {
    dynamicCtaButtonContent = {
      text: "Mark as Confirmed",
      action: (e) => { e.stopPropagation(); e.preventDefault(); onStatusChange(gig.id, "confirmed"); },
      visible: true,
    };
  } else if (gig.status === "confirmed") {
    dynamicCtaButtonContent = {
      text: "Generate Invoice",
      action: handleGenerateInvoiceClick,
      visible: true,
    };
  } else if (gig.status === "invoice_sent" || gig.status === "overdue") {
    dynamicCtaButtonContent = {
      text: "Mark as Paid",
      action: (e) => { e.stopPropagation(); e.preventDefault(); onStatusChange(gig.id, "paid"); },
      visible: true,
    };
  }

  // Determine the badge classes based on status, applying updated confirmed colors
  const getStatusBadgeClasses = () => {
    if (isInvoiceOverdue) {
      return statusColors.overdue;
    }
    if (gig.status === "confirmed") {
      return "bg-green-100 text-green-800 border border-green-200";
    }
    return statusColors[gig.status];
  };

  const getAmountBadgeClasses = () => {
    if (isInvoiceOverdue) {
      return statusColors.overdue;
    }
    if (gig.status === "confirmed") {
      return "bg-green-100 text-green-800 border border-green-200";
    }
    return statusColors[gig.status];
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    let targetElement = e.target as HTMLElement;
    while (targetElement && targetElement !== e.currentTarget) {
      if (targetElement.tagName === 'BUTTON' || 
          targetElement.getAttribute('role') === 'button' || 
          targetElement.getAttribute('role') === 'menuitem' || 
          targetElement.closest('[data-state="open"]')) {
        return;
      }
      targetElement = targetElement.parentElement as HTMLElement;
    }
    handleEdit();
  };

  // Automatically show SenderInfoModal if sender info is invalid when attempting to generate invoice
  useEffect(() => {
    if (showStandardInvoiceModal && !validateSenderInfo()) {
      console.debug("[GigCard] Sender info became invalid, switching to sender info modal");
      setShowStandardInvoiceModal(false);
      setShowSenderInfoModal(true);
    }
  }, [showStandardInvoiceModal, validateSenderInfo]);

  // Optionally, clear sender info from localStorage on logout (if logout logic is here)
  // If not, this should be handled in the auth/logout logic or SenderInfoContext

  return (
    <>
      <div 
        className="relative p-5 sm:p-6 bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 focus-within:shadow-lg focus-within:-translate-y-1 mb-3 sm:mb-2 cursor-pointer group" 
        onClick={handleCardClick} 
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCardClick(e as any); }}
        tabIndex={0}
      >
        <div className="flex justify-between items-start mb-3 sm:mb-1">
          <h3 className="text-lg font-semibold leading-tight text-gray-900">
            {gig.title}
          </h3>
          <div className="flex flex-col items-end gap-1">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold tracking-wide opacity-100 ${getStatusBadgeClasses()} sm:group-hover/status:opacity-80`}>
              {displayStatus}
            </span>
            {dueDateText && (
              <span className={`text-xs mt-1 ${isInvoiceOverdue ? 'text-red-600' : 'text-gray-600'}`}>{dueDateText}</span>
            )}
          </div>
        </div>
        <div className="mb-4 sm:mb-2">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs sm:hidden text-gray-500">
            <span>{formatDate(gig.date)}</span>
            {gig.location && <span className="mx-1">•</span>}
            {gig.location && <span>{gig.location}</span>}
            {gig.client && <span className="mx-1">•</span>}
            {gig.client_id && gig.client ? (
              <Link href={`/clients/${encodeURIComponent(gig.client.toLowerCase().replace(/ /g, '-'))}`} 
                    className="hover:underline hover:text-gray-700 cursor-pointer">
                {gig.client}
              </Link>
            ) : (
              gig.client && <span>{gig.client}</span>
            )}
          </div>
          <div className="hidden sm:flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-500">
            <span>{formatDate(gig.date)}</span>
            <span>{gig.location}</span>
            {gig.client_id && gig.client ? (
              <Link href={`/clients/${encodeURIComponent(gig.client.toLowerCase().replace(/ /g, '-'))}`} 
                    className="hover:underline hover:text-gray-700 cursor-pointer">
                {gig.client}
              </Link>
            ) : (
              <span>{gig.client || 'N/A'}</span>
            )}
          </div>
        </div>
        <div className="flex justify-between items-end mt-5 sm:mt-4">
          <span 
            className={`text-1xl font-extrabold rounded-full px-4 py-1 shadow-sm ${getAmountBadgeClasses()}`}
          >
            {formatEuro(gig.amount)}
          </span>

          {/* Desktop (sm+) action buttons logic */}
          <div className="hidden sm:flex gap-2">
            {gig.status === "inquiry" && (
              <Button
                className="bg-black text-white rounded-full text-xs px-3 py-1 font-semibold shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none transition-transform hover:scale-105"
                size="sm"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onStatusChange(gig.id, "confirmed"); }}
              >
                Mark as Confirmed
              </Button>
            )}
            {gig.status === "confirmed" && (
              <Button
                className="bg-black text-white rounded-full text-xs px-3 py-1 font-semibold shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none transition-transform hover:scale-105"
                size="sm"
                tabIndex={0}
                onClick={handleGenerateInvoiceClick}
              >
                Generate Invoice
              </Button>
            )}
            {gig.status === "invoice_sent" && !gig.invoice && (
              <>
                <Button
                  className="bg-black text-white rounded-full text-xs px-3 py-1 font-semibold shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none transition-transform hover:scale-105"
                  size="sm"
                  tabIndex={0}
                  onClick={handleGenerateInvoiceClick}
                >
                  Generate Invoice
                </Button>
                <Button
                  className="bg-black text-white rounded-full text-xs px-3 py-1 font-semibold shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none transition-transform hover:scale-105"
                  size="sm"
                  tabIndex={0}
                  onClick={(e) => { e.stopPropagation(); onStatusChange(gig.id, "paid"); }}
                >
                  Mark as Paid
                </Button>
              </>
            )}
            {gig.status === "invoice_sent" && gig.invoice && (
              <Button
                className="bg-black text-white rounded-full text-xs px-3 py-1 font-semibold shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none transition-transform hover:scale-105"
                size="sm"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); onStatusChange(gig.id, "paid"); }}
              >
                Mark as Paid
              </Button>
            )}
          </div>

          {/* Mobile (below sm): keep existing single CTA button logic */}
          {dynamicCtaButtonContent.visible && (
            <div className="sm:hidden">
              <Button
                className="bg-black text-white rounded-full text-xs px-3 py-1 font-semibold shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none transition-transform hover:scale-105"
                size="sm"
                tabIndex={0}
                onClick={(e) => { 
                  e.stopPropagation();
                  dynamicCtaButtonContent.action(e); 
                }}
              >
                {dynamicCtaButtonContent.text}
              </Button>
            </div>
          )}
        </div>
      </div>
      <StandardInvoiceModal
        open={showStandardInvoiceModal}
        onOpenChange={setShowStandardInvoiceModal}
        gig={gig}
        senderInfo={senderInfo}
      />
      <SenderInfoModal
        open={showSenderInfoModal}
        onOpenChange={setShowSenderInfoModal}
      />
    </>
  );
} 