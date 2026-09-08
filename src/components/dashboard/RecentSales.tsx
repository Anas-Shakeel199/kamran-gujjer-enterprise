import { ArrowUpRight } from "lucide-react";

interface Sale {
  id: number;
  party: string;
  quantity: number;
  amount: number;
  date: string;
}

interface RecentSalesProps {
  sales: Sale[];
}

const RecentSales = ({
  sales,
}: RecentSalesProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-lg">
      <div className="flex items-center justify-between border-b border-slate-800 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Recent Sales
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Last 5 sales transactions
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <ArrowUpRight size={20} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                Party
              </th>

              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                Quantity
              </th>

              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                Amount
              </th>

              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                Date
              </th>
            </tr>
          </thead>

          <tbody>
            {sales.map((sale) => (
              <tr
                key={sale.id}
                className="border-b border-slate-800/70 last:border-0"
              >
                <td className="px-6 py-4 text-sm font-medium text-white">
                  {sale.party}
                </td>

                <td className="px-6 py-4 text-sm text-slate-300">
                  {sale.quantity.toLocaleString()} KG
                </td>

                <td className="px-6 py-4 text-sm font-medium text-emerald-400">
                  {formatCurrency(sale.amount)}
                </td>

                <td className="px-6 py-4 text-sm text-slate-400">
                  {sale.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RecentSales;