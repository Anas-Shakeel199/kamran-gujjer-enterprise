import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  Download,
  FileBarChart,
  Loader2,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import ExcelJS from "exceljs";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

import Sidebar from "../components/Sidebar";
import purchaseService from "../services/purchaseService";
import saleService from "../services/saleService";
import expenseService from "../services/expenseService";
import paymentService from "../services/paymentService";
import partyService from "../services/partyService";
import settingsService from "../services/settingsService";

import type { Purchase } from "../types/purchase";
import type { Sale } from "../types/sale";
import type { Expense } from "../types/expense";
import type { PaymentRecord } from "../types/payment";
import type { PartySummary } from "../types/party";
import type { Page } from "../types/navigation";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

interface ReportsProps {
  user: LoggedInUser;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

type Preset = "today" | "week" | "month" | "year" | "custom";

type Factory = {
  id: number;
  name: string;
  isActive: boolean;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (amount: number) => {
  return new Intl.NumberFormat("en-PK", {
    maximumFractionDigits: 0,
  }).format(amount);
};

// Timezone-safe date
const toLocalISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getPresetRange = (
  preset: Preset
): {
  from: string;
  to: string;
} => {
  const now = new Date();
  const today = toLocalISODate(now);

  if (preset === "today") {
    return {
      from: today,
      to: today,
    };
  }

  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);

    return {
      from: toLocalISODate(start),
      to: today,
    };
  }

  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    return {
      from: toLocalISODate(start),
      to: today,
    };
  }

  if (preset === "year") {
    const start = new Date(now.getFullYear(), 0, 1);

    return {
      from: toLocalISODate(start),
      to: today,
    };
  }

  return {
    from: today,
    to: today,
  };
};

// =====================================================
// EXCEL EXPORT
// =====================================================

