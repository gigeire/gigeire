"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { format, addMonths, startOfMonth, endOfMonth } from 'date-fns';

const STATUS_COLORS = {
  inquiry: "#2563eb", // blue-600
  confirmed: "#22c55e", // green-500
  invoice_sent: "#f59e0b", // amber-500 (orange)
};

interface PipelineViewProps {
  data: {
    gigs: Array<{
      date: string;
      status: string;
      amount: number;
    }>;
  };
}

export function PipelineView({ data }: PipelineViewProps) {
  if (!data?.gigs) return null;

  // Get next 3 months
  const today = new Date();
  const months = Array.from({ length: 3 }, (_, i) => {
    const date = addMonths(today, i);
    return {
      start: startOfMonth(date),
      end: endOfMonth(date),
      label: format(date, 'MMM yyyy')
    };
  });

  // Process data for each month
  const pipelineData = months.map(month => {
    const monthGigs = data.gigs.filter(gig => {
      const gigDate = new Date(gig.date);
      return gigDate >= month.start && gigDate <= month.end;
    });

    return {
      month: month.label,
      inquiry: monthGigs
        .filter(gig => gig.status === 'inquiry')
        .reduce((sum, gig) => sum + (gig.amount || 0), 0),
      confirmed: monthGigs
        .filter(gig => gig.status === 'confirmed')
        .reduce((sum, gig) => sum + (gig.amount || 0), 0),
      invoice_sent: monthGigs
        .filter(gig => gig.status === 'invoice_sent')
        .reduce((sum, gig) => sum + (gig.amount || 0), 0),
    };
  });

  const hasData = pipelineData.some(month => 
    month.inquiry > 0 || month.confirmed > 0 || month.invoice_sent > 0
  );

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-gray-500 text-center">
          No upcoming gigs in the pipeline for the next 3 months.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={pipelineData}
          margin={{ top: 20, right: 15, left: 5, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis 
            dataKey="month" 
            className="text-sm"
            tick={{ fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            className="text-sm"
            tick={{ fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `€${value.toLocaleString()}`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${name}: €${value.toLocaleString()}`, null]}
            contentStyle={{ 
              backgroundColor: "white", 
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
            }}
          />
          <Legend 
            wrapperStyle={{ 
              paddingTop: "1rem",
              fontSize: "0.875rem"
            }}
          />
          <Bar 
            dataKey="inquiry" 
            name="Inquiries" 
            stackId="a" 
            fill={STATUS_COLORS.inquiry}
          />
          <Bar 
            dataKey="confirmed" 
            name="Confirmed" 
            stackId="a" 
            fill={STATUS_COLORS.confirmed}
          />
          <Bar 
            dataKey="invoice_sent" 
            name="Invoice Sent" 
            stackId="a" 
            fill={STATUS_COLORS.invoice_sent}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 