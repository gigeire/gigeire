"use client";

import { useState, useMemo, useEffect } from 'react';
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
import { ensureUserExists } from '@/app/actions/user';
import { GigLimitModal } from "@/components/GigLimitModal";
import { isOverdue, getDisplayStatus, getStatusKey } from "@/utils/gigs";

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

function GigsPageContent() {
  const { gigs, addGig, updateGig } = useGigs();

  // === OVERDUE DIAGNOSIS LOGGING ===
  useEffect(() => {
    if (!gigs || gigs.length === 0) return;

    console.log('=== OVERDUE DIAGNOSIS ===');
    console.log('Total gigs:', gigs.length);
    console.log('Sample gig structure:', gigs[0]);
    console.log('Gigs with invoice or invoices:', gigs.filter(g => g.invoice || g.invoices).length);
    console.log('Sample invoice object:', gigs.find(g => g.invoice || g.invoices));

    const testResults = gigs.slice(0, 5).map(gig => ({
      gig_id: gig.id,
      invoice_exists: !!gig.invoice || !!gig.invoices,
      invoice_status: gig.invoice?.status || gig.invoices?.[0]?.status,
      due_date: gig.invoice?.dueDate || gig.invoice?.due_date || gig.invoices?.[0]?.due_date,
      isOverdue: isOverdue(gig),
    }));
    console.log('Overdue test results:', testResults);
  }, [gigs]);

  const { clients, refetch: refetchClients } = useClients();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClientComponentClient();
  
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const statusFilter = searchParams.get('status') || 'all';
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [gigModalOpen, setGigModalOpen] = useState(false);
  const [gigToEdit, setGigToEdit] = useState<Gig | null>(null);
  const [gigToClone, setGigToClone] = useState<Gig | null>(null);
  const [loading, setLoading] = useState(false);
  const [gigLimitModalOpen, setGigLimitModalOpen] = useState(false);
  const [gigLimitData, setGigLimitData] = useState({ currentCount: 0, limit: 10 });

  const checkGigLimit = async () => {
    // This logic should ideally be in a context or a server action for reusability
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { canAddGig: false, currentCount: 0, limit: 0 };

    const { data: profile } = await supabase.from('users').select('plan').eq('id', user.id).single();
    const { data: gigs, error } = await supabase.from('gigs').select('id', { count: 'exact' });
    
    const currentCount = gigs?.length ?? 0;
    const limit = profile?.plan === 'premium' ? 1000 : 10;
    
    return { canAddGig: currentCount < limit, currentCount, limit };
  };

  const handleAddGigClick = async () => {
    const limitCheck = await checkGigLimit();
    if (limitCheck.canAddGig) {
      setGigToEdit(null);
      setGigToClone(null);
      setGigModalOpen(true);
    } else {
      setGigLimitData({ currentCount: limitCheck.currentCount, limit: limitCheck.limit });
      setGigLimitModalOpen(true);
    }
  };

  const handleCloneGig = async (gig: Gig) => {
    const limitCheck = await checkGigLimit();
    if (limitCheck.canAddGig) {
      setGigToEdit(null);
      setGigToClone(gig);
      setGigModalOpen(true);
    } else {
      setGigLimitData({ currentCount: limitCheck.currentCount, limit: limitCheck.limit });
      setGigLimitModalOpen(true);
    }
  };

  const handleGigModalOpenChange = (open: boolean) => {
    setGigModalOpen(open);
    if (!open) {
      setGigToEdit(null);
      setGigToClone(null);
    }
  };

  const handleEditGigClick = (gig: Gig) => {
    setGigToEdit(gig);
    setGigToClone(null);
    setGigModalOpen(true);
  };

  const handleGigSubmit = async (formData: Omit<Gig, "id" | "user_id" | "created_at">, mode: 'add' | 'edit' | 'clone') => {
    setLoading(true);
    // Defensive check to ensure user record exists before any action.
    const userCheck = await ensureUserExists();
    if (userCheck.error) {
      console.error("Critical action failed: Could not ensure user exists.", userCheck.error.message);
      toast({ title: "Account Error", description: "Your account record could not be verified. Please refresh and try again.", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (mode === 'edit' && gigToEdit) {
      const updatedGig = await updateGig(gigToEdit.id, formData);
      if (updatedGig) {
        toast({ title: "Success", description: "Gig updated successfully." });
        setGigModalOpen(false);
      } else {
        toast({ title: "Error", description: "Failed to update gig.", variant: "destructive" });
      }
    } else if (mode === 'add' || mode === 'clone') {
      const newGig = await addGig(formData);
      if (newGig) {
        toast({ title: "Success", description: `Gig "${newGig.title}" created.` });
        setGigModalOpen(false);
      } else {
        toast({ title: "Error", description: "Failed to create gig.", variant: "destructive" });
      }
    }
    await refetchClients();
    setLoading(false);
  };

  const filteredGigs = useMemo(() => {
    let filtered = gigs;
    
    if (statusFilter !== 'all') {
      filtered = gigs.filter(gig => {
        switch (statusFilter) {
          case 'inquiries':
            return gig.status === 'inquiry';
          case 'confirmed':
            return gig.status === 'confirmed';
          case 'invoice_sent':
            return gig.status === 'invoice_sent';
          case 'paid':
            return gig.status === 'paid';
          case 'overdue':
            return isOverdue(gig);
          default:
            return true;
        }
      });
    }
    
    return filtered;
  }, [gigs, statusFilter]);

  const sortedGigs = useMemo(() => {
    const sorted = [...filteredGigs].sort((a, b) => {
      let aValue: string | number | Date;
      let bValue: string | number | Date;
      
      switch (sortField) {
        case 'name':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'client':
          const aClient = clients.find(c => c.id === a.client_id)?.name || '';
          const bClient = clients.find(c => c.id === b.client_id)?.name || '';
          aValue = aClient.toLowerCase();
          bValue = bClient.toLowerCase();
          break;
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = a.amount || 0;
          bValue = b.amount || 0;
          break;
        case 'status':
          aValue = getDisplayStatus(a);
          bValue = getDisplayStatus(b);
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  }, [filteredGigs, sortField, sortDirection, clients]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    router.push(`/gigs?${params.toString()}`);
  };

  const formatEuro = (value: number) => 
    new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

  const getSortIcon = (field: SortField) => {
    if (field !== sortField) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  const currentStatusLabel = STATUS_OPTIONS.find(opt => opt.value === statusFilter)?.label || 'All Gigs';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            All Gigs
          </h1>
          <MainNav />
        </div>

        <div className="mt-8 mb-8">
          <div className="flex flex-col items-start mb-4">
            <h2 className="text-xl font-semibold text-gray-900 text-left">
              {currentStatusLabel} ({sortedGigs.length})
            </h2>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.value}
                variant={statusFilter === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilter(option.value)}
                className="text-sm"
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {isMobile ? (
          <div className="space-y-4">
            {sortedGigs.length === 0 ? (
              (() => {
                const key = (statusFilter in EMPTY_STATE_MESSAGES ? statusFilter : 'default') as keyof typeof EMPTY_STATE_MESSAGES;
                const msg = EMPTY_STATE_MESSAGES[key];
                return (
                  <div className="flex flex-col items-center justify-center text-center text-gray-500 py-12">
                    <div className="text-4xl mb-2">{msg.icon}</div>
                    <div className="text-lg font-semibold mb-1">{msg.title}</div>
                    <div className="text-sm max-w-xs mx-auto">{msg.subtitle}</div>
                  </div>
                );
              })()
            ) : (
              sortedGigs.map((gig) => {
                const client = clients.find(c => c.id === gig.client_id);
                const displayStatus = getDisplayStatus(gig);
                const statusKey = getStatusKey(gig);

                return (
                  <div
                    key={gig.id}
                    onClick={() => handleEditGigClick(gig)}
                    className="bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all hover:shadow-lg active:shadow-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{gig.title}</h3>
                        <p className="text-sm text-gray-600">{client?.name || 'Unknown Client'}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-700">
                      <span>{formatDate(gig.date)}</span>
                      <span className="font-medium">{formatEuro(gig.amount || 0)}</span>
                       <Badge
                        variant="secondary"
                        className={statusColors[statusKey as keyof typeof statusColors]}
                      >
                        {displayStatus}
                      </Badge>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th
                      className="px-6 py-3 text-center align-middle text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Gig Name
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center align-middle text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('client')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Client
                        {getSortIcon('client')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center align-middle text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('date')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Date
                        {getSortIcon('date')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center align-middle text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('amount')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Amount
                        {getSortIcon('amount')}
                      </div>
                    </th>
                    <th
                      className="px-6 py-3 text-center align-middle text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('status')}
                    >
                      <div className="flex items-center justify-center gap-2">
                        Status
                        {getSortIcon('status')}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedGigs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12">
                        {(() => {
                          const key = (statusFilter in EMPTY_STATE_MESSAGES ? statusFilter : 'default') as keyof typeof EMPTY_STATE_MESSAGES;
                          const msg = EMPTY_STATE_MESSAGES[key];
                          return (
                            <div className="flex flex-col items-center justify-center text-center text-gray-500">
                              <div className="text-4xl mb-2">{msg.icon}</div>
                              <div className="text-lg font-semibold mb-1">{msg.title}</div>
                              <div className="text-sm max-w-xs mx-auto">{msg.subtitle}</div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ) : (
                    sortedGigs.map((gig) => {
                      const client = clients.find(c => c.id === gig.client_id);
                      const displayStatus = getDisplayStatus(gig);
                      const statusKey = getStatusKey(gig);
                      
                      return (
                        <tr 
                          key={gig.id} 
                          className="hover:bg-blue-50 cursor-pointer transition-colors duration-150 active:bg-blue-100" 
                          onClick={() => handleEditGigClick(gig)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-gray-900">
                              {gig.title}
                            </div>
                            {gig.notes && (
                              <div className="text-sm text-gray-500 truncate max-w-xs mx-auto">
                                {gig.notes}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {client?.name || 'Unknown Client'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm text-gray-900">
                              {formatDate(gig.date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="text-sm font-medium text-gray-900">
                              {formatEuro(gig.amount || 0)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <Badge 
                              variant="secondary" 
                              className={statusColors[statusKey as keyof typeof statusColors]}
                            >
                              {displayStatus}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <GigModal
        open={gigModalOpen}
        onOpenChange={handleGigModalOpenChange}
        mode={gigToEdit ? 'edit' : (gigToClone ? 'clone' : 'add')}
        onSubmit={handleGigSubmit}
        gigToEdit={gigToEdit}
        gigToClone={gigToClone}
        clients={clients}
      />
      <GigLimitModal
        open={gigLimitModalOpen}
        onOpenChange={setGigLimitModalOpen}
        limit={gigLimitData.limit}
        currentCount={gigLimitData.currentCount}
      />
    </div>
  );
} 

export default GigsPageContent; 