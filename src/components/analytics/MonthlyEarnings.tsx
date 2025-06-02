"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

interface MonthlyEarningsProps {
  data: Array<{
    month: string;
    amount: number;
  }>;
}

const PAID_VIOLET = "#8b5cf6"; // violet-500

export function MonthlyEarnings({ data }: MonthlyEarningsProps) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm text-gray-500 text-center font-medium">No earnings data</p>
    </div>
  );

  // Find max value for Y-axis domain
  const maxAmount = Math.max(...data.map(d => d.amount), 0);
  const yDomain = [0, Math.ceil(maxAmount * 1.15 / 100) * 100]; // Add 15% headroom, round to nearest 100

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 20, left: -10, bottom: 0 }}
        >
          {/* Gradient fill under the line */}
          <defs>
            <linearGradient id="paidVioletGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={PAID_VIOLET} stopOpacity={0.5}/>
              <stop offset="95%" stopColor={PAID_VIOLET} stopOpacity={0.05}/>
            </linearGradient>
          </defs>
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
            domain={yDomain}
            tick={{ fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            tickFormatter={(value) => `€${value.toLocaleString()}`}
          />
          <Tooltip
            formatter={(value: number) => [`€${value.toLocaleString()}`, 'Paid']}
            labelFormatter={label => `Month: ${label}`}
            contentStyle={{ 
              backgroundColor: "white", 
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontWeight: 500,
              fontSize: "1rem"
            }}
            itemStyle={{ color: PAID_VIOLET }}
          />
          {/* <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '0.95rem', color: '#047857', paddingTop: 8 }}/> Commented out to remove legend */}
          <Line
            type="monotone"
            dataKey="amount"
            name="Paid"
            stroke={PAID_VIOLET}
            strokeWidth={3}
            dot={{ r: 5, stroke: PAID_VIOLET, strokeWidth: 2, fill: 'white' }}
            activeDot={{ r: 7, fill: PAID_VIOLET, stroke: 'white', strokeWidth: 2 }}
            fillOpacity={1}
            fill="url(#paidVioletGradient)"
            isAnimationActive={true}
            animationDuration={900}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
} 