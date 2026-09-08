import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Package,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import type { Page } from "../types/navigation";
import StatCard from "../components/dashboard/StatCard";
import RecentSales from "../components/dashboard/RecentSales";
import RecentPurchases from "../components/dashboard/RecentPurchases";

import partyService from "../services/partyService";
import type { PartySummary } from "../types/party";

import purchaseService from "../services/purchaseService";
import saleService from "../services/saleService";
import expenseService from "../services/expenseService";
import settingsService from "../services/settingsService";

import type { Purchase } from "../types/purchase";
import type { Sale } from "../types/sale";
import type { Expense } from "../types/expense";
import type { Factory } from "../types/settings";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

interface DashboardProps {
  user: LoggedInUser;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (value: number) => {
  return value.toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  });
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const getToday = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const Dashboard = ({
  user,
  activePage,
  onNavigate,
  onLogout,
}: DashboardProps) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [supplierParties, setSupplierParties] = useState<PartySummary[]>([]);
  const [customerParties, setCustomerParties] = useState<PartySummary[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const today = getToday();

  // ==========================================
  // LOAD DASHBOARD DATA
  // ==========================================

  const loadDashboardData = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setLoadError("");

      const [
        purchaseData,
        saleData,
        expenseData,
        factoryListRaw,
      ] = await Promise.all([
        purchaseService.getPurchases(),
        saleService.getSales(),
        expenseService.getExpenses(),
        settingsService.getFactories(),
      ]);

      const activeFactories = factoryListRaw.filter(
        (factory) => factory.isActive
      );

      /*
       * Parties factory-scoped hain.
       * Har active factory se supplier/customer parties load
       * karke overall dashboard balance calculate karte hain.
       */
      const [supplierPartyLists, customerPartyLists] =
        await Promise.all([
          Promise.all(
            activeFactories.map((factory) =>
              partyService.getParties("supplier", factory.name)
            )
          ),
          Promise.all(
            activeFactories.map((factory) =>
              partyService.getParties("customer", factory.name)
            )
          ),
        ]);

      const supplierPartyData = supplierPartyLists.flat();
      const customerPartyData = customerPartyLists.flat();

      setPurchases(purchaseData);
      setSales(saleData);
      setExpenses(expenseData);
      setSupplierParties(supplierPartyData);
      setCustomerParties(customerPartyData);
      setFactories(activeFactories);
    } catch (error) {
      setLoadError(
        typeof error === "string"
          ? error
          : "Dashboard data load nahi ho saka. Dobara try karein."
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ==========================================
  // TODAY'S PURCHASES
  // ==========================================

  const todayPurchases = useMemo(
    () =>
      purchases.filter(
        (purchase) => purchase.purchaseDate === today
      ),
    [purchases, today]
  );

  const todayPurchaseKg = useMemo(
    () =>
      todayPurchases.reduce(
        (sum, purchase) => sum + purchase.quantity,
        0
      ),
    [todayPurchases]
  );

  const todayPurchaseAmount = useMemo(
    () =>
      todayPurchases.reduce(
        (sum, purchase) => sum + purchase.totalAmount,
        0
      ),
    [todayPurchases]
  );

  // ==========================================
  // TODAY'S SALES
  // ==========================================

  const todaySales = useMemo(
    () =>
      sales.filter(
        (sale) => sale.saleDate === today
      ),
    [sales, today]
  );

  const todaySalesKg = useMemo(
    () =>
      todaySales.reduce(
        (sum, sale) => sum + sale.quantity,
        0
      ),
    [todaySales]
  );

  const todaySalesAmount = useMemo(
    () =>
      todaySales.reduce(
        (sum, sale) => sum + sale.totalAmount,
        0
      ),
    [todaySales]
  );

  // ==========================================
  // TODAY'S EXPENSES
  // ==========================================

  const todayExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) => expense.expenseDate === today
      ),
    [expenses, today]
  );

  const todayExpenseAmount = useMemo(
    () =>
      todayExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      ),
    [todayExpenses]
  );

  // ==========================================
  // NET ACTIVITY
  // ==========================================

  const todayNetActivity = useMemo(
    () => todaySalesAmount - todayExpenseAmount,
    [todaySalesAmount, todayExpenseAmount]
  );

  // ==========================================
  // RECEIVABLE / PAYABLE
  // ==========================================

  const totalPayable = useMemo(
    () =>
      supplierParties.reduce(
        (sum, party) => sum + party.balance,
        0
      ),
    [supplierParties]
  );

  const totalReceivable = useMemo(
    () =>
      customerParties.reduce(
        (sum, party) => sum + party.balance,
        0
      ),
    [customerParties]
  );

  // ==========================================
  // FACTORY STOCK
  // ==========================================

  const factoryStockData = useMemo(() => {
    return factories.map((factory) => {
      const factoryPurchases = purchases.filter(
        (purchase) => purchase.factory === factory.name
      );

      const factorySales = sales.filter(
        (sale) => sale.factory === factory.name
      );

      const purchasedKg = factoryPurchases.reduce(
        (sum, purchase) => sum + purchase.quantity,
        0
      );

      const soldKg = factorySales.reduce(
        (sum, sale) => sum + sale.quantity,
        0
      );

      const purchaseValue = factoryPurchases.reduce(
        (sum, purchase) => sum + purchase.totalAmount,
        0
      );

      const stockKg = Math.max(
        purchasedKg - soldKg,
        0
      );

      const averagePurchaseRate =
        purchasedKg > 0
          ? purchaseValue / purchasedKg
          : 0;

      const stockValue =
        averagePurchaseRate * stockKg;

      // Category breakdown
      const purchasedByCategory = new Map<
        string,
        number
      >();

      factoryPurchases.forEach((purchase) => {
        purchasedByCategory.set(
          purchase.category,
          (purchasedByCategory.get(
            purchase.category
          ) ?? 0) + purchase.quantity
        );
      });

      const soldByCategory = new Map<
        string,
        number
      >();

      factorySales.forEach((sale) => {
        soldByCategory.set(
          sale.category,
          (soldByCategory.get(sale.category) ?? 0) +
            sale.quantity
        );
      });

      const allCategories = new Set([
        ...purchasedByCategory.keys(),
        ...soldByCategory.keys(),
      ]);

      const categoryBreakdown = Array.from(
        allCategories
      )
        .map((category) => ({
          category,
          stock: Math.max(
            (purchasedByCategory.get(category) ?? 0) -
              (soldByCategory.get(category) ?? 0),
            0
          ),
        }))
        .sort((a, b) => b.stock - a.stock);

      return {
        factory: factory.name,
        stockKg,
        stockValue,
        purchasedKg,
        soldKg,
        categoryBreakdown,
      };
    });
  }, [factories, purchases, sales]);

  // ==========================================
  // OVERALL STOCK
  // ==========================================

  const totalStockKg = useMemo(
    () =>
      factoryStockData.reduce(
        (sum, factory) => sum + factory.stockKg,
        0
      ),
    [factoryStockData]
  );

  const totalStockValue = useMemo(
    () =>
      factoryStockData.reduce(
        (sum, factory) => sum + factory.stockValue,
        0
      ),
    [factoryStockData]
  );

  // ==========================================
  // RECENT TRANSACTIONS
  // ==========================================

  const recentPurchases = useMemo(
    () =>
      purchases
        .slice(0, 5)
        .map((purchase) => ({
          id: purchase.id,
          supplier: purchase.supplierName,
          quantity: purchase.quantity,
          amount: purchase.totalAmount,
          date: new Date(
            purchase.purchaseDate
          ).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        })),
    [purchases]
  );

  const recentSales = useMemo(
    () =>
      sales
        .slice(0, 5)
        .map((sale) => ({
          id: sale.id,
          party: sale.customerName,
          quantity: sale.quantity,
          amount: sale.totalAmount,
          date: new Date(
            sale.saleDate
          ).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
        })),
    [sales]
  );

  // ==========================================
  // LOADING SKELETON
  // ==========================================

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        <main className="min-w-0 flex-1 p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-8 w-48 rounded-lg bg-slate-800" />
                <div className="mt-3 h-4 w-80 rounded bg-slate-800" />
              </div>

              <div className="hidden h-16 w-44 rounded-xl bg-slate-900 sm:block" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-32 rounded-2xl border border-slate-800 bg-slate-900"
                />
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-28 rounded-2xl border border-slate-800 bg-slate-900"
                />
              ))}
            </div>

            <div className="h-56 rounded-2xl border border-slate-800 bg-slate-900" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="min-w-0 flex-1 p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          {/* ==========================================
              HEADER
          ========================================== */}

          <header className="mb-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                    Factory Management
                  </span>
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Dashboard
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Welcome back,{" "}
                  <span className="font-medium text-slate-200">
                    {user.username}
                  </span>
                  . Factory ka complete overview yahan se
                  manage karein.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Date */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
                    <CalendarDays size={18} />
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Today
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-slate-200">
                      {formatDate(new Date())}
                    </p>
                  </div>
                </div>

                {/* User */}
                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-bold uppercase text-emerald-400">
                    {user.username.charAt(0)}
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Current User
                    </p>

                    <p className="mt-0.5 text-sm font-semibold capitalize text-emerald-400">
                      {user.role}
                    </p>
                  </div>
                </div>

                {/* Refresh */}
                <button
                  type="button"
                  onClick={() => loadDashboardData(true)}
                  disabled={isRefreshing}
                  title="Refresh dashboard"
                  className="flex h-[62px] items-center justify-center rounded-xl border border-slate-800 bg-slate-900 px-4 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw
                    size={19}
                    className={
                      isRefreshing
                        ? "animate-spin"
                        : ""
                    }
                  />
                </button>
              </div>
            </div>
          </header>

          {/* ==========================================
              ERROR
          ========================================== */}

          {loadError && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0 text-red-400"
              />

              <div>
                <p className="text-sm font-semibold text-red-300">
                  Dashboard Error
                </p>

                <p className="mt-1 text-sm text-red-400">
                  {loadError}
                </p>
              </div>
            </div>
          )}

          {/* ==========================================
              TODAY'S ACTIVITY
          ========================================== */}

          <section>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Daily Overview
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Today's Activity
                </h2>
              </div>

              <p className="hidden text-xs text-slate-500 sm:block">
                Aaj ka business snapshot
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Today's Purchases"
                value={`${formatNumber(todayPurchaseKg)} KG`}
                subtitle={formatCurrency(
                  todayPurchaseAmount
                )}
                icon={<ShoppingCart size={22} />}
                iconClassName="bg-violet-500/10 text-violet-400"
              />

              <StatCard
                title="Today's Sales"
                value={`${formatNumber(todaySalesKg)} KG`}
                subtitle={formatCurrency(
                  todaySalesAmount
                )}
                icon={<ShoppingBag size={22} />}
                iconClassName="bg-cyan-500/10 text-cyan-400"
              />

              <StatCard
                title="Today's Expenses"
                value={formatCurrency(
                  todayExpenseAmount
                )}
                subtitle={`${todayExpenses.length} expense${
                  todayExpenses.length === 1
                    ? ""
                    : "s"
                } recorded`}
                icon={<Wallet size={22} />}
                iconClassName="bg-amber-500/10 text-amber-400"
              />

              <StatCard
                title="Net Sales Activity"
                value={formatCurrency(
                  todayNetActivity
                )}
                subtitle="Sales minus expenses"
                icon={
                  todayNetActivity >= 0 ? (
                    <TrendingUp size={22} />
                  ) : (
                    <TrendingDown size={22} />
                  )
                }
                iconClassName={
                  todayNetActivity >= 0
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }
              />
            </div>
          </section>

          {/* ==========================================
              BUSINESS OVERVIEW
          ========================================== */}

          <section className="mt-8">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Business Overview
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                Current Position
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Receivable */}
              <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-500/30 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Total Receivable
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                      {formatCurrency(
                        totalReceivable
                      )}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Customers se lena hai
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition group-hover:scale-105">
                    <TrendingUp size={20} />
                  </div>
                </div>
              </div>

              {/* Payable */}
              <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-red-500/30 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Total Payable
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                      {formatCurrency(totalPayable)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Suppliers ko dena hai
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400 transition group-hover:scale-105">
                    <TrendingDown size={20} />
                  </div>
                </div>
              </div>

              {/* Stock */}
              <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-violet-500/30 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Total Stock
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                      {formatNumber(totalStockKg)}{" "}
                      <span className="text-base font-semibold text-slate-400">
                        KG
                      </span>
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      All active factories
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 transition group-hover:scale-105">
                    <Package size={20} />
                  </div>
                </div>
              </div>

              {/* Factories */}
              <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/30 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Active Factories
                    </p>

                    <p className="mt-2 text-2xl font-bold tracking-tight text-white">
                      {factories.length}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Currently active
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 transition group-hover:scale-105">
                    <Building2 size={20} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ==========================================
              STOCK VALUE BANNER
          ========================================== */}

          <section className="mt-8">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900 to-slate-900 p-6">
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-500/5 blur-3xl" />

              <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <CircleDollarSign size={24} />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Inventory Valuation
                    </p>

                    <h3 className="mt-1 text-xl font-bold text-white">
                      {formatCurrency(totalStockValue)}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Estimated value of current stock
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/10 bg-slate-950/40 px-4 py-3">
                  <Activity
                    size={17}
                    className="text-emerald-400"
                  />

                  <span className="text-sm text-slate-300">
                    {formatNumber(totalStockKg)} KG
                    <span className="mx-2 text-slate-700">
                      •
                    </span>
                    {factories.length}{" "}
                    {factories.length === 1
                      ? "factory"
                      : "factories"}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ==========================================
              FACTORY STOCK
          ========================================== */}

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-400">
                  Inventory
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Factory-wise Stock
                </h2>
              </div>

              <p className="hidden text-xs text-slate-500 sm:block">
                Maal ka current stock overview
              </p>
            </div>

            {factories.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/60 p-10 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-500">
                  <Building2 size={22} />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-300">
                  No factories added
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                  Abhi tak koi active factory nahi hai.
                  Settings mein ja kar factory add karein.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {factoryStockData.map((data) => (
                  <div
                    key={data.factory}
                    className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900"
                  >
                    {/* Factory Header */}
                    <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                          <Building2 size={20} />
                        </div>

                        <div>
                          <h3 className="font-semibold text-white">
                            {data.factory}
                          </h3>

                          <p className="mt-0.5 text-xs text-slate-500">
                            Factory inventory overview
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>
                          Purchased{" "}
                          <span className="font-semibold text-slate-300">
                            {formatNumber(
                              data.purchasedKg
                            )}{" "}
                            KG
                          </span>
                        </span>

                        <span className="text-slate-700">
                          •
                        </span>

                        <span>
                          Sold{" "}
                          <span className="font-semibold text-slate-300">
                            {formatNumber(
                              data.soldKg
                            )}{" "}
                            KG
                          </span>
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      {/* Main factory stats */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                Current Stock
                              </p>

                              <p className="mt-2 text-2xl font-bold text-emerald-400">
                                {formatNumber(
                                  data.stockKg
                                )}{" "}
                                <span className="text-sm">
                                  KG
                                </span>
                              </p>
                            </div>

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                              <Package size={19} />
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                                Stock Value
                              </p>

                              <p className="mt-2 text-2xl font-bold text-white">
                                {formatCurrency(
                                  data.stockValue
                                )}
                              </p>
                            </div>

                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                              <Wallet size={19} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Category Breakdown */}
                      {data.categoryBreakdown.length > 0 && (
                        <div className="mt-5">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                              Category Breakdown
                            </p>

                            <span className="text-xs text-slate-600">
                              {data.categoryBreakdown.length}{" "}
                              categories
                            </span>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {data.categoryBreakdown.map(
                              ({
                                category,
                                stock,
                              }) => (
                                <div
                                  key={category}
                                  className="group rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-slate-700 hover:bg-slate-950"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-slate-300">
                                        {category}
                                      </p>

                                      <p className="mt-1 text-lg font-bold text-white">
                                        {formatNumber(
                                          stock
                                        )}{" "}
                                        <span className="text-xs font-medium text-slate-500">
                                          KG
                                        </span>
                                      </p>
                                    </div>

                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400 transition group-hover:scale-105">
                                      <Package size={17} />
                                    </div>
                                  </div>

                                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
                                    <div
                                      className="h-full rounded-full bg-violet-500/70 transition-all"
                                      style={{
                                        width: `${Math.min(
                                          data.stockKg > 0
                                            ? (stock /
                                                data.stockKg) *
                                                100
                                            : 0,
                                          100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {data.categoryBreakdown.length === 0 && (
                        <div className="mt-5 rounded-xl border border-dashed border-slate-800 px-4 py-5 text-center">
                          <p className="text-sm text-slate-500">
                            Is factory mein abhi stock
                            category data available nahi hai.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ==========================================
              TODAY SUMMARY
          ========================================== */}

          <section className="mt-8">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                Daily Summary
              </p>

              <h2 className="mt-1 text-lg font-semibold text-white">
                Today's Numbers
              </h2>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {/* Purchase */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <ShoppingCart size={19} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Purchases
                    </p>
                    <p className="text-xs text-slate-500">
                      {todayPurchases.length} transaction
                      {todayPurchases.length === 1
                        ? ""
                        : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(todayPurchaseKg)}{" "}
                      <span className="text-sm text-slate-500">
                        KG
                      </span>
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-violet-400">
                    {formatCurrency(
                      todayPurchaseAmount
                    )}
                  </p>
                </div>
              </div>

              {/* Sales */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                    <ShoppingBag size={19} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Sales
                    </p>
                    <p className="text-xs text-slate-500">
                      {todaySales.length} transaction
                      {todaySales.length === 1
                        ? ""
                        : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {formatNumber(todaySalesKg)}{" "}
                      <span className="text-sm text-slate-500">
                        KG
                      </span>
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-cyan-400">
                    {formatCurrency(todaySalesAmount)}
                  </p>
                </div>
              </div>

              {/* Expenses */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                    <Wallet size={19} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Expenses
                    </p>
                    <p className="text-xs text-slate-500">
                      {todayExpenses.length} expense
                      {todayExpenses.length === 1
                        ? ""
                        : "s"}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(
                        todayExpenseAmount
                      )}
                    </p>
                  </div>

                  <p className="text-xs font-medium text-slate-500">
                    Today's total
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ==========================================
              RECENT TRANSACTIONS
          ========================================== */}

          <section className="mt-8">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Activity
                </p>

                <h2 className="mt-1 text-lg font-semibold text-white">
                  Recent Transactions
                </h2>
              </div>

              <CheckCircle2
                size={18}
                className="text-emerald-500/60"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <RecentSales sales={recentSales} />
              <RecentPurchases
                purchases={recentPurchases}
              />
            </div>
          </section>

          {/* ==========================================
              FOOTER
          ========================================== */}

          <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-slate-900 pt-5 text-xs text-slate-600 sm:flex-row">
            <p>
              Kamran Gujjer Enterprise • Factory
              Management System
            </p>

            <p>
              Dashboard updated{" "}
              {new Date().toLocaleTimeString("en-PK", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;