async function exportReportToExcel(params: {
  fromDate: string;
  toDate: string;
  factoryLabel: string;
  purchases: Purchase[];
  sales: Sale[];
  expenses: Expense[];
  payments: PaymentRecord[];
  summary: {
    totalPurchases: number;
    totalSales: number;
    totalExpenses: number;
    paymentsIn: number;
    paymentsOut: number;
    profitLoss: number;
    totalReceivable: number;
    totalPayable: number;
  };
}) {
  const {
    fromDate,
    toDate,
    factoryLabel,
    purchases,
    sales,
    expenses,
    payments,
    summary,
  } = params;

  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Kamran Gujjer Enterprise";
  workbook.created = new Date();

  const headerFill: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb: "FF0F172A",
    },
  };

  const headerFont: Partial<ExcelJS.Font> = {
    bold: true,
    color: {
      argb: "FFFFFFFF",
    },
  };

  const styleHeaderRow = (row: ExcelJS.Row) => {
    row.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      cell.border = {
        bottom: {
          style: "thin",
          color: {
            argb: "FF334155",
          },
        },
      };
    });

    row.height = 22;
  };

  // =====================================================
  // SUMMARY
  // =====================================================

  const summarySheet = workbook.addWorksheet("Summary");

  summarySheet.mergeCells("A1:B1");
  summarySheet.getCell("A1").value = "Kamran Gujjer Enterprise";
  summarySheet.getCell("A1").font = {
    bold: true,
    size: 16,
  };

  summarySheet.mergeCells("A2:B2");
  summarySheet.getCell(
    "A2"
  ).value = `Factory: ${factoryLabel} | Report Period: ${fromDate} to ${toDate}`;

  summarySheet.getCell("A2").font = {
    italic: true,
    color: {
      argb: "FF64748B",
    },
  };

  summarySheet.addRow([]);

  const summaryHeaderRow = summarySheet.addRow([
    "Metric",
    "Amount (PKR)",
  ]);

  styleHeaderRow(summaryHeaderRow);

  summarySheet.columns = [
    {
      width: 36,
    },
    {
      width: 22,
    },
  ];

  const summaryRows: [string, number][] = [
    ["Total Purchases", summary.totalPurchases],
    ["Total Sales", summary.totalSales],
    ["Total Expenses", summary.totalExpenses],
    ["Payments Received (In)", summary.paymentsIn],
    ["Payments Given (Out)", summary.paymentsOut],
    ["Estimated Profit / Loss", summary.profitLoss],
    ["Total Receivable (as of today)", summary.totalReceivable],
    ["Total Payable (as of today)", summary.totalPayable],
  ];

  summaryRows.forEach(([label, value]) => {
    const row = summarySheet.addRow([label, value]);

    row.getCell(2).numFmt = "#,##0";

    if (label === "Estimated Profit / Loss") {
      row.font = {
        bold: true,
      };

      row.getCell(2).font = {
        bold: true,
        color: {
          argb: value >= 0 ? "FF059669" : "FFDC2626",
        },
      };
    }
  });

  // =====================================================
  // PURCHASES
  // =====================================================

  const purchaseSheet = workbook.addWorksheet("Purchases");

  purchaseSheet.columns = [
    {
      header: "Bill Number",
      key: "bill",
      width: 14,
    },
    {
      header: "Date",
      key: "date",
      width: 13,
    },
    {
      header: "Factory",
      key: "factory",
      width: 18,
    },
    {
      header: "Supplier",
      key: "supplier",
      width: 22,
    },
    {
      header: "Phone",
      key: "phone",
      width: 15,
    },
    {
      header: "Category",
      key: "category",
      width: 14,
    },
    {
      header: "Quantity (KG)",
      key: "qty",
      width: 14,
    },
    {
      header: "Rate/KG",
      key: "rate",
      width: 12,
    },
    {
      header: "Total Amount",
      key: "total",
      width: 16,
    },
    {
      header: "Status",
      key: "status",
      width: 12,
    },
    {
      header: "Paid",
      key: "paid",
      width: 14,
    },
    {
      header: "Remaining",
      key: "remaining",
      width: 14,
    },
  ];

  styleHeaderRow(purchaseSheet.getRow(1));

  purchases.forEach((p) => {
    purchaseSheet.addRow({
      bill: p.billNumber,
      date: p.purchaseDate,
      factory: p.factory,
      supplier: p.supplierName,
      phone: p.phoneNumber,
      category: p.category,
      qty: p.quantity,
      rate: p.ratePerKg,
      total: p.totalAmount,
      status: p.paymentStatus,
      paid: p.paidAmount,
      remaining: p.remainingAmount,
    });
  });

  ["total", "rate", "paid", "remaining"].forEach((key) => {
    purchaseSheet.getColumn(key).numFmt = "#,##0";
  });

  const purchaseTotalRow = purchaseSheet.addRow({
    bill: "",
    supplier: "TOTAL",
    total: purchases.reduce(
      (sum, purchase) => sum + purchase.totalAmount,
      0
    ),
  });

  purchaseTotalRow.font = {
    bold: true,
  };

  purchaseTotalRow.getCell("total").numFmt = "#,##0";

  // =====================================================
  // SALES
  // =====================================================

  const saleSheet = workbook.addWorksheet("Sales");

  saleSheet.columns = [
    {
      header: "Bill Number",
      key: "bill",
      width: 14,
    },
    {
      header: "Date",
      key: "date",
      width: 13,
    },
    {
      header: "Factory",
      key: "factory",
      width: 18,
    },
    {
      header: "Customer",
      key: "customer",
      width: 22,
    },
    {
      header: "Phone",
      key: "phone",
      width: 15,
    },
    {
      header: "Category",
      key: "category",
      width: 14,
    },
    {
      header: "Quantity (KG)",
      key: "qty",
      width: 14,
    },
    {
      header: "Rate/KG",
      key: "rate",
      width: 12,
    },
    {
      header: "Total Amount",
      key: "total",
      width: 16,
    },
    {
      header: "Status",
      key: "status",
      width: 12,
    },
    {
      header: "Paid",
      key: "paid",
      width: 14,
    },
    {
      header: "Remaining",
      key: "remaining",
      width: 14,
    },
  ];

  styleHeaderRow(saleSheet.getRow(1));

  sales.forEach((s) => {
    saleSheet.addRow({
      bill: s.billNumber,
      date: s.saleDate,
      factory: s.factory,
      customer: s.customerName,
      phone: s.phoneNumber,
      category: s.category,
      qty: s.quantity,
      rate: s.ratePerKg,
      total: s.totalAmount,
      status: s.paymentStatus,
      paid: s.paidAmount,
      remaining: s.remainingAmount,
    });
  });

  ["total", "rate", "paid", "remaining"].forEach((key) => {
    saleSheet.getColumn(key).numFmt = "#,##0";
  });

  const saleTotalRow = saleSheet.addRow({
    bill: "",
    customer: "TOTAL",
    total: sales.reduce(
      (sum, sale) => sum + sale.totalAmount,
      0
    ),
  });

  saleTotalRow.font = {
    bold: true,
  };

  saleTotalRow.getCell("total").numFmt = "#,##0";

  // =====================================================
  // EXPENSES
  // =====================================================

  const expenseSheet = workbook.addWorksheet("Expenses");

  expenseSheet.columns = [
    {
      header: "Date",
      key: "date",
      width: 13,
    },
    {
      header: "Factory",
      key: "factory",
      width: 18,
    },
    {
      header: "Category",
      key: "category",
      width: 16,
    },
    {
      header: "Description",
      key: "description",
      width: 28,
    },
    {
      header: "Amount",
      key: "amount",
      width: 14,
    },
    {
      header: "Payment Method",
      key: "method",
      width: 16,
    },
    {
      header: "Notes",
      key: "notes",
      width: 24,
    },
  ];

  styleHeaderRow(expenseSheet.getRow(1));

  expenses.forEach((e) => {
    expenseSheet.addRow({
      date: e.expenseDate,
      factory: e.factory,
      category: e.category,
      description: e.description ?? "",
      amount: e.amount,
      method: e.paymentMethod,
      notes: e.notes ?? "",
    });
  });

  expenseSheet.getColumn("amount").numFmt = "#,##0";

  const expenseTotalRow = expenseSheet.addRow({
    category: "TOTAL",
    amount: expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    ),
  });

  expenseTotalRow.font = {
    bold: true,
  };

  expenseTotalRow.getCell("amount").numFmt = "#,##0";

  // =====================================================
  // PAYMENTS
  // =====================================================

  const paymentSheet = workbook.addWorksheet("Payments");

  paymentSheet.columns = [
    {
      header: "Date",
      key: "date",
      width: 13,
    },
    {
      header: "Factory",
      key: "factory",
      width: 18,
    },
    {
      header: "Party",
      key: "party",
      width: 22,
    },
    {
      header: "Type",
      key: "type",
      width: 14,
    },
    {
      header: "Amount",
      key: "amount",
      width: 14,
    },
    {
      header: "Method",
      key: "method",
      width: 16,
    },
    {
      header: "Reference",
      key: "reference",
      width: 16,
    },
    {
      header: "Notes",
      key: "notes",
      width: 24,
    },
  ];

  styleHeaderRow(paymentSheet.getRow(1));

  payments.forEach((p) => {
    paymentSheet.addRow({
      date: p.paymentDate,
      factory: p.factory,
      party: p.partyName,
      type:
        p.partyType === "customer"
          ? "Payment In"
          : "Payment Out",
      amount: p.amount,
      method: p.paymentMethod ?? "",
      reference: p.reference ?? "",
      notes: p.notes ?? "",
    });
  });

  paymentSheet.getColumn("amount").numFmt = "#,##0";

  // =====================================================
  // SAVE FILE
  // =====================================================

  const factorySlug =
    factoryLabel === "All Factories"
      ? "AllFactories"
      : factoryLabel.replace(/\s+/g, "_");

  const destinationPath = await save({
    title: "Report save karein",
    defaultPath: `Report_${factorySlug}_${fromDate}_to_${toDate}.xlsx`,
    filters: [
      {
        name: "Excel Workbook",
        extensions: ["xlsx"],
      },
    ],
  });

  if (!destinationPath) {
    return;
  }

  const buffer = await workbook.xlsx.writeBuffer();

  const bytes = Array.from(
    new Uint8Array(buffer as ArrayBuffer)
  );

  await invoke("save_binary_file", {
    path: destinationPath,
    data: bytes,
  });
}

