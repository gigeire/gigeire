"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface GigLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit: number;
}

export function GigLimitModal({ open, onOpenChange, limit }: GigLimitModalProps) {
  const handleUpgradeClick = () => {
    onOpenChange(false);
    // Open Stripe checkout in new tab with success URL redirect to thank-you page
    const baseUrl = window.location.origin;
    const successUrl = encodeURIComponent(`${baseUrl}/thank-you`);
    window.open(`https://buy.stripe.com/00w5kCfzc4SA9okbSg3gk01?success_url=${successUrl}`, "_blank");
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertCircle className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">You&apos;ve reached your limit of {limit} gigs. Upgrade to Premium to add more.</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-3 mt-6">
          <Button 
            onClick={handleUpgradeClick}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold"
          >
            Upgrade to Premium
          </Button>
          
          <Button 
            onClick={handleCancel}
            variant="ghost" 
            className="w-full text-gray-500"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 