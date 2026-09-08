import { ArrowDownLeft } from "lucide-react";

interface Purchase {
  id: number;
  supplier: string;
  quantity: number;
  amount: number;
  date: string;
}

interface RecentPurchasesProps {
  purchases: Purchase[];
}

const RecentPurchases = ({
  purchases,
}: RecentPurchasesProps) => {
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
            Recent Purchases
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Last 5 purchase transactions
          </p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <ArrowDownLeft size={20} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">
                Supplier
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
            {purchases.map((purchase) => (
              <tr
                key={purchase.id}
                className="border-b border-slate-800/70 last:border-0"
              >
                <td className="px-6 py-4 text-sm font-medium text-white">
                  {purchase.supplier}
                </td>

                <td className="px-6 py-4 text-sm text-slate-300">
                  {purchase.quantity.toLocaleString()} KG
                </td>

                <td className="px-6 py-4 text-sm font-medium text-blue-400">
                  {formatCurrency(purchase.amount)}
                </td>

                <td className="px-6 py-4 text-sm text-slate-400">
                  {purchase.date}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default RecentPurchases;