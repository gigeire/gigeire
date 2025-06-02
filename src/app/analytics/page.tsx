"use client";
import { useGigs } from "@/context/GigsContext";
import { useClients } from "@/context/ClientsContext";
import { useInvoices } from "@/context/InvoicesContext";
import { useEffect, useMemo, useState } from "react";

import { BookingFunnel } from "@/components/analytics/BookingFunnel";
import { MonthlyEarnings } from "@/components/analytics/MonthlyEarnings";
import { TopClientsTable } from "@/components/analytics/TopClientsTable";
import { PaymentDelayChart } from "@/components/analytics/PaymentDelayChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { MainNav } from "@/components/MainNav";
import { EmptyState } from "@/components/EmptyState";
import { BarChart2, TrendingUp, RefreshCw, DollarSign, Calendar, Users } from "lucide-react";
import { Gig } from "@/types";
import type { Client } from "@/types/index";
import { FullInvoice as Invoice } from "@/types";
import { parseISO, format, getYear, differenceInDays, parse } from 'date-fns';
import { PipelineView } from "@/components/analytics/PipelineView";

// Type definitions for analytics data structures
interface BookingFunnelData {
  inquiry: number;
  confirmed: number;
  invoice_sent: number;
  paid: number;
  conversionRates: {
    inquiryToConfirmed: number;
    confirmedToInvoiceSent?: number;
    invoiceSentToPaid?: number;
    confirmedToPaid: number;
  };
}

interface MonthlyEarning {
  month: string;
  amount: number;
}

interface TopClientData {
  clientName: string;
  numberOfGigs: number;
  totalInvoiced: number;
  totalPaid: number;
  avgPaymentTime: number | null;
}

interface PaymentDelayData {
  bucket: string;
  count: number;
}

interface PaymentDelayStats {
  averageTime: number;
  longestTime: number;
  delayData: PaymentDelayData[];
}

interface CalculatedAnalyticsData {
  totalInvoiced: number;
  totalPaid: number;
  averageGigValue: number; // Average of *paid* gigs
  activeGigs: number; // Confirmed + Invoice Sent
  statusCounts: {
    inquiry: number;
    confirmed: number;
    invoice_sent: number;
    paid: number;
    overdue: number; // It was used in GigCard, good to have here
  };
  bookingFunnel: BookingFunnelData;
  monthlyEarnings: MonthlyEarning[];
  topClients: TopClientData[];
  paymentDelay: PaymentDelayStats;
}

// Utility functions for data processing
const initializeMonthlyData = (year: number): Record<string, number> => {
  const monthlyMap: Record<string, number> = {};
  for (let month = 0; month < 12; month++) {
    const monthKey = format(new Date(year, month, 1), 'yyyy-MM');
    monthlyMap[monthKey] = 0;
  }
  return monthlyMap;
};

const formatMonthlyData = (monthlyMap: Record<string, number>): MonthlyEarning[] => {
  return Object.entries(monthlyMap)
    .map(([monthYear, amount]) => ({
      month: format(parseISO(monthYear + '-01'), 'MMM'),
      amount
    }))
    .sort((a, b) => {
      const dateA = parse(a.month, 'MMM', new Date());
      const dateB = parse(b.month, 'MMM', new Date());
      return dateA.getTime() - dateB.getTime();
    });
};

const calculatePaymentTime = (sentAt: string, paidAt: string): number => {
  return differenceInDays(parseISO(paidAt), parseISO(sentAt));
};

const formatConversionRate = (rate: number): number => {
  return parseFloat(rate.toFixed(1));
};

type YearFilter = 'thisYear' | 'lastYear';

