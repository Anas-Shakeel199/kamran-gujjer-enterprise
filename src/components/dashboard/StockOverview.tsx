import { Package, Scale, Wallet } from "lucide-react";

interface StockOverviewProps {
  totalStockKg: number;
  totalStockValue: number;
}

const StockOverview = ({
  totalStockKg,
  totalStockValue,
}: StockOverviewProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">
          Stock Overview
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Current factory stock summary
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Scale size={21} />
            </div>

            <div>
              <p className="text-sm text-slate-400">
                Available Stock
              </p>

              <p className="mt-1 text-xl font-bold text-white">
                {totalStockKg.toLocaleString()} KG
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
              <Wallet size={21} />
            </div>

            <div>
              <p className="text-sm text-slate-400">
                Stock Value
              </p>

              <p className="mt-1 text-xl font-bold text-white">
                {formatCurrency(totalStockValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/5 px-4 py-3">
        <Package
          size={18}
          className="shrink-0 text-emerald-400"
        />

        <p className="text-sm text-slate-400">
  Total available maal currently factory mein available hai.
</p>
      </div>
    </section>
  );
};

export default StockOverview;