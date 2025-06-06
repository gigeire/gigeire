import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Gig, GigStatus, Invoice } from "@/types";
import type { Client } from "@/types/index";
import { useClients } from "@/context/ClientsContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useGigs } from "@/context/GigsContext";

interface GigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit" | "clone";
  onSubmit: (formData: Omit<Gig, "id" | "user_id" | "created_at">, mode: 'add' | 'edit' | 'clone') => void;
  gigToEdit?: Gig | null;
  gigToClone?: Gig | null;
  clients?: Client[];
  selectedClientId?: string | null;
}

interface FormErrors {
  title?: string;
  client_id?: string;
  date?: string;
  amount?: string;
}

export function GigModal({ 
  open, 
  onOpenChange, 
  mode, 
  onSubmit, 
  gigToEdit, 
  gigToClone,
  clients: propagatedClients,
  selectedClientId
}: GigModalProps) {
  const { clients: clientsFromContext, refetch: refetchClients, addClient } = useClients();
  const { refetch: refetchGigs } = useGigs();
  const supabase = createClientComponentClient();
  const [form, setForm] = useState<Omit<Gig, "id">>({
    title: "",
    date: "",
    client: "",
    client_id: selectedClientId || "",
    amount: 0,
    location: "",
    status: "inquiry",
    user_id: "",
    created_at: "",
    invoice: undefined,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientInput, setClientInput] = useState("");
  const [clientSearchResults, setClientSearchResults] = useState<Client[]>([]);
  const [clientLoading, setClientLoading] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const availableClients = propagatedClients || clientsFromContext;

  const gigStatusOptions: { value: GigStatus; label: string }[] = [
    { value: "inquiry", label: "Inquiry" },
    { value: "confirmed", label: "Confirmed" },
    { value: "invoice_sent", label: "Invoice Sent" },
    { value: "paid", label: "Paid" },
    // Note: 'overdue' is generally a calculated status, not set manually.
  ];

  // Pre-fill form in edit or clone mode
  useEffect(() => {
    let initialFormState: Omit<Gig, "id"> = {
      title: "",
      date: new Date().toISOString().split('T')[0],
      client: "",
      client_id: selectedClientId || "",
      amount: 0,
      location: "",
      status: "inquiry",
      user_id: "",
      created_at: "",
      invoice: undefined,
    };
    let initialClientInput = "";

    if (mode === "edit" && gigToEdit) {
      const { id, client: clientNameFromGig, client_id, ...rest } = gigToEdit;
      initialFormState = { 
        ...rest,
        client: clientNameFromGig || "",
        client_id: client_id || "",
      };
      initialClientInput = clientNameFromGig || "";
    } else if (mode === "clone" && gigToClone) {
      const { id, client: clientNameFromGig, client_id, created_at, user_id, ...restOfClone } = gigToClone;
      initialFormState = { 
        ...restOfClone,
        client: clientNameFromGig || "", 
        client_id: client_id || "", 
        date: new Date().toISOString().split('T')[0],
        status: "inquiry",
        user_id: "",
        created_at: "",
        invoice: undefined,
      };
      if (selectedClientId && selectedClientId !== client_id) {
        const selectedClientObj = availableClients.find(c => c.id === selectedClientId);
        if (selectedClientObj) {
          initialFormState.client_id = selectedClientId;
          initialFormState.client = selectedClientObj.name;
          initialClientInput = selectedClientObj.name;
        }
      }
    } else if (selectedClientId) {
        const selectedClientObj = availableClients.find(c => c.id === selectedClientId);
        if (selectedClientObj) {
          initialFormState.client_id = selectedClientId;
          initialFormState.client = selectedClientObj.name;
          initialClientInput = selectedClientObj.name;
        }
    }

    if (open) {
      setForm(initialFormState);
      setClientInput(initialClientInput);
      setErrors({});
      setHasAttemptedSubmit(false);
      setClientError(null);
    }

  }, [open, mode, gigToEdit, gigToClone, selectedClientId, availableClients]);

  // Search/filter clients as user types
  useEffect(() => {
    if (!clientInput) {
      setClientSearchResults(availableClients);
      return;
    }
    setClientSearchResults(
      availableClients.filter(c => c.name.toLowerCase().includes(clientInput.toLowerCase()))
    );
  }, [clientInput, availableClients]);

  const validateFormValues = (values: Omit<Gig, "id">, currentClientInput: string): FormErrors => {
    const newErrors: FormErrors = {};
    if (!values.title.trim()) newErrors.title = "Title is required";
    if (!currentClientInput.trim()) newErrors.client_id = "Client is required";
    if (!values.date) {
      newErrors.date = "Date is required";
    } else {
      // To avoid timezone issues, compare date strings in YYYY-MM-DD format.
      const today = new Date().toISOString().split('T')[0];
      const inputDate = new Date(values.date).toISOString().split('T')[0];
      if (inputDate < today) {
          newErrors.date = "Date must be today or later";
      }
    }
    if (typeof values.amount !== 'number' || isNaN(values.amount) || values.amount <= 0) newErrors.amount = "Amount must be a positive number";
    return newErrors;
  };

  useEffect(() => {
    if (hasAttemptedSubmit) {
      const newErrors = validateFormValues(form, clientInput);
      setErrors(newErrors);
    }
  }, [form, clientInput, hasAttemptedSubmit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "amount") {
      const numericValue = parseFloat(value.replace(/[^\d.]/g, ""));
      setForm({ ...form, amount: isNaN(numericValue) ? 0 : numericValue });
    } else if (name === "client") {
      setClientInput(value);
      setForm({ ...form, client: value, client_id: "" });
      setShowSuggestions(true);
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleClientChange = (value: string) => {
    const selectedClient = availableClients.find(c => c.id === value);
    setClientInput(selectedClient ? selectedClient.name : "");
    setForm({ ...form, client: selectedClient ? selectedClient.name : "", client_id: value });
    setShowSuggestions(false);
  };

  const handleStatusChange = (value: GigStatus) => {
    setForm({ ...form, status: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setClientError(null);
    
    const formErrors = validateFormValues(form, clientInput);
    setErrors(formErrors);
    
    if (Object.keys(formErrors).length > 0) {
      // Don't proceed if there are validation errors
      return;
    }
    
    setIsSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setClientError("You must be logged in to add or edit a gig.");
      setIsSubmitting(false);
      return;
    }
    const userId = user.id;

    let clientId = form.client_id;
    const clientName = clientInput.trim();

    if (!clientId && clientName) {
      setClientLoading(true);
      const existingClient = availableClients.find(
        c => c.name.toLowerCase() === clientName.toLowerCase() && c.user_id === userId
      );

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        try {
          // Insert new client with all required fields
          const newClientPayload = {
            name: clientName,
            email: "",
            phone: "",
            user_id: userId,
            created_at: new Date().toISOString(),
            status: "Inquiry",
          };
          const response = await supabase
            .from("clients")
            .insert([newClientPayload])
            .select()
            .single();
          const { data: clientData, error: clientErrorObj, status: clientStatus } = response;
          if (!newClientPayload.name || !newClientPayload.user_id || !newClientPayload.status) {
            console.warn("Missing required client fields:", newClientPayload);
          }
          if (clientErrorObj && clientStatus !== 409) {
            console.error("Supabase client insert error:", JSON.stringify(clientErrorObj, null, 2));
          } else if (!clientData) {
            console.error("Supabase insert failed. Debug info:", {
              clientPayload: newClientPayload,
              responseData: clientData,
              responseError: clientErrorObj,
              responseStatus: clientStatus
            });
          }
          if ((clientErrorObj || !clientData)) {
            setClientError(
              (!clientData && !clientErrorObj ? "Something went wrong adding the client. Please double-check your input." : "Something went wrong adding the client.")
            );
            setIsSubmitting(false);
            setClientLoading(false);
            return;
          }
          // Try to get the new client id from the response
          const insertedClient = Array.isArray(clientData) ? (clientData[0] as any) : (clientData as any);
          if (!insertedClient?.id) {
            setClientError("Something went wrong adding the client. Please double-check your input.");
            setIsSubmitting(false);
            setClientLoading(false);
            return;
          }
          clientId = insertedClient.id;
        } catch (err) {
          console.error("Failed to add new client (exception):", err);
          setClientError("Something went wrong adding the client. Please double-check your input.");
          setIsSubmitting(false);
          setClientLoading(false);
          return;
        }
      }
      setClientLoading(false);
    }

    // Ensure client_id is set and not reset
    if (!clientId || typeof clientId !== 'string' || clientId.length < 10) {
      setClientError('Client is required and must be valid.');
      setIsSubmitting(false);
      return;
    }
    // Prepare the gig object to submit (preserve all fields, especially client_id)
    const gigToSubmit = {
      ...form,
      client_id: clientId,
      client: clientName,
      user_id: userId,
      created_at: new Date().toISOString(),
      amount: form.amount,
      status: form.status.toLowerCase() as GigStatus,
    };
    delete (gigToSubmit as any).client_name; // clean up if it exists

    // Pass the prepared form data and mode to the parent component
    onSubmit(gigToSubmit as Omit<Gig, "id" | "user_id" | "created_at">, mode);

    setForm({ title: "", date: "", client: "", client_id: "", amount: 0, location: "", status: "inquiry", user_id: "", created_at: "", invoice: undefined });
    setClientInput("");
    setErrors({});
    setHasAttemptedSubmit(false);
    onOpenChange(false);
    setIsSubmitting(false);
    await refetchGigs();
  };

  const handleDialogOpenChange = (openState: boolean) => {
    onOpenChange(openState);
    if (!openState) {
      setHasAttemptedSubmit(false);
      setErrors({});
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (client: Client) => {
    setClientInput(client.name);
    setForm({ ...form, client: client.name, client_id: client.id });
    setShowSuggestions(false);
    if (inputRef.current) inputRef.current.blur();
  };

  // Hide suggestions on blur (with a slight delay to allow click)
  const handleClientBlur = () => {
    setTimeout(() => setShowSuggestions(false), 100);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg rounded-lg w-[calc(100%-2rem)] sm:w-full mx-auto my-auto p-0">
        <div className="bg-gray-50 dark:bg-gray-900 rounded-t-lg py-1 px-0 border-b border-gray-200 dark:border-gray-700 w-full sm:py-3">
          <DialogHeader className="p-0 flex-shrink-0">
            <DialogTitle className="text-center text-lg sm:text-base font-semibold tracking-tight mt-4 mb-2 sm:mt-1 sm:mb-0.5">
              {mode === "edit" ? "Edit Gig" : mode === "clone" ? "Clone Gig" : "Add New Gig"}
            </DialogTitle>
          </DialogHeader>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-2 sm:px-6 sm:py-2 sm:pt-3 sm:pb-3">
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div>
              <Label htmlFor="title" className="text-sm sm:text-sm mb-1.5 block">Gig Title</Label>
              <Input 
                id="title" 
                name="title" 
                value={form.title} 
                onChange={handleChange} 
                className={`h-9 ${errors.title ? "border-red-500" : ""} placeholder:text-sm sm:placeholder:text-sm`}
                autoFocus={open}
              />
              {errors.title && <p className="text-sm text-red-500 mt-1">{errors.title}</p>}
            </div>
            <div className="relative">
              <Label htmlFor="client" className="text-sm sm:text-sm mb-1.5 block">Client</Label>
              <Input
                id="client"
                name="client"
                placeholder="Select a client or type a new name"
                value={clientInput || ""}
                onChange={handleChange}
                onFocus={() => setShowSuggestions(true)}
                onBlur={handleClientBlur}
                ref={inputRef}
                autoComplete="off"
                className={`h-9 ${errors.client_id ? "border-red-500" : ""} placeholder:text-sm sm:placeholder:text-sm`}
              />
              {showSuggestions && clientInput && clientSearchResults.length > 0 && (
                <div className="absolute z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full mt-1 rounded shadow max-h-40 overflow-auto">
                  {availableClients.length === 0 && !clientLoading && clientInput && (
                    <div className="p-2 text-sm text-gray-500">
                      No clients found. Type full name and press Enter or click Add to create "{clientInput}".
                    </div>
                  )}
                  {clientSearchResults.map((client) => (
                    <div
                      key={client.id}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                      onClick={() => handleSuggestionClick(client)}
                    >
                      {client.name}
                    </div>
                  ))}
                  {clientInput && !availableClients.find(c => c.name.toLowerCase() === clientInput.toLowerCase()) && (
                     <Button 
                        type="button" 
                        variant="ghost"
                        className="w-full justify-start p-2 text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50"
                        onClick={async () => {
                            setForm({...form, client: clientInput, client_id: "" });
                            setShowSuggestions(false);
                            inputRef.current?.focus(); 
                        }}
                      >
                       Add new client: "{clientInput}"
                     </Button>
                  )}
                </div>
              )}
              {errors.client_id && <p className="text-sm text-red-500 mt-1">{errors.client_id}</p>}
              {clientError && <p className="text-sm text-red-500 mt-1">{clientError}</p>}
            </div>
            <div>
              <Label htmlFor="date" className="text-sm sm:text-sm mb-1.5 block">Date</Label>
              <Input 
                id="date" 
                name="date" 
                type="date" 
                value={form.date} 
                onChange={handleChange}
                className={`h-9 ${errors.date ? "border-red-500" : ""}`}
              />
              {errors.date && <p className="text-sm text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <Label htmlFor="amount" className="text-sm sm:text-sm mb-1.5 block">Amount (€)</Label>
              <Input
                id="amount"
                name="amount"
                value={form.amount === 0 ? "" : form.amount}
                onChange={handleChange}
                className={`h-9 ${errors.amount ? "border-red-500" : ""} placeholder:text-sm sm:placeholder:text-sm [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                type="number"
                inputMode="decimal"
                pattern="[0-9]*"
                min="0"
                step="0.01"
                style={{ MozAppearance: 'textfield' }}
              />
              {errors.amount && <p className="text-sm text-red-500 mt-1">{errors.amount}</p>}
            </div>
            <div>
              <Label htmlFor="location" className="text-sm sm:text-sm mb-1.5 block">Location</Label>
              <Input 
                id="location" 
                name="location" 
                value={form.location} 
                onChange={handleChange}
                className="h-9 placeholder:text-sm sm:placeholder:text-sm"
              />
            </div>
            <div>
              <Label htmlFor="status" className="text-sm sm:text-sm mb-1.5 block">Status</Label>
              <Select value={form.status} onValueChange={handleStatusChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {gigStatusOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </div>
        <DialogFooter className="px-4 pt-1 pb-5 sm:px-6 sm:pt-0 sm:pb-5 flex-shrink-0">
          {mode === "edit" && gigToEdit ? (
            <>
              <div className="flex flex-col sm:flex-row w-full gap-2">
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  onClick={handleSubmit}
                  className="w-full sm:w-1/2 h-12 text-base font-bold flex-1 order-1 sm:order-2"
                >
                  {isSubmitting ? "Submitting..." : (mode === "edit" ? "Save Changes" : "Add Gig")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:w-1/2 h-12 text-base font-bold flex-1 order-2 sm:order-1"
                  onClick={async () => {
                    if (!gigToEdit?.id) return;
                    if (isMobile) {
                      setShowDeleteConfirm(true);
                      return;
                    }
                    if (!window.confirm("Are you sure you want to delete this gig? This action cannot be undone.")) return;
                    const { error } = await supabase.from("gigs").delete().eq("id", gigToEdit.id);
                    if (error) {
                      alert("Failed to delete gig");
                    } else {
                      onOpenChange(false);
                      window.location.reload();
                    }
                  }}
                >
                  Delete Gig
                </Button>
              </div>
              {/* Mobile-only custom confirmation dialog */}
              {showDeleteConfirm && isMobile && (
                <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                  <DialogContent className="max-w-xs mx-auto">
                    <DialogHeader>
                      <DialogTitle>Delete Gig?</DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-center text-base">Are you sure you want to delete this gig? This action cannot be undone.</div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="ghost"
                        className="flex-1"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={async () => {
                          setShowDeleteConfirm(false);
                          const { error } = await supabase.from("gigs").delete().eq("id", gigToEdit.id);
                          if (error) {
                            alert("Failed to delete gig");
                          } else {
                            onOpenChange(false);
                            window.location.reload();
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </>
          ) : (
            <Button 
              type="submit" 
              disabled={isSubmitting}
              onClick={handleSubmit}
              className="w-full h-12 text-base font-bold"
            >
              {isSubmitting ? "Submitting..." : (mode === "edit" ? "Save Changes" : "Add Gig")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 