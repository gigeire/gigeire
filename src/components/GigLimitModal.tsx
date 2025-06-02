"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useState } from "react";

interface GigLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit: number;
}

export function GigLimitModal({ open, onOpenChange, limit }: GigLimitModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgradeClick = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to start checkout session");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
            disabled={loading}
          >
            {loading ? "Redirecting..." : "Upgrade to Premium"}
          </Button>
          {error && <div className="text-red-600 text-sm text-center mt-1">{error}</div>}
          
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