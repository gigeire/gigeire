"use client";

import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { Gig } from "@/types"; 
import { SenderInfo } from "@/context/SenderInfoContext"; // Corrected import path
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { jsPDF } from "jspdf";
import { formatDate } from "@/utils/date";
import { useGigs } from "@/context/GigsContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useToast } from "@/hooks/use-toast";
import { useInvoices } from "@/context/InvoicesContext"; // Added
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Temporarily commented out

interface StandardInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gig: Gig | null;
  senderInfo: SenderInfo | null;
  // onInvoiceGenerated?: () => void; 
}

interface FormErrors {
  dueDate?: string;
  vatRate?: string;
  amount?: string;
  client?: string;
}

export function StandardInvoiceModal({
  open,
  onOpenChange,
  gig,
  senderInfo,
}: StandardInvoiceModalProps) {
  const { updateGig } = useGigs();
  const { refetch: refetchInvoices } = useInvoices(); // Added
  const supabase = createClientComponentClient();
  const { toast } = useToast();

  const [dueDate, setDueDate] = useState<Date>(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [vatRate, setVatRate] = useState("23");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false); // For preview button loading state
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [hasGeneratedInvoice, setHasGeneratedInvoice] = useState(false);

  const isMobile = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 767px)').matches;

  useEffect(() => {
    if (open) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const timestampSuffix = String(Date.now()).slice(-5);
      const newRawInvoiceNumber = Date.now();
      setInvoiceNumber(`INV-${currentYear}-${timestampSuffix}`);
      
      const d = new Date();
      if (gig?.date) {
        const gigDate = new Date(gig.date);
        d.setTime(gigDate.getTime());
        d.setDate(gigDate.getDate() + 7); // Default due date 7 days after gig date
      } else {
        d.setDate(d.getDate() + 7); // Default due date 7 days from now if no gig date
      }
      setDueDate(d);
      setVatRate("23"); // Default VAT rate
      setErrors({});
      setHasAttemptedSubmit(false);
      setHasGeneratedInvoice(false);
    }
  }, [open, gig]);

  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    
    if (!dueDate) {
      newErrors.dueDate = "Due date is required";
    }
    
    if (!gig?.client || !gig?.client.trim()) {
      newErrors.client = "Client is required for invoice";
    }
    
    if (!gig?.amount || gig.amount <= 0) {
      newErrors.amount = "Gig amount must be greater than 0";
    }
    
    const vatRateNum = parseFloat(vatRate);
    if (isNaN(vatRateNum) || vatRateNum < 0 || vatRateNum > 100) {
      newErrors.vatRate = "VAT rate must be between 0 and 100";
    }
    
    return newErrors;
  }, [dueDate, vatRate, gig]);

  useEffect(() => {
    if (hasAttemptedSubmit) {
      const newErrors = validateForm();
      setErrors(newErrors);
    }
  }, [validateForm, hasAttemptedSubmit]);

  const generatePdfDocument = () => {
    if (!gig || !senderInfo?.name) {
      // This case should be prevented by button disabled state, but as a safeguard:
      toast({ title: "Error", description: "Missing gig data or sender information for PDF generation.", variant: "destructive" });
      return null;
    }
    const subtotal = gig.amount || 0;
    const vatRateNum = parseFloat(vatRate) || 0;
    const vatAmount = Math.round(subtotal * (vatRateNum / 100) * 100) / 100;
    const total = subtotal + vatAmount;
    const finalInvoiceNumberString = invoiceNumber;

    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = 210;
    const margin = 20;
    let yPos = 24;
    doc.setFont("helvetica", "");

    const senderLines = [
      { text: senderInfo.name, style: "bold", size: 15 },
      senderInfo.email ? { text: senderInfo.email, style: "normal", size: 10 } : null,
      senderInfo.phone ? { text: senderInfo.phone, style: "normal", size: 10 } : null,
      senderInfo.website ? { text: senderInfo.website, style: "normal", size: 10 } : null,
      senderInfo.vatNumber ? { text: `VAT: ${senderInfo.vatNumber}`, style: "normal", size: 10 } : null,
    ].filter(Boolean) as { text: string, style: string, size: number }[];

    const metaLabels = ["Invoice #", "Date", "Due"];
    const metaValues = [finalInvoiceNumberString, formatDate(new Date()), formatDate(dueDate)];
    const metaX = pageWidth - margin - 60;
    let metaY = yPos;
    for (let i = 0; i < metaLabels.length; i++) {
      doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(120);
      doc.text(metaLabels[i].toUpperCase(), metaX, metaY);
      doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(30);
      doc.text(metaValues[i], metaX + 32, metaY);
      metaY += 7;
    }
    doc.setTextColor(30);

    let senderY = yPos;
    for (const line of senderLines) {
      doc.setFont("helvetica", line.style).setFontSize(line.size);
      doc.text(line.text, margin, senderY);
      senderY += line.size === 15 ? 7 : 6;
    }
    yPos = Math.max(senderY, metaY) + 10;

    doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(120);
    doc.text("BILLED TO", margin, yPos); 
    yPos += isMobile ? 12 : 8; // Extra space on mobile
    doc.setFontSize(12).setFont("helvetica", "bold").setTextColor(30);
    doc.text(gig.client || "N/A", margin, yPos); yPos += 6;
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text(gig.title || "N/A", margin, yPos); yPos += 5;
    doc.text(formatDate(gig.date), margin, yPos); yPos += 5;
    if (gig.location) { doc.text(gig.location, margin, yPos); yPos += 5; }
    yPos += 10;

    doc.setFontSize(8).setFont("helvetica", "normal").setTextColor(120);
    doc.text("FEE BREAKDOWN", margin, yPos); yPos += 5;
    doc.setTextColor(30).setLineWidth(0.1);
    doc.line(margin, yPos, pageWidth - margin, yPos); yPos += 5;
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text("Subtotal", margin + 2, yPos);
    doc.text(`€ ${subtotal.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: "right" }); yPos += 6;
    doc.text(`VAT (${vatRateNum.toFixed(1).replace(/\\.0$/, "")}%)`, margin + 2, yPos);
    doc.text(`€ ${vatAmount.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: "right" }); yPos += 2;
    doc.line(margin, yPos + 4, pageWidth - margin, yPos + 4); yPos += 10;
    doc.setFont("helvetica", "bold");
    doc.text("Total Due", margin + 2, yPos);
    doc.text(`€ ${total.toFixed(2)}`, pageWidth - margin - 2, yPos, { align: "right" });

    doc.setFontSize(9).setTextColor(150);
    doc.text("Generated by GigÉire", pageWidth / 2, 285, { align: "center" });
    doc.setTextColor(80).text("Thank you for your business!", pageWidth / 2, 292, { align: "center" });
    return doc;
  };

  const handlePreviewInvoice = async () => {
    setHasAttemptedSubmit(true);
    const formErrors = validateForm();
    setErrors(formErrors);
    
    if (Object.keys(formErrors).length > 0) {
      toast({ title: "Validation Error", description: "Please fix the errors below before previewing.", variant: "destructive" });
      return;
    }
    
    setIsPreviewing(true);
    const doc = generatePdfDocument();
    if (doc) {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
    }
    setIsPreviewing(false);
  };

  const validateInvoiceData = useCallback(() => {
    if (!gig) {
      console.error("[StandardInvoiceModal] No gig data provided");
      return false;
    }
    if (!senderInfo?.name?.trim() || !senderInfo?.email?.trim()) {
      console.error("[StandardInvoiceModal] Missing required sender info:", { name: senderInfo?.name, email: senderInfo?.email });
      return false;
    }
    if (!invoiceNumber.trim()) {
      console.error("[StandardInvoiceModal] Missing invoice number");
      return false;
    }
    return true;
  }, [gig, senderInfo, invoiceNumber]);

  const handleGenerateAndSendInvoice = async () => {
    console.debug("[StandardInvoiceModal] Starting invoice generation");
    if (!validateInvoiceData()) {
      toast({
        title: "Error",
        description: "Missing required information. Please check sender details and invoice number.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (!gig || !senderInfo?.name) {
        toast({ title: "Error", description: "Missing gig data or sender information.", variant: "destructive" });
        return;
      }
      if (!gig.client_id) {
        toast({ title: "Error", description: "Client ID is missing for this gig.", variant: "destructive" });
        console.error("Missing client_id in gig:", gig);
        return;
      }
      if (!gig.user_id) {
        toast({ title: "Error", description: "User ID is missing for this gig.", variant: "destructive" });
        console.error("Missing user_id in gig:", gig);
        return;
      }

      const doc = generatePdfDocument();
      if (!doc) {
        setIsProcessing(false);
        return;
      }

      const subtotal = gig.amount || 0;
      const vatRateNum = parseFloat(vatRate) || 0;
      const vatAmount = Math.round(subtotal * (vatRateNum / 100) * 100) / 100;
      const total = subtotal + vatAmount;
      const finalInvoiceNumberString = invoiceNumber;

      const pdfBlob = doc.output('blob');
      const storedFileName = `invoice_${gig.user_id}_${gig.client_id}_${Date.now()}_${Date.now()}.pdf`;
      const userFriendlyFileName = `Invoice - ${gig.title || 'Untitled Gig'} (${finalInvoiceNumberString}).pdf`;
      const filePath = `${gig.user_id}/${gig.client_id}/${storedFileName}`;

      // === BEGIN: Upsert into invoices table ===
      const invoiceSentAt = new Date().toISOString();
      const currentSenderInfo = senderInfo;
      const userId = gig.user_id;

      const invoicePayload = {
        client_id: gig.client_id,
        gig_id: gig.id,
        invoice_number: finalInvoiceNumberString,
        user_id: userId,
        subtotal: subtotal,
        vat_rate: vatRateNum,
        include_vat: vatRateNum > 0,
        vat_amount: vatAmount,
        total: total,
        due_date: dueDate.toISOString().split('T')[0],
        invoice_sent_at: invoiceSentAt,
        status: 'sent' as const,
        created_at: new Date().toISOString()
      };

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .upsert(invoicePayload, { onConflict: 'gig_id', ignoreDuplicates: false })
        .select()
        .single();

      if (invoiceError) {
        console.error("StandardInvoiceModal: Error upserting invoice:", invoiceError);
        toast({ title: "Error Upserting Invoice", description: invoiceError.message, variant: "destructive" });
        throw invoiceError;
      }

      // 4. Create or update client_documents entry
      const documentType = "invoice";

      const { error: uploadError } = await supabase.storage
        .from('generated.documents')
        .upload(filePath, pdfBlob, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('generated.documents')
        .getPublicUrl(filePath);
      if (!publicUrlData?.publicUrl) throw new Error("Failed to get public URL.");
      const fileUrl = publicUrlData.publicUrl;

      const { error: dbError } = await supabase.from('client_documents').insert({
        client_id: gig.client_id,
        gig_id: gig.id,
        user_id: gig.user_id,
        file_url: fileUrl,
        file_name: userFriendlyFileName,
        type: 'invoice',
      });
      if (dbError) throw dbError;

      // Update gig with invoice details and potentially invoice_sent_at
      const updatedInvoiceData: any = {
        invoiceNumber: Date.now(),
        number: finalInvoiceNumberString,
        dueDate: dueDate.toISOString().split('T')[0],
        vatIncluded: !!vatRateNum,
        subtotal,
        vatAmount,
        total,
      };
      // Only set invoice_sent_at if it's not already set (i.e., this is the first time sending)
      // This updates the gig.invoice object, which might be stored separately or denormalized on the gig
      if (!gig.invoice?.invoice_sent_at) {
        updatedInvoiceData.invoice_sent_at = new Date().toISOString(); // Keep this for the gig.invoice object
      }

      await updateGig(gig.id, { 
        status: "invoice_sent", 
        invoice: { ...gig.invoice, ...updatedInvoiceData } // Merge with existing invoice data if any
      });
      
      setHasGeneratedInvoice(true);
      toast({ title: "Success", description: "Boom! Invoice out. Now get that 💶" });
      await refetchInvoices(); // Added: Refresh invoices in context

      try {
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error(`Download fetch failed: ${response.statusText}`);
        const blob = await response.blob();
        if (isMobile) {
          // On mobile, open in new tab
          const blobUrl = URL.createObjectURL(blob);
          window.open(blobUrl, '_blank');
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } else {
          // On desktop, download as before
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = userFriendlyFileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        }
      } catch (downloadError: any) {
        console.error("PDF download failed:", downloadError);
        toast({ title: "Download Info", description: `Invoice saved. Auto-download failed: ${downloadError.message}`, variant: "default" });
      }
      
      onOpenChange(false);
    } catch (error: any) {
      console.error("[StandardInvoiceModal] Invoice generation failed:", error);
      toast({
        title: "Error",
        description: `Invoice generation failed: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!gig) return null;

  const localFormatEuro = (value: number | undefined) => {
    if (value === undefined || value === null) return 'N/A';
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' }).format(value);
  };

  const isGigAlreadySentOrPaid = gig.status === 'invoice_sent' || gig.status === 'paid' || gig.status === 'overdue';
  const isInvoiceSentWithoutInvoice = gig.status === 'invoice_sent' && !gig.invoice && !hasGeneratedInvoice;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        setIsProcessing(false);
        setIsPreviewing(false);
        setHasGeneratedInvoice(false);
      }
      onOpenChange(isOpen);
    }}>
      <DialogContent className="flex flex-col min-h-[40vh] max-h-[90vh] mx-auto my-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-0 sm:max-w-[550px] w-[95%] max-w-[95%]">
        <DialogHeader className="px-6 pt-4 pb-0">
          <DialogTitle className="text-xl font-semibold">Create Invoice for "{gig.title || 'Untitled Gig'}"</DialogTitle>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-2">
            Invoice uses Gig details (e.g. Amount) - edit first, then generate the invoice.
          </p>
        </DialogHeader>
        
        <div className="px-6 pt-0 pb-4 w-full overflow-y-auto space-y-4">
          <div className="space-y-2 w-full">
            <Label htmlFor="gigAmountModal" className="text-sm font-medium">Gig Amount</Label>
            <Input 
              id="gigAmountModal" 
              type="text" 
              value={localFormatEuro(gig.amount)} 
              readOnly 
              disabled 
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed px-4 py-2.5" 
            />
            {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
            {errors.client && <p className="text-sm text-red-500 mt-1">{errors.client}</p>}
          </div>
          
          <div className="space-y-2 w-full">
            <Label htmlFor="invoiceNumberModal" className="text-sm font-medium">Invoice Number</Label>
            <Input 
              id="invoiceNumberModal" 
              type="text" 
              value={invoiceNumber} 
              readOnly 
              disabled 
              className="w-full bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed px-4 py-2.5" 
            />
          </div>
          
          <div className="space-y-2 w-full">
            <Label htmlFor="dueDateModal" className="text-sm font-medium">Due Date</Label>
            <Input
              id="dueDateModal"
              type="date"
              value={dueDate.toISOString().split('T')[0]}
              onChange={(e) => setDueDate(new Date(e.target.value))}
              disabled={isProcessing || isPreviewing}
              className={`w-full px-4 py-2.5 ${errors.dueDate ? "border-red-500" : ""}`}
            />
            {errors.dueDate && <p className="text-sm text-red-500 mt-1">{errors.dueDate}</p>}
          </div>
          
          <div className="space-y-2 w-full">
            <Label htmlFor="vatRateModal" className="text-sm font-medium">VAT Rate (%)</Label>
            <Input
              id="vatRateModal"
              type="number"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              placeholder="e.g. 23 (0 for no VAT)"
              disabled={isProcessing || isPreviewing}
              min="0"
              max="100"
              className={`w-full px-4 py-2.5 ${errors.vatRate ? "border-red-500" : ""}`}
            />
            {errors.vatRate && <p className="text-sm text-red-500 mt-1">{errors.vatRate}</p>}
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 pt-2 px-6 pb-6">
          <Button 
            onClick={handlePreviewInvoice}
            variant="outline"
            className="w-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium py-2.5 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-gray-200 focus:ring-offset-2 sm:order-1"
            disabled={isPreviewing || isProcessing || !dueDate || !gig || gig.amount === undefined || gig.amount === null}
          >
            {isPreviewing ? "Generating Preview..." : "Preview Invoice"}
          </Button>
          <Button 
            onClick={handleGenerateAndSendInvoice} 
            className="w-full bg-black hover:bg-gray-900 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-black focus:ring-offset-2 sm:order-2"
            disabled={isProcessing || isPreviewing || !dueDate || !gig || gig.amount === undefined || gig.amount === null || (isGigAlreadySentOrPaid && !isInvoiceSentWithoutInvoice)}
          >
            {isProcessing ? "Processing..." : isInvoiceSentWithoutInvoice ? "Generate Invoice" : "Generate & Mark as Sent"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 