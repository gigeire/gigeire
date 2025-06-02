"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PaymentDelayData {
  bucket: string;
  count: number;
}

interface PaymentDelayChartProps {
  data: PaymentDelayData[];
}

export function PaymentDelayChart({ data }: PaymentDelayChartProps) {
  if (!data || data.length === 0) return null;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: 0, bottom: 5 }}
          barCategoryGap={10}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis 
            dataKey="bucket" 
            className="text-sm"
            tick={{ fill: '#6b7280', fontSize: '0.7rem' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            interval={0}
          />
          <YAxis 
            className="text-sm"
            tick={{ fill: '#6b7280', fontSize: '0.7rem' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            width={25}
            allowDecimals={false}
          />
          <Tooltip
            formatter={(value: number) => [`${value} invoices`, null]}
            contentStyle={{ 
              backgroundColor: "white", 
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
            }}
          />
          <Bar 
            dataKey="count" 
            fill="#2563eb" 
            radius={[4, 4, 0, 0]}
            className="hover:opacity-80 transition-opacity"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 