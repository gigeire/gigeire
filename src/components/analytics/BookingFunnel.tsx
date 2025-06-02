"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const STATUS_COLORS = {
  inquiry: "#2563eb", // blue-600
  confirmed: "#22c55e", // green-500
  invoice_sent: "#f59e0b", // amber-500 (orange)
  paid: "#8b5cf6", // violet-500
  cancelled: "#ef4444", // red-500
};

interface BookingFunnelProps {
  data?: {
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
  };
}

export function BookingFunnel({ data }: BookingFunnelProps) {
  if (!data) return null;

  const funnelData = [
    { 
      status: "Inquiry", 
      count: data.inquiry, 
      color: STATUS_COLORS.inquiry,
      conversion: null
    },
    { 
      status: "Confirmed", 
      count: data.confirmed, 
      color: STATUS_COLORS.confirmed,
      conversion: data.conversionRates.inquiryToConfirmed
    },
    { 
      status: "Invoice Sent", 
      count: data.invoice_sent, 
      color: STATUS_COLORS.invoice_sent,
      conversion: data.conversionRates.confirmedToInvoiceSent
    },
    { 
      status: "Paid", 
      count: data.paid, 
      color: STATUS_COLORS.paid,
      conversion: data.conversionRates.invoiceSentToPaid
    },
  ].filter(d => typeof d.count === 'number');

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={funnelData}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
          barCategoryGap={24}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
          <XAxis 
            type="number" 
            className="text-sm"
            tick={{ fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
            hide={true}
          />
          <YAxis
            dataKey="status"
            type="category"
            className="text-sm"
            width={80}
            interval={0}
            tick={{ fill: '#6b7280', fontSize: 13 }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip
            formatter={(value: number, name: string, props: any) => {
              const item = funnelData[props.dataKey];
              return [
                <div key="tooltip" className="space-y-1">
                  <div className="font-medium">{value} gigs</div>
                  {item?.conversion !== undefined && item.conversion !== null && (
                    <div className="text-sm text-gray-500">
                      {item.conversion.toFixed(1)}% conversion
                    </div>
                  )}
                </div>
              ];
            }}
            contentStyle={{ 
              backgroundColor: "white", 
              border: "1px solid #e5e7eb",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
            }}
          />
          <Bar
            dataKey="count"
            barSize={32}
            radius={[4, 4, 4, 4]}
          >
            {funnelData.map((entry, idx) => (
              <Cell
                key={`cell-${idx}`}
                fill={entry.color}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
} 