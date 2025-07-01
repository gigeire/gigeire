"use client";

export const dynamic = "force-dynamic";

import { useGigs } from "@/context/GigsContext";
import { useClients } from "@/context/ClientsContext";
import { useParams, useRouter } from "next/navigation";
import { MainNav } from "@/components/MainNav";
import { formatDate } from "@/utils/date";
import { Gig } from "@/types";
import type { Client } from "@/types/index";
import { Users, Mail, Phone, FileText, User, Trash2, Pencil, Edit3, PlusCircle, UploadCloud, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { format } from "date-fns";
import { GigModal } from "@/components/GigModal";
import { GigLimitModal } from "@/components/GigLimitModal";
import { ClientModal } from "@/components/ClientModal";
import { GigCard } from "@/components/GigCard";
import { useToast } from "@/hooks/use-toast";
import { GigStatus, Invoice } from "@/types";
import { Input } from "@/components/ui/input";
import * as z from "zod";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Link from "next/link";
import { StandardInvoiceModal } from "@/components/StandardInvoiceModal";
import { useInvoices } from "@/context/InvoicesContext";
import { useClientDocuments } from "@/context/ClientDocumentsContext";

function unslugify(slug: string) {
  // First decode URI component, then replace hyphens with spaces
  return decodeURIComponent(slug).replace(/-/g, ' ');
}

// Improved Irish name capitalization
function capitalizeIrishName(str: string) {
  return str
    .replace(/\b(o')([a-z])/gi, (_, p1, p2) => p1.charAt(0).toUpperCase() + p1.charAt(1) + p1.charAt(2) + p2.toUpperCase())
    .replace(/\b(mac|mc)([a-z])/gi, (_, p1, p2) => p1.charAt(0).toUpperCase() + p1.slice(1).toLowerCase() + p2.toUpperCase())
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Interface for individual client notes from Supabase
interface ClientNote {
  id: string;
  client_id: string;
  text: string;
  created_at: string; 
}

// ClientDocument interface is no longer needed here, it comes from ClientDocumentsContext

// Define Zod schema for adding a new note (content only)
const newNoteSchema = z.object({
  content: z.string().min(1, { message: "Note content cannot be empty." }),
});

// Custom hook for media query (if not already globally available)
// If you have a shared useMediaQuery hook, import that instead.
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => {
      setMatches(media.matches);
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  return matches;
}

export default function ClientDetailPage() {
  const { gigs, updateGig, addGig, deleteGig, refetch: refetchGigs, error: gigsError, checkGigLimit } = useGigs();
  const { clients, updateClient, loading: clientsLoading, refetch: refetchClients } = useClients();
  const { invoices, refetch: refetchInvoices } = useInvoices();
  const {
    clientDocuments,
    loading: isLoadingDocuments,
    error: clientDocumentsError,
    fetchClientDocuments: fetchClientDocumentsFromContext,
    refetchCurrentClientDocuments,
    clearClientDocuments
  } = useClientDocuments();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClientComponentClient();

  // Get client name from URL and find the matching client from context AND database
  const clientNameFromUrl = useMemo(() => {
    const name = params.clientName as string;
    return name ? capitalizeIrishName(unslugify(name)) : '';
  }, [params.clientName]);
  
  const [client, setClient] = useState<Client | null>(null);
  const [clientLoading, setClientLoading] = useState(true);

  // Fetch client from database directly (more reliable than context)
  useEffect(() => {
    if (!clientNameFromUrl) {
      setClient(null);
      setClientLoading(false);
      return;
    }

    const fetchClient = async () => {
      setClientLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setClient(null);
          setClientLoading(false);
          return;
        }

        // Try case-insensitive lookup from database
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', user.id)
          .ilike('name', clientNameFromUrl) // Case-insensitive match
          .maybeSingle();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching client:', error);
          throw error;
        }

        if (data) {
          setClient(data);
        } else {
          // Fallback: try context lookup if database didn't find anything
          const contextClient = clients?.find(c => c.name.toLowerCase() === clientNameFromUrl.toLowerCase()) || null;
          setClient(contextClient);
        }
      } catch (error: any) {
        console.error('Failed to fetch client:', error);
        toast({ 
          title: "Error", 
          description: `Failed to load client: ${error.message}`, 
          variant: "destructive" 
        });
        setClient(null);
      } finally {
        setClientLoading(false);
      }
    };

    fetchClient();
  }, [clientNameFromUrl, supabase, clients, toast]);

  // Filter gigs for the current client
  const clientGigs = useMemo(() => {
    if (!client) return [];
    // Match by client_id if available, otherwise by client name (less reliable)
    return gigs.filter(g => g.client_id ? g.client_id === client.id : g.client?.toLowerCase() === client.name.toLowerCase());
  }, [gigs, client]);

  // State for modals
  const [gigModalOpen, setGigModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [gigToEdit, setGigToEdit] = useState<Gig | null>(null);
  const [gigToClone, setGigToClone] = useState<Gig | null>(null);
  const [gigLimitModalOpen, setGigLimitModalOpen] = useState(false);
  const [gigLimitData, setGigLimitData] = useState({ currentCount: 0, limit: 10 });

  // State for client notes
  const [clientNotes, setClientNotes] = useState<ClientNote[]>([]);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // State for client documents
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Summary calculations
  const totalEarned = useMemo(() => clientGigs.filter(g => g.status === "paid").reduce((sum, g) => sum + (g.amount || 0), 0), [clientGigs]);
  const outstanding = useMemo(() => clientGigs.filter(g => g.status === "invoice_sent" || g.status === "overdue").reduce((sum, g) => sum + (g.amount || 0), 0), [clientGigs]);
  const lastActivityDate = useMemo(() => {
    const dates = clientGigs.map(g => g.date).filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [clientGigs]);

  // Fetch client notes
  const fetchClientNotes = useCallback(async () => {
    if (!client || !client.id) return;
    setIsLoadingNotes(true);
    try {
      const { data, error } = await supabase
        .from('client_notes')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setClientNotes(data || []);
    } catch (error: any) {
      console.error("Error fetching client notes:", error);
      toast({ title: "Error", description: `Failed to fetch notes: ${error.message}`, variant: "destructive" });
      setClientNotes([]);
    } finally {
      setIsLoadingNotes(false);
    }
  }, [client, supabase, toast]);

  // Effect to fetch notes and documents when client changes
  useEffect(() => {
    if (client?.id) {
      fetchClientNotes();
      fetchClientDocumentsFromContext(client.id);
      refetchInvoices();
    } else {
      setClientNotes([]);
      clearClientDocuments();
    }
  }, [client?.id, fetchClientNotes, fetchClientDocumentsFromContext, clearClientDocuments, refetchInvoices]);

  useEffect(() => {
    if (clientDocumentsError) {
      toast({ title: "Document Error", description: clientDocumentsError, variant: "destructive" });
    }
  }, [clientDocumentsError, toast]);

  // Handle manual document upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    if (!client || !client.id) {
      toast({ title: "Error", description: "Client not loaded. Cannot upload document.", variant: "destructive" });
      return;
    }

    const file = event.target.files[0];
    const originalFileName = file.name;

    setIsUploadingDocument(true);

    try {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated.");
      }
      const userId = user.id;

      // 2. Upload to Supabase Storage
      // Path: generated.documents/{user_id}/{client_id}/{original_filename}
      const filePath = `${userId}/${client.id}/${originalFileName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('generated.documents') // Ensure this is your correct bucket name
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Overwrite if same name, or false to error if exists
        });

      if (uploadError) {
        throw uploadError;
      }

      // 3. Get Public URL
      const { data: publicUrlData } = supabase.storage
        .from('generated.documents') // Bucket name
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) {
        throw new Error("Failed to get public URL for the uploaded document.");
      }
      const fileUrl = publicUrlData.publicUrl;

      // 4. Insert into client_documents table
      const { error: dbError } = await supabase
        .from('client_documents')
        .insert({
          client_id: client.id,
          gig_id: null, // No specific gig for manual uploads
          user_id: userId,
          file_url: fileUrl,
          file_name: originalFileName,
          type: 'misc', // Default type for manual uploads
          // uploaded_at is handled by default in DB
        });

      if (dbError) {
        throw dbError;
      }

      toast({ title: "Success", description: `Document "${originalFileName}" uploaded successfully.` });
      await refetchCurrentClientDocuments();

    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({ title: "Upload Error", description: `Failed to upload document: ${error.message}`, variant: "destructive" });
    } finally {
      setIsUploadingDocument(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle new note submission
  const handleNewNoteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!client || !client.id || !newNoteContent.trim()) return;

    setIsSubmittingNote(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated.");
      const { error } = await supabase
        .from('client_notes')
        .insert({ client_id: client.id, text: newNoteContent.trim(), user_id: user.id });
      if (error) throw error;
      setNewNoteContent("");
      fetchClientNotes();
      toast({ title: "Success", description: "Note added." });
    } catch (error: any) {
      console.error("Error submitting new note:", error);
      toast({ title: "Error", description: `Failed to add note: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmittingNote(false);
    }
  };

  // Handle note deletion
  const handleDeleteNote = async (noteId: string) => {
    if (!client || !client.id) {
      toast({ title: "Error", description: "Client context not available for deleting note.", variant: "destructive" });
      return;
    }
    if (!confirm("Are you sure you want to delete this note?")) return;

    const originalNotes = [...clientNotes];
    setClientNotes(prevNotes => prevNotes.filter(note => note.id !== noteId));

    try {
      const { error } = await supabase
        .from('client_notes')
        .delete()
        .eq('id', noteId)
        .eq('client_id', client.id);

      if (error) {
        setClientNotes(originalNotes);
        throw error;
      }
      
      toast({ title: "Success", description: "Note deleted." });
    } catch (error: any) {
      console.error("Error deleting note:", error);
      if (clientNotes.find(note => note.id === noteId) === undefined && !error.details && !error.message.includes("supabase")){
          setClientNotes(originalNotes);
      }
      toast({ title: "Error deleting note", description: error.message, variant: "destructive" });
    }
  };

  const handleEditGig = (gig: Gig) => {
    setGigToEdit(gig);
    setGigToClone(null);
    setGigModalOpen(true);
  };
  
  const handleCloneGig = async (gig: Gig) => {
    // Check gig limit before cloning
    const limitCheck = await checkGigLimit();
    if (!limitCheck.canAddGig) {
      setGigLimitData({ currentCount: limitCheck.currentCount, limit: limitCheck.limit });
      setGigLimitModalOpen(true);
      return;
    }

    setGigToClone(gig);
    setGigToEdit(null);
    setGigModalOpen(true);
  };

  const handleAddGigClick = async () => {
    // Check gig limit before opening modal
    const limitCheck = await checkGigLimit();
    if (!limitCheck.canAddGig) {
      setGigLimitData({ currentCount: limitCheck.currentCount, limit: limitCheck.limit });
      setGigLimitModalOpen(true);
      return;
    }

    setGigToEdit(null);
    setGigToClone(null);
    setGigModalOpen(true);
  };

  const handleGigSubmit = async (formData: Omit<Gig, "id" | "client"> & { client_id?: string | null, client_name?: string | null}) => {
    if (!client || !client.id) {
      toast({ title: "Error", description: "Client context not available for submitting gig.", variant: "destructive" });
      return;
    }
    let userId = gigs[0]?.user_id;
    if (!userId) {
      const { data: { user : authUser } } = await supabase.auth.getUser();
      if (authUser) userId = authUser.id;
    }
    if (!userId) {
        toast({ title: "Error", description: "User ID not found for submitting gig.", variant: "destructive" });
        return;
    }

    const gigData = {
      ...formData,
      client: client.name,
      client_id: client.id,
      user_id: userId,
    };

    let success = false;
    if (gigToEdit) {
      const updatedGig = await updateGig(gigToEdit.id, gigData);
      if (updatedGig) {
        toast({ title: "Success", description: "Gig updated." });
        success = true;
      } else {
        toast({ title: "Error", description: gigsError || "Failed to update gig.", variant: "destructive" });
      }
    } else if (gigToClone) {
      const { id, ...clonedData } = gigData as Gig;
      const newGig = await addGig(clonedData as Omit<Gig, "id">);
      if (newGig) {
        toast({ title: "Success", description: "Gig cloned and added." });
        success = true;
      } else {
        toast({ title: "Error", description: gigsError || "Failed to clone gig.", variant: "destructive" });
      }
    } else {
      const newGig = await addGig(gigData as Omit<Gig, "id">);
      if (newGig) {
        toast({ title: "Success", description: "Gig added." });
        success = true;
      } else {
        toast({ title: "Error", description: gigsError || "Failed to add gig.", variant: "destructive" });
      }
    }
    
    if (success) {
      setGigModalOpen(false);
      setGigToEdit(null);
      setGigToClone(null);
      await refetchGigs();
      await refetchClients();
    }
  };

  const handleGigStatusChange = async (gigId: string, newStatus: GigStatus) => {
    try {
      await updateGig(gigId, { status: newStatus });
      toast({ title: "Success", description: "Gig status updated." });
      await refetchGigs(); 
      await refetchClients();
      await refetchInvoices();
    } catch (error: any) {
      console.error("Error updating gig status:", error);
      toast({ title: "Error", description: `Failed to update gig status: ${error.message}`, variant: "destructive" });
    }
  };

  const handleClientSubmit = async (clientData: Partial<Client>) => {
    if (!client || !client.id) {
      toast({ title: "Error", description: "Client data is not available for update.", variant: "destructive"});
      return;
    }
    console.debug(`[ClientDetailPage] handleClientSubmit called for client ID: ${client.id} with data:`, clientData);
    try {
      // The updateClient function from context now handles fetch-merge-update-refetch_single_client
      await updateClient(client.id, clientData);
      
      toast({ title: "Success", description: "Client information updated successfully." });
      setClientModalOpen(false); // Close modal on success

      // If client name changed, the URL slug needs to change.
      // We use router.replace to avoid adding the old slug to history.
      const newName = clientData.name?.trim();
      if (newName && newName.toLowerCase() !== clientNameFromUrl.toLowerCase()) {
        console.debug(`[ClientDetailPage] Client name changed from "${clientNameFromUrl}" to "${newName}". Replacing route.`);
        const newSlug = encodeURIComponent(newName.toLowerCase().replace(/\s+/g, '-'));
        router.replace(`/clients/${newSlug}`, { scroll: false }); // Soft navigation to the new slug
      }
      // No explicit refetchClients() needed here as updateClient already updated the context precisely.
      // The useMemo deriving 'client' on this page will pick up the change from the context.

    } catch (error: any) {
      console.error("[ClientDetailPage] Error updating client:", error);
      toast({ 
        title: "Update Failed", 
        description: error.message || "Could not update client information. Please try again.", 
        variant: "destructive" 
      });
      // Modal remains open for user to retry or correct.
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId: string, fileUrl: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document? This action cannot be undone."
    );
    if (!confirmed) {
      return;
    }

    try {
      // Extract file path from URL
      const urlParts = fileUrl.split('/');
      const filePath = urlParts.slice(urlParts.indexOf('generated.documents') + 1).join('/');

      if (!filePath) {
        toast({ title: "Error", description: "Could not determine the file path for deletion.", variant: "destructive" });
        return;
      }
      
      // Delete from Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('generated.documents')
        .remove([filePath]);

      if (storageError) {
        console.error("Storage deletion error:", storageError);
        toast({ title: "Error", description: `Failed to delete document from storage: ${storageError.message}`, variant: "destructive" });
        return;
      }

      // Delete from client_documents table
      const { error: dbError } = await supabase
        .from('client_documents')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        console.error("Database deletion error:", dbError);
        toast({ title: "Error", description: `Failed to delete document record: ${dbError.message}`, variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Document deleted successfully." });
      await refetchCurrentClientDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast({ title: "Error", description: "An unexpected error occurred while deleting the document.", variant: "destructive" });
    }
  };

  const isMobile = useMediaQuery("(max-width: 640px)"); // sm breakpoint

  if (clientLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8 flex flex-col items-center justify-center">
        <MainNav />
        <div className="mt-10 text-center">
          <p className="text-lg">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8">
         <MainNav />
        <div className="max-w-4xl mx-auto w-full mt-10">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">Client Not Found</h1>
          <p className="text-gray-500 text-center">
            No client found with the name "{clientNameFromUrl}".
          </p>
          <div className="mt-6 text-center">
            <Button onClick={() => router.push('/clients')}>View All Clients</Button>
          </div>
        </div>
      </div>
    );
  }
  
  // Render actual page content
  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <div className="max-w-5xl mx-auto p-4 md:p-6 lg:p-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800 text-center">Client Profile</h1>
        <MainNav />
        <div className="mt-6 mb-6">
          {/* Client Header Section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-white shadow rounded-lg mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <User className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800">{client.name}</h1>
              </div>
              <div className="text-gray-500 text-xs sm:text-base mt-1 mb-2 sm:mt-0 sm:mb-0 space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-6">
                {client.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="font-medium">{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <span className="font-medium">{client.phone}</span>
                  </div>
                )}
                 {(!client.email && !client.phone) && (
                    <p className="italic">No contact details saved.</p>
                )}
              </div>
            </div>
            <Button onClick={() => setClientModalOpen(true)} variant="outline" size="sm" className="flex items-center gap-2">
              <Edit3 className="w-4 h-4" />
              Edit Client Info
            </Button>
          </div>

          {/* Summary Cards - Conditional Rendering */}
          <div className="mb-6">
            {isMobile ? (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Key Client Metrics</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-violet-700 mr-2 sm:mr-3 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-500">Total Earned</span>
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-gray-800">{formatEuro(totalEarned)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 mr-2 sm:mr-3 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-500">Outstanding Amount</span>
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-gray-800">{formatEuro(outstanding)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 mr-2 sm:mr-3 flex-shrink-0" />
                      <span className="text-xs sm:text-sm text-gray-500">Last Gig</span>
                    </div>
                    <span className="text-base sm:text-lg font-semibold text-gray-800">
                      {lastActivityDate ? formatDate(lastActivityDate) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                <SummaryCard title="Total Earned" value={formatEuro(totalEarned)} icon={<FileText className="text-violet-700" />} />
                <SummaryCard title="Outstanding Amount" value={formatEuro(outstanding)} icon={<FileText className="text-yellow-500" />} />
                <SummaryCard title="Last Gig" value={lastActivityDate ? formatDate(lastActivityDate) : '—'} icon={<FileText className="text-blue-500" />} />
              </div>
            )}
          </div>

          {/* Gigs Section */}
          <div className="mb-6 mt-6 sm:mt-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl md:text-2xl font-semibold text-gray-700">Gigs for {client.name}</h2>
              <Button 
                onClick={handleAddGigClick} 
                size="sm" 
                className="flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Add Gig
              </Button>
            </div>

            {clientGigs.length > 0 ? (
              <div className="space-y-4 md:space-y-6">
                {clientGigs.map(gig => {
                  const gigClientSlug = client ? encodeURIComponent(client.name.toLowerCase().replace(/\s+/g, '-')) : '';
                  return (
                    <GigCard
                      key={gig.id}
                      gig={gig}
                      onEdit={() => handleEditGig(gig)}
                      onClone={async () => await handleCloneGig(gig)}
                      onDelete={async () => {
                        if (confirm('Are you sure you want to delete this gig?')) {
                          try {
                            await deleteGig(gig.id);
                            toast({ title: "Success", description: "Gig deleted." });
                            await refetchClients();
                          } catch (error: any) {
                             toast({ title: "Error", description: `Failed to delete gig: ${error.message}`, variant: "destructive" });
                          }
                        }
                      }}
                      onStatusChange={handleGigStatusChange}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 px-6 bg-white rounded-lg shadow">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700 mb-1">No Gigs Yet</h3>
                <p className="text-sm text-gray-500 mb-4">This client doesn&apos;t have any gigs assigned yet.</p>
                <Button 
                  onClick={handleAddGigClick} 
                  size="sm" 
                  className="flex items-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add First Gig for {client.name}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Client Notes Section - NEW */}
        <section className="bg-white rounded-2xl shadow p-6 md:p-8 mt-6 mb-6">
          <h2 className="text-xl font-bold mb-3 text-gray-800">Client Notes</h2>
          <form onSubmit={handleNewNoteSubmit} className="mb-6">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                placeholder="Add a new note..."
                className="flex-grow"
                disabled={isSubmittingNote || !client?.id}
              />
              <Button type="submit" disabled={isSubmittingNote || !newNoteContent.trim() || !client?.id}>
                {isSubmittingNote ? "Adding..." : "Add Note"}
              </Button>
            </div>
          </form>

          {isLoadingNotes && <p className="text-gray-500">Loading notes...</p>}
          {!isLoadingNotes && clientNotes.length === 0 && (
            <p className="text-gray-500 italic">No notes for this client yet.</p>
          )}
          {!isLoadingNotes && clientNotes.length > 0 && (
            <ul className="space-y-4">
              {clientNotes.map((note) => (
                <li key={note.id} className="p-4 bg-gray-50 rounded-lg shadow flex justify-between items-start">
                  <div>
                    <p className="text-gray-700 whitespace-pre-wrap">{note.text}</p>
                    <p className="text-xs text-gray-500 mt-1 italic">
                      {format(new Date(note.created_at), "PPP p")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteNote(note.id)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Documents Section - UPDATED TO USE CONTEXT */}
        <section className="bg-white rounded-2xl shadow p-6 md:p-8 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Documents</h2>
            <div>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.docx"
                disabled={isUploadingDocument || !client?.id}
              />
              <Button 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isUploadingDocument || !client?.id || isLoadingDocuments || isDeletingDocument}
                variant="outline"
                size="sm"
              >
                <UploadCloud className="w-4 h-4 mr-2" />
                {isUploadingDocument ? "Uploading..." : (isLoadingDocuments ? "Loading Docs..." : "Upload Document")}
              </Button>
            </div>
          </div>

          {isLoadingDocuments && !isUploadingDocument && <p className="text-gray-500">Loading documents from context...</p>}
          {isUploadingDocument && <p className="text-gray-500">Uploading selected document...</p>}
          {!isLoadingDocuments && !isUploadingDocument && clientDocuments.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              <FileText className="w-12 h-12 text-gray-400" />
              <p className="mt-4 text-lg font-semibold">No documents found for this client.</p>
              <p className="text-sm text-gray-500">
                Use the button above to upload, or generate an invoice from a gig.
              </p>
            </div>
          )}
          {!isLoadingDocuments && !isUploadingDocument && clientDocuments.length > 0 && (
            <ul className="space-y-3">
              {clientDocuments.map((doc) => {
                let displayDate = doc.uploaded_at;
                let dateLabel = "Uploaded";

                if (doc.type === 'invoice' && doc.gig_id) {
                  const relatedInvoice = invoices.find(inv => inv.gig_id === doc.gig_id);
                  if (relatedInvoice?.invoice_sent_at) {
                    displayDate = relatedInvoice.invoice_sent_at;
                    dateLabel = "Generated";
                  }
                }

                return (
                  <li key={doc.id} className="p-4 bg-gray-50 rounded-lg shadow flex justify-between items-center">
                    <div className="flex items-center gap-3 flex-grow min-w-0">
                      <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                      <div className="min-w-0">
                        <a 
                          href={doc.file_url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-medium text-green-600 hover:text-green-700 hover:underline block truncate"
                          title={doc.file_name}
                        >
                          {doc.file_name}
                        </a>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-normal">{dateLabel}:</span> {format(new Date(displayDate), "PPP p")}
                          | Type: {doc.type}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteDocument(doc.id, doc.file_url)}
                      disabled={isDeletingDocument}
                    >
                      <Trash className="h-4 w-4 text-red-500 hover:text-red-700" />
                      <span className="sr-only">Delete Document</span>
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Modals */}
        <GigModal
          open={gigModalOpen}
          onOpenChange={setGigModalOpen}
          mode={gigToEdit ? 'edit' : (gigToClone ? 'clone' : 'add')}
          gigToEdit={gigToEdit}
          gigToClone={gigToClone}
          onSubmit={handleGigSubmit as unknown as (gig: Omit<Gig, "id" | "user_id" | "created_at">) => void}
          clients={clients || []}
          selectedClientId={client?.id}
        />
        <GigLimitModal
          open={gigLimitModalOpen}
          onOpenChange={setGigLimitModalOpen}
          limit={gigLimitData.limit}
        />
        {client && (
          <ClientModal
            open={clientModalOpen}
            onOpenChange={setClientModalOpen}
            client={client}
            onSubmit={handleClientSubmit}
          />
        )}
      </div>
    </div>
  );
}

// SummaryCard component definition (ensure it remains for desktop view)
interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}
const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-lg shadow flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-semibold text-gray-800">{value}</p>
    </div>
    <div className="text-3xl">
      {icon}
    </div>
  </div>
);

function formatEuro(value: number | undefined | null) { // Ensure formatEuro can handle null if outstanding can be null
    if (value === undefined || value === null) return '€0'; // Default to €0 if undefined or null
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
} 