// =====================================================
// MAIN REPORTS PAGE
// =====================================================

const Reports = ({
  user,
  activePage,
  onNavigate,
  onLogout,
}: ReportsProps) => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  const [supplierParties, setSupplierParties] = useState<
    PartySummary[]
  >([]);

  const [customerParties, setCustomerParties] = useState<
    PartySummary[]
  >([]);

  const [factories, setFactories] = useState<Factory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [preset, setPreset] = useState<Preset>("month");

  const [fromDate, setFromDate] = useState(
    getPresetRange("month").from
  );

  const [toDate, setToDate] = useState(
    getPresetRange("month").to
  );

  const [factoryFilter, setFactoryFilter] =
    useState<string>("all");

  // =====================================================
  // LOAD DATA
  // =====================================================

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const [
        purchaseData,
        saleData,
        expenseData,
        paymentData,
        factoryListRaw,
      ] = await Promise.all([
        purchaseService.getPurchases(),
        saleService.getSales(),
        expenseService.getExpenses(),
        paymentService.getPayments(),
        settingsService.getFactories(),
      ]);

      const activeFactories = factoryListRaw.filter(
        (factory) => factory.isActive
      );

      const [
        supplierPartyLists,
        customerPartyLists,
      ] = await Promise.all([
        Promise.all(
          activeFactories.map((factory) =>
            partyService.getParties(
              "supplier",
              factory.name
            )
          )
        ),
        Promise.all(
          activeFactories.map((factory) =>
            partyService.getParties(
              "customer",
              factory.name
            )
          )
        ),
      ]);

      setPurchases(purchaseData);
      setSales(saleData);
      setExpenses(expenseData);
      setPayments(paymentData);

      setSupplierParties(
        supplierPartyLists.flat()
      );

      setCustomerParties(
        customerPartyLists.flat()
      );

      setFactories(activeFactories);
    } catch (error) {
      setLoadError(
        typeof error === "string"
          ? error
          : "Report data load nahi ho saka."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // =====================================================
  // FILTERS
  // =====================================================

  const handlePresetClick = (selectedPreset: Preset) => {
    setPreset(selectedPreset);

    if (selectedPreset !== "custom") {
      const range = getPresetRange(selectedPreset);

      setFromDate(range.from);
      setToDate(range.to);
    }
  };

  const inRange = (date: string) => {
    return date >= fromDate && date <= toDate;
  };

  const matchesFactory = (factory: string) => {
    return (
      factoryFilter === "all" ||
      factory === factoryFilter
    );
  };

  const filteredPurchases = useMemo(
    () =>
      purchases.filter(
        (purchase) =>
          inRange(purchase.purchaseDate) &&
          matchesFactory(purchase.factory)
      ),
    [
      purchases,
      fromDate,
      toDate,
      factoryFilter,
    ]
  );

  const filteredSales = useMemo(
    () =>
      sales.filter(
        (sale) =>
          inRange(sale.saleDate) &&
          matchesFactory(sale.factory)
      ),
    [
      sales,
      fromDate,
      toDate,
      factoryFilter,
    ]
  );

  // Factory-wise expenses
  const filteredExpenses = useMemo(
    () =>
      expenses.filter(
        (expense) =>
          inRange(expense.expenseDate) &&
          matchesFactory(expense.factory)
      ),
    [
      expenses,
      fromDate,
      toDate,
      factoryFilter,
    ]
  );

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          inRange(payment.paymentDate) &&
          matchesFactory(payment.factory)
      ),
    [
      payments,
      fromDate,
      toDate,
      factoryFilter,
    ]
  );

  const filteredSupplierParties = useMemo(
    () =>
      supplierParties.filter((party) =>
        matchesFactory(party.factory)
      ),
    [
      supplierParties,
      factoryFilter,
    ]
  );

  const filteredCustomerParties = useMemo(
    () =>
      customerParties.filter((party) =>
        matchesFactory(party.factory)
      ),
    [
      customerParties,
      factoryFilter,
    ]
  );

  // =====================================================
  // TOTALS
  // =====================================================

  const totalPurchases = useMemo(
    () =>
      filteredPurchases.reduce(
        (sum, purchase) =>
          sum + purchase.totalAmount,
        0
      ),
    [filteredPurchases]
  );

  const totalSales = useMemo(
    () =>
      filteredSales.reduce(
        (sum, sale) =>
          sum + sale.totalAmount,
        0
      ),
    [filteredSales]
  );

  const totalExpenses = useMemo(
    () =>
      filteredExpenses.reduce(
        (sum, expense) =>
          sum + expense.amount,
        0
      ),
    [filteredExpenses]
  );

  const paymentsIn = useMemo(
    () =>
      filteredPayments
        .filter(
          (payment) =>
            payment.partyType === "customer"
        )
        .reduce(
          (sum, payment) =>
            sum + payment.amount,
          0
        ),
    [filteredPayments]
  );

  const paymentsOut = useMemo(
    () =>
      filteredPayments
        .filter(
          (payment) =>
            payment.partyType === "supplier"
        )
        .reduce(
          (sum, payment) =>
            sum + payment.amount,
          0
        ),
    [filteredPayments]
  );

  const profitLoss =
    totalSales -
    totalPurchases -
    totalExpenses;

  const totalReceivable = useMemo(
    () =>
      filteredCustomerParties.reduce(
        (sum, party) =>
          sum + party.balance,
        0
      ),
    [filteredCustomerParties]
  );

  const totalPayable = useMemo(
    () =>
      filteredSupplierParties.reduce(
        (sum, party) =>
          sum + party.balance,
        0
      ),
    [filteredSupplierParties]
  );

  const factoryLabel =
    factoryFilter === "all"
      ? "All Factories"
      : factoryFilter;

  const hasReportData =
    filteredPurchases.length > 0 ||
    filteredSales.length > 0 ||
    filteredExpenses.length > 0 ||
    filteredPayments.length > 0;

  // =====================================================
  // EXPORT
  // =====================================================

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setLoadError("");

      await exportReportToExcel({
        fromDate,
        toDate,
        factoryLabel,
        purchases: filteredPurchases,
        sales: filteredSales,
        expenses: filteredExpenses,
        payments: filteredPayments,
        summary: {
          totalPurchases,
          totalSales,
          totalExpenses,
          paymentsIn,
          paymentsOut,
          profitLoss,
          totalReceivable,
          totalPayable,
        },
      });
    } catch (error) {
      setLoadError(
        typeof error === "string"
          ? error
          : "Excel export nahi ho saka."
      );
    } finally {
      setIsExporting(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="min-w-0 flex-1 p-5 lg:p-8">
        {/* =====================================================
            PAGE HEADER
        ===================================================== */}

        <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <FileBarChart size={22} />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  Reports
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                  Business performance, payments aur
                  financial overview.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 sm:block">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                Current User
              </p>

              <p className="mt-0.5 text-sm font-semibold text-emerald-400">
                {user.username}
              </p>
            </div>

            <button
              type="button"
              onClick={loadData}
              disabled={isLoading}
              className="flex h-11 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-semibold text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={
                  isLoading
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>
          </div>
        </div>

        {/* =====================================================
            FILTER PANEL
        ===================================================== */}

        <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-xl shadow-black/10">
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={17}
                  className="text-emerald-400"
                />

                <h2 className="text-sm font-semibold text-white">
                  Report Filters
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Showing:</span>

                <span className="font-medium text-slate-300">
                  {fromDate}
                </span>

                <span>→</span>

                <span className="font-medium text-slate-300">
                  {toDate}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              {/* Presets */}

              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "today",
                    "week",
                    "month",
                    "year",
                    "custom",
                  ] as Preset[]
                ).map((item) => {
                  const active =
                    preset === item;

                  const label =
                    item === "today"
                      ? "Today"
                      : item === "week"
                      ? "Last 7 Days"
                      : item === "month"
                      ? "This Month"
                      : item === "year"
                      ? "This Year"
                      : "Custom Range";

                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() =>
                        handlePresetClick(item)
                      }
                      className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                        active
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-lg shadow-emerald-950/20"
                          : "border-slate-700 bg-slate-800/80 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Factory */}

              <div className="min-w-[220px]">
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Building2 size={13} />
                  Factory
                </label>

                <select
                  value={factoryFilter}
                  onChange={(event) =>
                    setFactoryFilter(
                      event.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                >
                  <option value="all">
                    All Factories
                  </option>

                  {factories.map((factory) => (
                    <option
                      key={factory.id}
                      value={factory.name}
                    >
                      {factory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom date fields */}

            <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  From Date
                </label>

                <input
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setPreset("custom");
                    setFromDate(
                      event.target.value
                    );
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="hidden pb-3 text-slate-600 sm:block">
                →
              </div>

              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-slate-500">
                  To Date
                </label>

                <input
                  type="date"
                  value={toDate}
                  min={fromDate}
                  onChange={(event) => {
                    setPreset("custom");
                    setToDate(
                      event.target.value
                    );
                  }}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={
                  isExporting || isLoading
                }
                className="flex h-[42px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isExporting ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Download size={17} />
                )}

                {isExporting
                  ? "Exporting..."
                  : "Export to Excel"}
              </button>
            </div>
          </div>
        </section>

        {/* =====================================================
            ACTIVE FILTER
        ===================================================== */}

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">
            Active report:
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <CalendarDays size={13} />
            {fromDate} → {toDate}
          </span>

          <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-medium text-slate-300">
            <Building2 size={13} />
            {factoryLabel}
          </span>
        </div>

        {/* =====================================================
            ERROR
        ===================================================== */}

        {loadError && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3.5 text-sm text-red-400">
            <AlertCircle
              size={18}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Something went wrong
              </p>

              <p className="mt-0.5 text-xs text-red-400/80">
                {loadError}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setLoadError("")}
              className="rounded-lg p-1 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <XCircle size={16} />
            </button>
          </div>
        )}

        {/* =====================================================
            LOADING
        ===================================================== */}

        {isLoading ? (
          <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                <Loader2
                  size={24}
                  className="animate-spin"
                />
              </div>

              <p className="mt-4 text-sm font-medium text-slate-300">
                Report data load ho raha hai...
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Purchases, sales, expenses aur
                payments check kiye ja rahe hain.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* =====================================================
                KPI CARDS
            ===================================================== */}

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {/* Purchases */}

              <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-violet-500/20 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                    <ShoppingCart size={21} />
                  </div>

                  <span className="rounded-lg bg-violet-500/5 px-2 py-1 text-[11px] font-medium text-violet-400">
                    Purchase
                  </span>
                </div>

                <p className="mt-5 text-xs font-medium text-slate-500">
                  Total Purchases
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-white">
                  {formatCurrency(
                    totalPurchases
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  {formatNumber(
                    filteredPurchases.length
                  )}{" "}
                  purchase records
                </p>
              </div>

              {/* Sales */}

              <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-cyan-500/20 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400">
                    <ShoppingBag size={21} />
                  </div>

                  <span className="rounded-lg bg-cyan-500/5 px-2 py-1 text-[11px] font-medium text-cyan-400">
                    Sales
                  </span>
                </div>

                <p className="mt-5 text-xs font-medium text-slate-500">
                  Total Sales
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-white">
                  {formatCurrency(
                    totalSales
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  {formatNumber(
                    filteredSales.length
                  )}{" "}
                  sale records
                </p>
              </div>

              {/* Expenses */}

              <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-orange-500/20 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <Banknote size={21} />
                  </div>

                  <span className="rounded-lg bg-orange-500/5 px-2 py-1 text-[11px] font-medium text-orange-400">
                    Expenses
                  </span>
                </div>

                <p className="mt-5 text-xs font-medium text-slate-500">
                  Total Expenses
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-white">
                  {formatCurrency(
                    totalExpenses
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  {formatNumber(
                    filteredExpenses.length
                  )}{" "}
                  expense records
                </p>
              </div>

              {/* Payments In */}

              <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-emerald-500/20 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <TrendingUp size={21} />
                  </div>

                  <span className="rounded-lg bg-emerald-500/5 px-2 py-1 text-[11px] font-medium text-emerald-400">
                    Cash In
                  </span>
                </div>

                <p className="mt-5 text-xs font-medium text-slate-500">
                  Payments Received
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-400">
                  {formatCurrency(
                    paymentsIn
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  Customer payments
                </p>
              </div>

              {/* Payments Out */}

              <div className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-red-500/20 hover:bg-slate-900/80">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                    <TrendingDown size={21} />
                  </div>

                  <span className="rounded-lg bg-red-500/5 px-2 py-1 text-[11px] font-medium text-red-400">
                    Cash Out
                  </span>
                </div>

                <p className="mt-5 text-xs font-medium text-slate-500">
                  Payments Given
                </p>

                <p className="mt-1 text-2xl font-bold tracking-tight text-red-400">
                  {formatCurrency(
                    paymentsOut
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-600">
                  Supplier payments
                </p>
              </div>

              {/* Profit / Loss */}

              <div
                className={`rounded-2xl border p-5 transition ${
                  profitLoss >= 0
                    ? "border-emerald-500/20 bg-emerald-500/[0.04] hover:border-emerald-500/30"
                    : "border-red-500/20 bg-red-500/[0.04] hover:border-red-500/30"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                      profitLoss >= 0
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    <Wallet size={21} />
                  </div>

                  <span
                    className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${
                      profitLoss >= 0
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {profitLoss >= 0
                      ? "Profit"
                      : "Loss"}
                  </span>
                </div>

                <p className="mt-5 text-xs font-medium text-slate-500">
                  Estimated Profit / Loss
                </p>

                <p
                  className={`mt-1 text-2xl font-bold tracking-tight ${
                    profitLoss >= 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {formatCurrency(
                    profitLoss
                  )}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Sales − Purchases − Expenses
                </p>
              </div>
            </div>

            {/* =====================================================
                RECEIVABLE / PAYABLE
            ===================================================== */}

            <div className="mt-6">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">
                    Outstanding Balances
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Current running balances for the
                    selected factory.
                  </p>
                </div>

                <span className="hidden text-xs text-slate-600 sm:block">
                  As of today
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Receivable */}

                <div className="rounded-2xl border border-emerald-500/15 bg-slate-900 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Total Receivable
                      </p>

                      <p className="mt-1 text-2xl font-bold text-emerald-400">
                        {formatCurrency(
                          totalReceivable
                        )}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <TrendingUp size={19} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
                    <CheckCircle2
                      size={14}
                      className="text-emerald-500"
                    />

                    <p className="text-xs text-slate-500">
                      Customers se lena hai
                    </p>
                  </div>
                </div>

                {/* Payable */}

                <div className="rounded-2xl border border-red-500/15 bg-slate-900 p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">
                        Total Payable
                      </p>

                      <p className="mt-1 text-2xl font-bold text-red-400">
                        {formatCurrency(
                          totalPayable
                        )}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                      <TrendingDown size={19} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 border-t border-slate-800 pt-3">
                    <AlertCircle
                      size={14}
                      className="text-red-500"
                    />

                    <p className="text-xs text-slate-500">
                      Suppliers ko dena hai
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* =====================================================
                EMPTY STATE
            ===================================================== */}

            {!hasReportData && (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                  <FileBarChart size={22} />
                </div>

                <h3 className="mt-4 text-sm font-semibold text-slate-300">
                  No report data found
                </h3>

                <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-500">
                  Is date range aur selected factory
                  ke liye koi purchase, sale, expense
                  ya payment record available nahi hai.
                </p>
              </div>
            )}

            {/* =====================================================
                REPORT FOOTER
            ===================================================== */}

            <div className="mt-6 flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2">
                <AlertCircle
                  size={15}
                  className="mt-0.5 shrink-0 text-slate-600"
                />

                <p className="text-xs leading-5 text-slate-500">
                  Profit/Loss ek estimated figure hai:
                  Sales − Purchases − Expenses. Is mein
                  stock valuation include nahi hai.
                </p>
              </div>

              <p className="shrink-0 text-xs font-medium text-slate-600">
                {factoryLabel}
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Reports;
