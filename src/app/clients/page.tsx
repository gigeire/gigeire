"use client";
import Link from "next/link";
import { useGigs } from "@/context/GigsContext";
import { useMemo, useState, useEffect } from "react";
import { MainNav } from "@/components/MainNav";
import { Gig } from "@/types";
import type { Client } from "@/types/index";
import { useClients } from "@/context/ClientsContext";
import { formatDate } from "@/utils/date";
import { EmptyState } from "@/components/EmptyState";
import { Users, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { GigModal } from "@/components/GigModal";
import { useToast } from "@/hooks/use-toast";
import { ensureUserExists } from '@/app/actions/user';
import { isOverdue } from "@/utils/gigs";

function slugify(name: string) {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
}

type ClientEntry = {
  id: string;
  name: string;
  gigs: Gig[];
  paidGigs: Gig[];
  email?: string;
  phone?: string;
  outstanding: number;
  lastActivity: string;
  status: 'Active' | 'Past Client' | 'Inquiry';
};

function getClientDirectory(gigs: Gig[], clientsFromContext: Client[]): ClientEntry[] {
  const clientMap = new Map<string, ClientEntry>();

  const clientNameToIdMap = new Map<string, string>();
  clientsFromContext.forEach(c => {
    if (c.id && c.name) {
      clientNameToIdMap.set(c.name.toLowerCase(), c.id);
    }
  });

  gigs.forEach((gig: Gig) => {
    if (!gig.client) return;

    const clientNameLower = gig.client.toLowerCase();
    const clientIdFromMap = clientNameToIdMap.get(clientNameLower);

    if (!clientIdFromMap) {
      console.warn(`Client name "${gig.client}" from gig ${gig.id} not found in clients context. Cannot guarantee updatability.`);
      if (!clientMap.has(gig.client)) {
        clientMap.set(gig.client, {
          id: `temp-${Math.random().toString(36).substring(7)}`,
          name: gig.client,
          gigs: [], paidGigs: [],
          email: gig.email, phone: gig.phone,
          outstanding: 0, lastActivity: '', status: 'Inquiry',
        });
      }
    } else {
      if (!clientMap.has(gig.client)) {
        const clientContextData = clientsFromContext.find(c => c.id === clientIdFromMap);
        clientMap.set(gig.client, {
          id: clientIdFromMap,
          name: gig.client,
          gigs: [], paidGigs: [],
          email: clientContextData?.email ?? gig.email,
          phone: clientContextData?.phone ?? gig.phone,
          outstanding: 0, lastActivity: '', status: 'Inquiry',
        });
      }
    }

    const entry = clientMap.get(gig.client)!;
    if (entry) {
      entry.gigs.push(gig);
      if (gig.status === "paid") entry.paidGigs.push(gig);
    }
  });

  clientMap.forEach(entry => {
    entry.outstanding = entry.gigs.reduce((sum, gig) => {
      if (gig.status === "invoice_sent" || isOverdue(gig)) {
        return sum + (gig.amount || 0);
      }
      return sum;
    }, 0);
    const dates = entry.gigs.map(g => g.invoice?.due_date || g.date).filter(Boolean);
    entry.lastActivity = dates.length ? dates.sort().reverse()[0] : '';
    const hasUpcoming = entry.gigs.some(g => new Date(g.date) > new Date());
    const hasPaid = entry.gigs.some(g => g.status === "paid");
    const allInquiry = entry.gigs.every(g => g.status === "inquiry");
    if (hasUpcoming) entry.status = 'Active';
    else if (hasPaid) entry.status = 'Past Client';
    else if (allInquiry) entry.status = 'Inquiry';
  });
  return Array.from(clientMap.values());
}

const formatEuro = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

type SortableKey = 'name' | 'gigs' | 'outstanding' | 'lastActivity' | 'status';
type SortDirection = 'asc' | 'desc';

// Custom hook for media query
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

export default function ClientsPage() {
  const { gigs, addGig } = useGigs();
  const { clients: clientsFromContext, updateClient, refetch: refetchClients, loading: contextIsLoading } = useClients();
  const { toast } = useToast();
  
  const clientDirectoryEntries = useMemo(() => getClientDirectory(gigs, clientsFromContext || []), [gigs, clientsFromContext]);

  const [editing, setEditing] = useState<{ clientId: string; field: 'email' | 'phone' } | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState<string | null>(null);
  const [gigModalOpen, setGigModalOpen] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: 'ascending' | 'descending' } | null>(null);
  
  // Desktop sorting state (similar to GigsPageContent pattern)
  const [sortField, setSortField] = useState<SortableKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  const isMobile = useMediaQuery("(max-width: 640px)"); // sm breakpoint in Tailwind is 640px

  const clientsLoading = contextIsLoading === undefined ? true : contextIsLoading;

  const handleSaveClientField = async (clientId: string, field: 'email' | 'phone', value: string) => {
    if (!updateClient || !refetchClients) {
        toast({ title: "Error", description: "Client update functionality is not available.", variant: "destructive" });
        return;
    }

    const clientEntry = clientDirectoryEntries.find(c => c.id === clientId);
    const originalValue = clientEntry?.[field] || "";
    const trimmedValue = value.trim();

    if (trimmedValue === originalValue) {
      setEditing(null);
      return;
    }

    setIsSaving(`${clientId}-${field}`);
    try {
      await updateClient(clientId, { [field]: trimmedValue });
      
      toast({ title: "Success", description: `Client ${field} updated. Refreshing data...` });
      await refetchClients();

    } catch (error: any) {
      console.error(`Failed to update client ${field} for client ID ${clientId}:`, error);
      toast({
        title: "Error Updating Client",
        description: `Failed to update ${field}. ${error.message || "Please check console for details."} `,
        variant: "destructive",
      });
    } finally {
      setIsSaving(null);
      setEditing(null);
    }
  };

  const handleAddGig = async (form: Omit<Gig, "id" | "user_id" | "created_at">, mode: 'add' | 'edit' | 'clone') => {
    // This modal is only for adding, so we ignore the mode, but it's required by the prop type
    const newGig = await addGig(form);
    if (newGig) {
      toast({
        title: "Success",
        description: "Gig added successfully",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to add gig. Check console or error panel.",
        variant: "destructive",
      });
    }
  };

  const sortedMobileClientEntries = useMemo(() => {
    let sortableItems = [...clientDirectoryEntries];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA: string | number | Date;
        let valB: string | number | Date;

        if (sortConfig.key === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortConfig.key === 'gigs') {
          valA = a.gigs.length;
          valB = b.gigs.length;
        } else if (sortConfig.key === 'outstanding') {
          valA = a.outstanding;
          valB = b.outstanding;
        } else if (sortConfig.key === 'lastActivity') {
          valA = a.lastActivity ? new Date(a.lastActivity) : new Date(0);
          valB = b.lastActivity ? new Date(b.lastActivity) : new Date(0);
        } else if (sortConfig.key === 'status') {
          valA = a.status.toLowerCase();
          valB = b.status.toLowerCase();
        } else {
          return 0;
        }

        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [clientDirectoryEntries, sortConfig]);

  // Desktop sorted entries
  const sortedDesktopClientEntries = useMemo(() => {
    let sortableItems = [...clientDirectoryEntries];
    if (sortField !== null) {
      sortableItems.sort((a, b) => {
        let valA: string | number | Date;
        let valB: string | number | Date;

        if (sortField === 'name') {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortField === 'gigs') {
          valA = a.gigs.length;
          valB = b.gigs.length;
        } else if (sortField === 'outstanding') {
          valA = a.outstanding;
          valB = b.outstanding;
        } else if (sortField === 'lastActivity') {
          valA = a.lastActivity ? new Date(a.lastActivity) : new Date(0);
          valB = b.lastActivity ? new Date(b.lastActivity) : new Date(0);
        } else if (sortField === 'status') {
          valA = a.status.toLowerCase();
          valB = b.status.toLowerCase();
        } else {
          return 0;
        }

        if (valA < valB) {
          return sortDirection === 'asc' ? -1 : 1;
        }
        if (valA > valB) {
          return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [clientDirectoryEntries, sortField, sortDirection]);

  const requestSort = (key: SortableKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortableKey) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ArrowUp className="w-3 h-3 ml-1" />;
    }
    return <ArrowDown className="w-3 h-3 ml-1" />;
  };

  // Desktop sorting functions (similar to GigsPageContent pattern)
  const handleSort = (field: SortableKey) => {
    if (field === sortField) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // Reset to default (no sorting) when clicking a third time
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortableKey) => {
    if (field !== sortField) return <ArrowUpDown className="w-4 h-4" />;
    return sortDirection === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />;
  };

  if (clientsLoading && clientDirectoryEntries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8 flex items-center justify-center">
        <p>Loading clients...</p>
      </div>
    );
  }

  if (clientDirectoryEntries.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100 p-4 md:p-8">
        <div className="max-w-4xl mx-auto w-full">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">Clients</h1>
          <MainNav />
          <div className="mt-8">
            <EmptyState
              icon={<Users />}
              title="It's lonely in here — add your first gig to get the ball rolling"
              subtitle="Your clients and their gig history will appear here once you start adding gigs."
              buttonText="Add First Gig"
              onButtonClick={() => setGigModalOpen(true)}
            />
          </div>
        </div>
        <GigModal
          open={gigModalOpen}
          onOpenChange={setGigModalOpen}
          mode="add"
          onSubmit={handleAddGig}
          clients={clientsFromContext || []}
          selectedClientId={clientDirectoryEntries.find(c => c.gigs.length > 0)?.id}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-4 text-center">Clients</h1>
      <MainNav />
      <div className="mt-8 border-t border-gray-200" />
      {/* Conditional Table Rendering */}
      <div className="overflow-x-auto rounded-lg shadow mt-0">
        {isMobile ? (
          // Mobile Table
          <table className="min-w-full bg-white text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 font-semibold text-center cursor-pointer select-none" onClick={() => requestSort('name')}>
                  <div className="flex items-center justify-center">Client Name {getSortIndicator('name')}</div>
                </th>
                <th className="px-4 py-3 font-semibold text-center cursor-pointer select-none" onClick={() => requestSort('gigs')}>
                  <div className="flex items-center justify-center">Gigs {getSortIndicator('gigs')}</div>
                </th>
                <th className="px-4 py-3 font-semibold text-center cursor-pointer select-none" onClick={() => requestSort('outstanding')}>
                  <div className="flex items-center justify-center">Outstanding {getSortIndicator('outstanding')}</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMobileClientEntries.map(clientEntry => (
                <tr key={clientEntry.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-medium text-green-800 text-center">
                    <Link href={`/clients/${slugify(clientEntry.name)}`} className="hover:underline inline-flex items-center justify-center gap-1">
                      <span>{clientEntry.name}</span>
                      <ExternalLink className="w-3 h-3 opacity-70" />
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center">{clientEntry.gigs.length}</td>
                  <td className="px-4 py-3 text-center">{formatEuro(clientEntry.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // Desktop Table with sorting functionality
          <table className="min-w-full bg-white text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th 
                  className="px-4 py-2 font-semibold text-center cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('name')}
                  aria-label="Sort by Client Name"
                >
                  <div className="flex items-center justify-center gap-2">
                    Client Name
                    {getSortIcon('name')}
                  </div>
                </th>
                <th className="px-4 py-2 font-semibold text-center">Email</th>
                <th className="px-4 py-2 font-semibold text-center">Phone</th>
                <th 
                  className="px-4 py-2 font-semibold text-center cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('gigs')}
                  aria-label="Sort by Number of Gigs"
                >
                  <div className="flex items-center justify-center gap-2">
                    Gigs
                    {getSortIcon('gigs')}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 font-semibold text-center cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('outstanding')}
                  aria-label="Sort by Outstanding Amount"
                >
                  <div className="flex items-center justify-center gap-2">
                    Outstanding
                    {getSortIcon('outstanding')}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 font-semibold text-center cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('lastActivity')}
                  aria-label="Sort by Last Gig Date"
                >
                  <div className="flex items-center justify-center gap-2">
                    Last Gig
                    {getSortIcon('lastActivity')}
                  </div>
                </th>
                <th 
                  className="px-4 py-2 font-semibold text-center cursor-pointer hover:bg-gray-50 transition-colors select-none"
                  onClick={() => handleSort('status')}
                  aria-label="Sort by Status"
                >
                  <div className="flex items-center justify-center gap-2">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDesktopClientEntries.map(clientEntry => (
                <tr key={clientEntry.id} className="border-b border-gray-200/50 hover:bg-gray-50 transition">
                  <td className="px-4 py-2 font-medium text-green-800 text-center">
                    <Link href={`/clients/${slugify(clientEntry.name)}`} className="hover:underline inline-flex items-center gap-1">
                      <span>{clientEntry.name}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                  <td
                    className="px-4 py-2 text-center cursor-pointer group"
                    onClick={() => {
                      if (clientEntry.id.startsWith('temp-')) {
                        toast({ title: "Info", description: "Client record not found in master list, cannot edit directly.", variant: "default" });
                        return;
                      }
                      setEditing({ clientId: clientEntry.id, field: 'email' });
                      setEditValue(clientEntry.email || "");
                    }}
                  >
                    {editing && editing.clientId === clientEntry.id && editing.field === 'email' ? (
                      <input
                        type="email"
                        className="w-full px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-green-200 focus:outline-none text-sm"
                        value={editValue}
                        autoFocus
                        disabled={isSaving === `${clientEntry.id}-email`}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleSaveClientField(clientEntry.id, 'email', editValue)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveClientField(clientEntry.id, 'email', editValue);
                          } else if (e.key === 'Escape') {
                            setEditing(null);
                          }
                        }}
                      />
                    ) : (
                      <span className={clientEntry.email ? '' : 'text-gray-400'}>
                        {isSaving === `${clientEntry.id}-email` ? "Saving..." : (clientEntry.email || '—')}
                      </span>
                    )}
                  </td>
                  <td
                    className="px-4 py-2 text-center cursor-pointer group"
                    onClick={() => {
                      if (clientEntry.id.startsWith('temp-')) {
                        toast({ title: "Info", description: "Client record not found in master list, cannot edit directly.", variant: "default" });
                        return;
                      }
                      setEditing({ clientId: clientEntry.id, field: 'phone' });
                      setEditValue(clientEntry.phone || "");
                    }}
                  >
                    {editing && editing.clientId === clientEntry.id && editing.field === 'phone' ? (
                      <input
                        type="tel"
                        className="w-full px-2 py-1 rounded border border-gray-300 focus:ring-2 focus:ring-green-200 focus:outline-none text-sm"
                        value={editValue}
                        autoFocus
                        disabled={isSaving === `${clientEntry.id}-phone`}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleSaveClientField(clientEntry.id, 'phone', editValue)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveClientField(clientEntry.id, 'phone', editValue);
                          } else if (e.key === 'Escape') {
                            setEditing(null);
                          }
                        }}
                      />
                    ) : (
                      <span className={clientEntry.phone ? '' : 'text-gray-400'}>
                        {isSaving === `${clientEntry.id}-phone` ? "Saving..." : (clientEntry.phone || '—')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">{clientEntry.gigs.length}</td>
                  <td className="px-4 py-2 text-center">{formatEuro(clientEntry.outstanding)}</td>
                  <td className="px-4 py-2 text-center">{clientEntry.lastActivity ? formatDate(clientEntry.lastActivity) : <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={
                      clientEntry.status === 'Active' ? 'text-green-700 font-semibold' :
                      clientEntry.status === 'Past Client' ? 'text-blue-700 font-semibold' :
                      'text-gray-500 font-semibold'
                    }>
                      {clientEntry.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 