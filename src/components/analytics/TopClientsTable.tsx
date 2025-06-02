"use client";

interface TopClientData {
  clientName: string;
  numberOfGigs: number;
  totalInvoiced: number;
  totalPaid: number;
  avgPaymentTime: number | null;
}

interface TopClientsTableProps {
  data: TopClientData[];
}

export function TopClientsTable({ data }: TopClientsTableProps) {
  if (!data || data.length === 0) {
    return <div className="text-center text-gray-500">No client data available</div>;
  }

  return (
    <div className="h-full overflow-auto">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-center py-3 px-4 font-medium text-sm text-gray-600 border-b border-gray-200">Client Name</th>
            <th className="text-center py-3 px-4 font-medium text-sm text-gray-600 border-b border-gray-200">Gigs</th>
            <th className="text-center py-3 px-4 font-medium text-sm text-gray-600 border-b border-gray-200">Total Invoiced</th>
            <th className="text-center py-3 px-4 font-medium text-sm text-gray-600 border-b border-gray-200">Total Paid</th>
            <th className="text-center py-3 px-4 font-medium text-sm text-gray-600 border-b border-gray-200">Avg Payment Time</th>
          </tr>
        </thead>
        <tbody>
          {data.map((client, index) => (
            <tr key={index} className={`border-b border-gray-100 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
              <td className="py-3 px-4 text-center text-sm">{client.clientName}</td>
              <td className="py-3 px-4 text-center text-sm">{client.numberOfGigs}</td>
              <td className="py-3 px-4 text-center text-sm">€{client.totalInvoiced.toLocaleString('en-IE', { maximumFractionDigits: 0 })}</td>
              <td className="py-3 px-4 text-center text-sm">€{client.totalPaid.toLocaleString('en-IE', { maximumFractionDigits: 0 })}</td>
              <td className="py-3 px-4 text-center text-sm">
                {client.avgPaymentTime !== null 
                  ? `${Math.round(client.avgPaymentTime)} days`
                  : '-'
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 