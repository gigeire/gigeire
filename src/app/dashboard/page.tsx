"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useGigs } from "@/context/GigsContext";
import { useClients } from "@/context/ClientsContext";
import { Gig, GigStatus } from "@/types";
import { GigCard } from "@/components/GigCard";
import { StatusSummary } from "@/components/StatusSummary";
import { groupGigsByDateProximity } from "@/utils/date";
import { MainNav } from "@/components/MainNav";
import { GigModal } from "@/components/GigModal";
import { GigLimitModal } from "@/components/GigLimitModal";
import { EmptyState } from "@/components/EmptyState";
import { Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { gigs, addGig, updateGig, deleteGig, loading: gigsLoading, error: gigsError, checkGigLimit } = useGigs();
  const { refetch: refetchClients } = useClients();
  const { toast } = useToast();
  
  const [gigModalOpen, setGigModalOpen] = useState(false);
  const [gigModalMode, setGigModalMode] = useState<"add" | "edit">("add");
  const [gigToEdit, setGigToEdit] = useState<Gig | null>(null);
  const [gigLimitModalOpen, setGigLimitModalOpen] = useState(false);
  const [gigLimitData, setGigLimitData] = useState({ currentCount: 0, limit: 10 });

  const handleGigModalOpenChange = (open: boolean) => {
    setGigModalOpen(open);
    if (!open) {
      setGigToEdit(null);
      setGigModalMode("add");
    }
  };

  const handleAddGigClick = async () => {
    // Always re-run checkGigLimit synchronously before opening modal
    const limitCheck = await checkGigLimit();
    const allowed = limitCheck.canAddGig;
    const count = limitCheck.currentCount;
    const limit = limitCheck.limit;
    console.log("✅ Gig limit check:", { count, limit, allowed });
    if (!allowed) {
      console.log("🔒 Showing Upgrade modal");
      setGigLimitData({ currentCount: count, limit });
      setGigLimitModalOpen(true);
      return;
    }
    console.log("🚀 Opening Add Gig modal");
    setGigModalMode("add");
    setGigToEdit(null);
    setGigModalOpen(true);
  };

  const handleEditGigClick = (gig: Gig) => {
    setGigModalMode("edit");
    setGigToEdit(gig);
    setGigModalOpen(true);
  };

  const handleGigFormSubmit = async (formData: Omit<Gig, "id" | "user_id" | "created_at">) => {
    let success = false;
    if (gigModalMode === "edit" && gigToEdit) {
      const updatedGig = await updateGig(gigToEdit.id, formData);
      if (updatedGig) {
        toast({ title: "Success", description: "Gig updated successfully." });
        success = true;
      } else {
        toast({ title: "Error", description: gigsError || "Failed to update gig.", variant: "destructive" });
      }
    } else {
      const newGig = await addGig(formData);
      if (newGig) {
        toast({ title: "Success", description: "Gig added successfully." });
        success = true;
      } else {
        toast({ title: "Error", description: gigsError || "Failed to add gig.", variant: "destructive" });
      }
    }
    if (success) {
      setGigModalOpen(false);
    }
  };

  const handleDeleteGig = async (gigId: string) => {
    if (confirm('Are you sure you want to delete this gig?')) {
      try {
        await deleteGig(gigId);
        toast({ title: "Success", description: "Gone. Like a poorly lit wedding shot." });
        await refetchClients(); 
      } catch (error: any) {
        toast({ title: "Error", description: `Failed to delete gig: ${error.message}`, variant: "destructive" });
      }
    }
  };

  const handleGigStatusChange = async (gigId: string, newStatus: GigStatus) => {
    try {
      await updateGig(gigId, { status: newStatus });
      toast({ title: "Success", description: "Gig status updated." });
      await refetchClients(); 
    } catch (error: any) {
      console.error("Error updating gig status from dashboard:", error);
      toast({ title: "Error", description: `Failed to update gig status: ${error.message}`, variant: "destructive" });
    }
  };

  const handleGigLimitModalOpenChange = (open: boolean) => {
    setGigLimitModalOpen(open);
    if (!open) {
      setGigLimitData({ currentCount: 0, limit: 10 });
    }
  };

  const groupedGigs = groupGigsByDateProximity(gigs);
  const hasUpcomingGigs = groupedGigs.length > 0;
  const hasAnyGigs = gigs.length > 0;

  if (gigsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8 flex items-center justify-center">
        <p>Loading gigs...</p>
      </div>
    );
  }

  // Show full page empty state only when user has no gigs at all
  if (!hasAnyGigs && !gigsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">Welcome back to GigÉire</h1>
          <MainNav />
          <div className="mt-8">
            <EmptyState
              icon={<Calendar className="w-12 h-12 text-gray-400" />}
              title="No gigs yet? Let's fix that — add your first one and start tracking like a pro"
              subtitle="Your upcoming, recent, and past gigs will appear here once you add them."
              buttonText="Add First Gig"
              onButtonClick={handleAddGigClick}
            />
          </div>
        </div>
        <GigModal
          open={gigModalOpen}
          onOpenChange={handleGigModalOpenChange}
          mode={gigModalMode}
          onSubmit={handleGigFormSubmit}
          gigToEdit={gigToEdit}
        />
        <GigLimitModal
          open={gigLimitModalOpen}
          onOpenChange={handleGigLimitModalOpenChange}
          limit={gigLimitData.limit}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">Welcome back to GigÉire</h1>
        <MainNav />
        <StatusSummary />
        <div className="my-2 border-t border-gray-200" />
        <section className="bg-white rounded-2xl shadow p-6 md:p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Upcoming Gigs</h2>
            <Button 
              onClick={handleAddGigClick} 
              size="sm"
            >
              + New Gig
            </Button>
          </div>
          
          {hasUpcomingGigs ? (
            <div className="space-y-8">
              {groupedGigs.map((group) => (
                <div key={group.label}>
                  <h3 className="text-sm font-semibold text-gray-600 mt-6 mb-2">{group.label}</h3>
                  <ul className="space-y-6">
                    {group.gigs.map((gig) => {
                      if (!gig.id) {
                        console.warn("Gig missing ID in dashboard list:", gig);
                      }
                      return (
                        <li key={gig.id || `missing-id-${Math.random()}`}>
                          <GigCard 
                            gig={gig} 
                            onEdit={() => handleEditGigClick(gig)}
                            onDelete={() => handleDeleteGig(gig.id)}
                            onStatusChange={handleGigStatusChange}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            // Empty state for when user has gigs but none are upcoming
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Nothing coming up.
              </h3>
              <p className="text-gray-600 mb-6">
                Add your next gig now so you don&apos;t forget it later.
              </p>
              <Button onClick={handleAddGigClick} size="sm">
                + New Gig
              </Button>
            </div>
          )}
        </section>
      </div>
      <GigModal
        open={gigModalOpen}
        onOpenChange={handleGigModalOpenChange}
        mode={gigModalMode}
        onSubmit={handleGigFormSubmit}
        gigToEdit={gigToEdit}
      />
      <GigLimitModal
        open={gigLimitModalOpen}
        onOpenChange={handleGigLimitModalOpenChange}
        limit={gigLimitData.limit}
      />
    </div>
  );
} 