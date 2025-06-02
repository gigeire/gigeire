"use client";
import { useGigs } from "@/context/GigsContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface MonthlyEarnings {
  month: string; // e.g. 'Jan-25'
  total: number;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const formatEuro = (value: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);

export function IncomeTracker() {
  const { gigs } = useGigs();
  const currentYear = new Date().getFullYear();
  const yearShort = String(currentYear).slice(-2);

  // Calculate monthly earnings
  const monthlyEarnings: MonthlyEarnings[] = MONTHS.map((month, i) => {
    const total = gigs
      .filter(gig => {
        const gigDate = new Date(gig.date);
        return (
          gig.status === "paid" &&
          gigDate.getFullYear() === currentYear &&
          gigDate.getMonth() === i
        );
      })
      .reduce((sum, gig) => {
        return sum + (typeof gig.amount === 'number' ? gig.amount : 0);
      }, 0);
    return { month: `${month}-${yearShort}`, total };
  });

  // Custom tooltip formatter
  const formatTooltip = (value: number) => [`€${Math.round(value)}`, "Earnings"];

  return (
    <div className="bg-gradient-to-br from-white via-gray-50 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md p-6 md:p-8 mt-12 mb-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Income Tracker {currentYear}</h2>
        <Link 
          href="/dashboard/analytics" 
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300 font-semibold text-sm shadow-sm border border-green-100 dark:border-green-800 hover:bg-green-100 hover:dark:bg-green-800 transition"
        >
          View Details
          <ArrowRight className="w-4 h-4 ml-1" />
        </Link>
      </div>
      <div className="h-[280px] w-full bg-white dark:bg-gray-800 rounded-xl shadow-inner">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyEarnings} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis 
              dataKey="month" 
              className="text-base font-semibold text-gray-700 dark:text-gray-300"
              tick={{ fill: "currentColor", fontSize: 15, fontWeight: 600 }}
              interval={0}
            />
            <YAxis 
              className="text-base font-semibold text-gray-700 dark:text-gray-300"
              tick={{ fill: "currentColor", fontSize: 15, fontWeight: 600 }}
              tickFormatter={(value) => formatEuro(value)}
            />
            <Tooltip 
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: "var(--background)",
                border: "1px solid var(--border)",
                borderRadius: "0.5rem",
                color: "var(--foreground)"
              }}
            />
            <Bar 
              dataKey="total" 
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              className="fill-green-500 dark:fill-green-400"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {monthlyEarnings.every(month => month.total === 0) && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-4">
          No paid gigs recorded for {currentYear}
        </p>
      )}
    </div>
  );
} 