export default function AnalyticsPage() {
  // const { data, isLoading, error } = useAnalytics(); // Old context
  const { gigs, loading: gigsLoading, error: gigsError, refetch: refetchGigs } = useGigs();
  const { clients, loading: clientsLoading, error: clientsError, refetch: refetchClients } = useClients();
  const { invoices, loading: invoicesLoading, error: invoicesError, refetch: refetchInvoices } = useInvoices(); // Added useInvoices

  // Year filter state
  const [funnelYear, setFunnelYear] = useState<YearFilter>('thisYear');
  const [earningsYear, setEarningsYear] = useState<YearFilter>('thisYear');
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  const currentYear = new Date().getFullYear();
  const lastYear = currentYear - 1;

  // Refetch data on mount and when clients are deleted
  useEffect(() => {
    const refreshData = async () => {
      await Promise.all([
        refetchGigs(),
        refetchClients(),
        refetchInvoices()
      ]);
      setLastRefresh(Date.now());
    };
    
    refreshData();
  }, [refetchGigs, refetchClients, refetchInvoices]);

  // Add a refresh button for manual refresh
  const handleRefresh = async () => {
    await Promise.all([
      refetchGigs(),
      refetchClients(),
      refetchInvoices()
    ]);
    setLastRefresh(Date.now());
  };

  const isLoading = gigsLoading || clientsLoading || invoicesLoading; // Added invoicesLoading
  const error = gigsError || clientsError || invoicesError; // Added invoicesError

  // Main analytics data calculation
  const calculatedData = useMemo((): CalculatedAnalyticsData | null => {
    if (isLoading || !gigs || !clients || !invoices) {
      return null;
    }

    if (gigs.length === 0 && invoices.length === 0) {
      return {
        totalInvoiced: 0,
        totalPaid: 0,
        averageGigValue: 0,
        activeGigs: 0,
        statusCounts: { inquiry: 0, confirmed: 0, invoice_sent: 0, paid: 0, overdue: 0 },
        bookingFunnel: { inquiry: 0, confirmed: 0, invoice_sent: 0, paid: 0, conversionRates: { inquiryToConfirmed: 0, confirmedToPaid: 0 } },
        monthlyEarnings: [],
        topClients: [],
        paymentDelay: { averageTime: 0, longestTime: 0, delayData: [] },
      };
    }

    let totalInvoiced = 0;
    let totalPaid = 0;
    const statusCounts = { inquiry: 0, confirmed: 0, invoice_sent: 0, paid: 0, overdue: 0 };
    
    let paidGigsCount = 0;
    let sumOfPaidGigAmounts = 0;

    // Process gig data
    gigs.forEach(gig => {
      statusCounts[gig.status] = (statusCounts[gig.status] || 0) + 1;
      if (gig.status === 'paid' && gig.amount) {
        paidGigsCount++;
        sumOfPaidGigAmounts += gig.amount;
        totalPaid += gig.amount;
      }
    });

    // Filter gigs for booking funnel based on selected year
    const targetFunnelYear = funnelYear === 'thisYear' ? currentYear : lastYear;
    const filteredGigsForFunnel = gigs.filter(gig => {
      if (!gig.date) return false;
      return getYear(parseISO(gig.date)) === targetFunnelYear;
    });

    // Booking funnel calculation
    let funnelInquiry = 0;
    let funnelConfirmed = 0;
    let funnelInvoiceSent = 0;
    let funnelPaid = 0;

    filteredGigsForFunnel.forEach(gig => {
      funnelInquiry++;
      if (['confirmed', 'invoice_sent', 'paid', 'overdue'].includes(gig.status)) {
        funnelConfirmed++;
      }
      if (['invoice_sent', 'paid', 'overdue'].includes(gig.status)) {
        funnelInvoiceSent++;
      }
      if (gig.status === 'paid') {
        funnelPaid++;
      }
    });

    // Monthly earnings calculation
    const targetEarningsYear = earningsYear === 'thisYear' ? currentYear : lastYear;
    const monthlyEarningsMap = initializeMonthlyData(targetEarningsYear);

    gigs.forEach(gig => {
      if (
        gig.status === 'paid' &&
        gig.amount &&
        gig.date &&
        getYear(parseISO(gig.date)) === targetEarningsYear
      ) {
        const monthKey = format(parseISO(gig.date), 'yyyy-MM');
        if (monthlyEarningsMap[monthKey] !== undefined) {
          monthlyEarningsMap[monthKey] += gig.amount;
        }
      }
    });

    // Process invoice data for invoiced amount only
    invoices.forEach(invoice => {
      if (invoice.total) {
        totalInvoiced += invoice.total;
      }
    });

    // Top clients calculation
    const clientDataMap: Record<string, { client: Client; gigs: Gig[]; invoices: Invoice[] }> = {};
    
    // Only process clients that exist in the clients array (active clients)
    clients.forEach(client => {
      // Skip if client is not in the current clients list (deleted)
      if (!client || !client.id) return;
      
      clientDataMap[client.id] = {
        client,
        gigs: gigs.filter(g => g.client_id === client.id),
        invoices: invoices.filter(i => i.client_id === client.id)
      };
    });

    const topClientsArray: TopClientData[] = Object.values(clientDataMap)
      .map(({ client, gigs: clientGigs, invoices: clientInvoices }) => {
        const numberOfGigs = clientGigs.length;
        const totalInvoiced = clientInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        const paidInvoices = clientInvoices.filter(inv => inv.invoice_paid_at && inv.total);
        const totalPaid = paidInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

        const paymentTimes: number[] = [];
        clientInvoices.forEach(invoice => {
          if (invoice.invoice_sent_at && invoice.invoice_paid_at) {
            paymentTimes.push(calculatePaymentTime(invoice.invoice_sent_at, invoice.invoice_paid_at));
          }
        });

        const avgPaymentTime = paymentTimes.length > 0 
          ? paymentTimes.reduce((sum, time) => sum + time, 0) / paymentTimes.length 
          : null;

        return {
          clientName: client.name,
          numberOfGigs,
          totalInvoiced,
          totalPaid,
          avgPaymentTime
        };
      })
      .sort((a, b) => b.totalPaid - a.totalPaid);

    // Payment delay analysis
    const paymentTimes: number[] = [];
    const delayBuckets = {
      '0-7 days': 0,
      '8-14 days': 0,
      '15-30 days': 0,
      '30+ days': 0
    };

    invoices.forEach(invoice => {
      if (invoice.invoice_sent_at && invoice.invoice_paid_at) {
        const daysDiff = calculatePaymentTime(invoice.invoice_sent_at, invoice.invoice_paid_at);
        paymentTimes.push(daysDiff);

        if (daysDiff <= 7) {
          delayBuckets['0-7 days']++;
        } else if (daysDiff <= 14) {
          delayBuckets['8-14 days']++;
        } else if (daysDiff <= 30) {
          delayBuckets['15-30 days']++;
        } else {
          delayBuckets['30+ days']++;
        }
      }
    });

    const averagePaymentTime = paymentTimes.length > 0 
      ? paymentTimes.reduce((sum, time) => sum + time, 0) / paymentTimes.length 
      : 0;
    const longestPaymentTime = paymentTimes.length > 0 ? Math.max(...paymentTimes) : 0;

    const paymentDelayData: PaymentDelayData[] = Object.entries(delayBuckets).map(([bucket, count]) => ({
      bucket,
      count
    }));

    // Calculate derived metrics
    const averageGigValue = paidGigsCount > 0 ? sumOfPaidGigAmounts / paidGigsCount : 0;
    const activeGigs = statusCounts.confirmed + statusCounts.invoice_sent + statusCounts.overdue;

    // Conversion rates
    const inquiryToConfirmedRate = funnelInquiry > 0 ? (funnelConfirmed / funnelInquiry) * 100 : 0;
    const confirmedToInvoiceSentRate = funnelConfirmed > 0 ? (funnelInvoiceSent / funnelConfirmed) * 100 : 0;
    const invoiceSentToPaidRate = funnelInvoiceSent > 0 ? (funnelPaid / funnelInvoiceSent) * 100 : 0;
    const confirmedToPaidRate = funnelConfirmed > 0 ? (funnelPaid / funnelConfirmed) * 100 : 0;

    return {
      totalInvoiced,
      totalPaid,
      averageGigValue,
      activeGigs,
      statusCounts,
      bookingFunnel: {
        inquiry: funnelInquiry,
        confirmed: funnelConfirmed,
        invoice_sent: funnelInvoiceSent,
        paid: funnelPaid,
        conversionRates: {
          inquiryToConfirmed: formatConversionRate(inquiryToConfirmedRate),
          confirmedToInvoiceSent: formatConversionRate(confirmedToInvoiceSentRate),
          invoiceSentToPaid: formatConversionRate(invoiceSentToPaidRate),
          confirmedToPaid: formatConversionRate(confirmedToPaidRate),
        }
      },
      monthlyEarnings: formatMonthlyData(monthlyEarningsMap),
      topClients: topClientsArray,
      paymentDelay: {
        averageTime: averagePaymentTime,
        longestTime: longestPaymentTime,
        delayData: paymentDelayData
      },
    };
  }, [gigs, clients, invoices, isLoading, funnelYear, earningsYear, currentYear, lastYear]);

  // Helper function for year toggle buttons
  const renderYearToggle = (
    currentYear: YearFilter,
    setYear: (year: YearFilter) => void,
    thisYearLabel: string = "This Year",
    lastYearLabel: string = "Last Year"
  ) => (
    <div className="flex gap-2">
      <Button
        variant={currentYear === 'thisYear' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setYear('thisYear')}
      >
        {thisYearLabel}
      </Button>
      <Button
        variant={currentYear === 'lastYear' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setYear('lastYear')}
      >
        {lastYearLabel}
      </Button>
    </div>
  );

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading analytics: {error}
      </div>
    );
  }

  // Check if there are invoices with "paid" or "invoice_sent" status
  const hasInvoiceData = invoices && invoices.length > 0 && 
    invoices.some(invoice => invoice.status === 'sent' || invoice.invoice_paid_at);

  // Only show loading if we don't have any data yet (initial load)
  const shouldShowLoading = isLoading && (!gigs || !clients || !invoices);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-white via-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="relative flex justify-center items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600">
            Analytics
          </h1>
          {/* <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2 absolute right-0 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button> */}
        </div>
        <MainNav />
        
        {/* Only show loading state on true initial load */}
        {shouldShowLoading ? (
          <div className="mt-8 flex items-center justify-center">
            <p className="text-gray-500">Loading analytics...</p>
          </div>
        ) : !hasInvoiceData ? (
          /* Show empty state when no invoice data */
          <div className="mt-8">
            <EmptyState 
              title="No analytics yet — but the graphs are hungry"
              subtitle="Start invoicing gigs and we'll crunch the numbers for you. The moment money starts flowing, the insights start showing."
              icon={<TrendingUp className="h-12 w-12 text-gray-400" />}
            />
          </div>
        ) : (
          /* Show analytics when data is available */
          <>
            {/* Show loading skeletons only when we know there's data but calculations aren't ready */}
            {!calculatedData ? (
              <>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-8">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i} className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-[100px]" />
                      </CardHeader>
                      <CardContent className="flex flex-col items-center justify-center">
                        <Skeleton className="h-8 w-[120px]" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
                <div className="grid gap-6 mt-8">
                  {[...Array(4)].map((_, i) => (
                    <Card key={`skel-chart-${i}`} className="col-span-1 lg:col-span-2 bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                      <CardHeader>
                        <Skeleton className="h-5 w-1/3" />
                      </CardHeader>
                      <CardContent className="flex-1 flex items-center justify-center h-[300px]">
                        <Skeleton className="h-full w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              /* Show fully calculated analytics */
              <>
                {/* Mobile Key Metrics Card (List View) */}
                <div className="md:hidden">
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg font-semibold text-gray-900">Key Metrics</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Total Earned */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-violet-100 rounded-lg">
                            <DollarSign className="w-4 h-4 text-violet-700" />
                          </div>
                          <span className="text-sm text-gray-700">Total Earned</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          €{calculatedData.totalPaid?.toLocaleString('en-IE', { maximumFractionDigits: 0 }) ?? 0}
                        </span>
                      </div>
                      {/* Total Invoiced */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-yellow-600" />
                          </div>
                          <span className="text-sm text-gray-700">Total Invoiced</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          €{calculatedData.totalInvoiced?.toLocaleString('en-IE', { maximumFractionDigits: 0 }) ?? 0}
                        </span>
                      </div>
                      {/* Avg. Paid Gig Value */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                            <Calendar className="w-4 h-4 text-blue-600" />
                          </div>
                          <span className="text-sm text-gray-700">Avg. Paid Gig Value</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          €{calculatedData.averageGigValue?.toLocaleString('en-IE', { maximumFractionDigits: 0 }) ?? '0'}
                        </span>
                      </div>
                      {/* Active Gigs */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 bg-purple-100 rounded-lg">
                            <Users className="w-4 h-4 text-purple-600" />
                          </div>
                          <span className="text-sm text-gray-700">Active Gigs</span>
                        </div>
                        <span className="font-semibold text-gray-900">
                          {calculatedData.activeGigs ?? 0}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Desktop Top Metrics Row (4 Cards) */}
                <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="flex flex-col items-center justify-center space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Total Invoiced</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        €{calculatedData.totalInvoiced?.toLocaleString('en-IE', { maximumFractionDigits: 0 }) ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="flex flex-col items-center justify-center space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Total Earned</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-violet-700">
                        €{calculatedData.totalPaid?.toLocaleString('en-IE', { maximumFractionDigits: 0 }) ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="flex flex-col items-center justify-center space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Avg. Paid Gig Value</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-gray-700">
                        €{calculatedData.averageGigValue?.toLocaleString('en-IE', { maximumFractionDigits: 0 }) ?? '0'}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg hover:shadow-xl transition-shadow">
                    <CardHeader className="flex flex-col items-center justify-center space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Active Gigs</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center">
                      <div className="text-2xl font-bold text-gray-700">
                        {calculatedData.activeGigs ?? 0}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts Grid - Mobile: 1 column, MD and up: 2 columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Top Left: Pipeline View */}
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">Pipeline Preview</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">What's booked and what's still brewing</p>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                      <PipelineView data={{ gigs }} />
                    </CardContent>
                  </Card>

                  {/* Top Right: Cash Flow Calendar (formerly Monthly Paid Gigs) */}
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                    <CardHeader>
                      <div className="flex justify-between items-start md:items-center">
                        <div>
                          <CardTitle className="text-xl font-semibold">Cash Flow Calendar</CardTitle>
                          <p className="text-sm text-gray-500 mt-1">When you actually got paid (by gig date)</p>
                        </div>
                        <div className="hidden md:flex"> {/* Hide on mobile, show on md and up */}
                          {renderYearToggle(earningsYear, setEarningsYear)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                      {calculatedData.monthlyEarnings.some(month => month.amount > 0) ? (
                        <MonthlyEarnings data={calculatedData.monthlyEarnings} />
                      ) : (
                        <EmptyState 
                          icon={<BarChart2 className="w-10 h-10 text-gray-400"/>} 
                          title="No earnings data" 
                          subtitle="No paid gigs found for the selected year."
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Bottom Charts: Bookings Funnel and Cash Flow Timing */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                  {/* Bookings Funnel */}
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">Bookings Funnel</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">How your gigs move through the pipeline</p>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <BookingFunnel data={calculatedData.bookingFunnel} />
                    </CardContent>
                  </Card>

                  {/* Cash Flow Timing */}
                  <Card className="bg-white/50 backdrop-blur-sm border border-gray-200/50 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold">Cash Flow Timing</CardTitle>
                      <p className="text-sm text-gray-500 mt-1">How long it takes to get paid</p>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        <PaymentDelayChart data={calculatedData.paymentDelay.delayData} />
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
} 