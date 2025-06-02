"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useInvoices } from "@/context/InvoicesContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  gigId: string;
  subtotal: number;
  showEditSenderInfo?: () => void;
}

export function InvoiceModal({ isOpen, onClose, gigId, subtotal, showEditSenderInfo }: InvoiceModalProps) {
  const { createInvoice, loading, error } = useInvoices();
  const { toast } = useToast();
  const [dueDate, setDueDate] = useState(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"));
  const [includeVat, setIncludeVat] = useState(false);
  const [vatRate, setVatRate] = useState(23); // Default Irish VAT rate

  const handleSubmit = async () => {
    try {
      await createInvoice({
        gigId,
        dueDate,
        includeVat,
        vatRate,
        subtotal,
      });
      
      toast({
        title: "Invoice created",
        description: "The invoice has been created and the gig status has been updated.",
      });
      
      onClose();
    } catch (err) {
      toast({
        title: "Error",
        description: error || "Failed to create invoice",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex flex-col justify-center items-center min-h-[40vh] max-h-[90vh] mx-auto my-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-0">
        <DialogHeader>
          <DialogTitle>Create Invoice</DialogTitle>
        </DialogHeader>
        {showEditSenderInfo && (
          <div className="mb-2 text-right">
            <button
              type="button"
              className="text-xs underline text-gray-500 hover:text-black"
              onClick={showEditSenderInfo}
            >
              Edit Sender Info
            </button>
          </div>
        )}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="includeVat"
              checked={includeVat}
              onCheckedChange={setIncludeVat}
            />
            <Label htmlFor="includeVat">Include VAT</Label>
          </div>

          {includeVat && (
            <div className="space-y-2">
              <Label htmlFor="vatRate">VAT Rate (%)</Label>
              <Input
                id="vatRate"
                type="number"
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value))}
                min="0"
                max="100"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Subtotal</Label>
            <div className="text-lg font-semibold">€{Math.round(subtotal)}</div>
          </div>

          {includeVat && (
            <div className="space-y-2">
              <Label>VAT Amount</Label>
              <div className="text-lg font-semibold">
                €{Math.round(subtotal * (vatRate / 100))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Total</Label>
            <div className="text-lg font-semibold">
              €{Math.round(subtotal + (includeVat ? subtotal * (vatRate / 100) : 0))}
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Invoice"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 