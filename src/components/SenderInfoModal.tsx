"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSenderInfo, SenderInfo } from "@/context/SenderInfoContext";
import { useToast } from "@/hooks/use-toast";

interface SenderInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SenderInfoModal({ open, onOpenChange }: SenderInfoModalProps) {
  const { senderInfo, updateSenderInfo } = useSenderInfo();
  const [form, setForm] = useState<SenderInfo>(senderInfo);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setForm(senderInfo);
      setErrors({});
    }
  }, [senderInfo, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; email?: string } = {};

    if (!form.name || !form.name.trim()) {
      newErrors.name = "Name is required";
    }
    if (!form.email || !form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const success = await updateSenderInfo(form);
    if (success) {
      toast({ title: "Success", description: "Sender information saved." });
      onOpenChange(false);
    } else {
      toast({ title: "Error", description: "Failed to save sender information to the database. Please try again.", variant: "destructive" });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value || '' }));
    if (errors[name as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Sender Information</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            This information will appear on all your invoices
          </p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Name or Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`input w-full ${errors.name ? "border-red-500" : ""}`}
              placeholder="Your name or business name"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className={`input w-full ${errors.email ? "border-red-500" : ""}`}
              placeholder="your@email.com"
            />
            {errors.email && (
              <p className="text-sm text-red-500 mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="input w-full"
              placeholder="+353 00 000 0000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Website</label>
            <input
              type="url"
              name="website"
              value={form.website}
              onChange={handleChange}
              className="input w-full"
              placeholder="https://yourwebsite.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">VAT Number</label>
            <input
              type="text"
              name="vatNumber"
              value={form.vatNumber}
              onChange={handleChange}
              className="input w-full"
              placeholder="IE1234567X"
            />
          </div>
          <div className="flex flex-col gap-2 mt-4">
            <Button
              type="submit"
              className="bg-black text-white rounded-full px-4 py-2 text-xs font-semibold shadow hover:bg-gray-900 focus:ring-2 focus:ring-black focus:outline-none w-full"
            >
              Save Sender Info
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 