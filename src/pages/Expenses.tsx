import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import expenseService from "../services/expenseService";
import settingsService from "../services/settingsService";

import type {
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  PaymentMethod,
} from "../types/expense";
import type { Page } from "../types/navigation";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

interface ExpensesProps {
  user: LoggedInUser;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

type DateFilter = "all" | "today" | "custom";

type Factory = {
  id: number;
  name: string;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toLocalISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";

const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400";

const getInitial = (name?: string) =>
  name?.trim()?.charAt(0)?.toUpperCase() || "?";

/* =====================================================
   MANAGE CATEGORIES MODAL
===================================================== */

function ManageCategoriesModal({
  categories,
  onClose,
  onChanged,
}: {
  categories: ExpenseCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newCategory, setNewCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    setError("");

    if (!newCategory.trim()) {
      setError("Category name enter karein.");
      return;
    }

    try {
      setIsSaving(true);

      await expenseService.addCategory(newCategory.trim());

      setNewCategory("");
      onChanged();
    } catch (err) {
      setError(typeof err === "string" ? err : "Category add nahi ho saki.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: ExpenseCategory) => {
    setError("");

    const confirmed = window.confirm(
      `Kya aap "${category.name}" category delete karna chahte hain?`,
    );

    if (!confirmed) return;

    try {
      setDeletingId(category.id);

      await expenseService.deleteCategory(category.id);

      onChanged();
    } catch (err) {
      setError(typeof err === "string" ? err : "Delete nahi ho saka.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
              <Settings size={21} />
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Expense Setup
              </p>

              <h2 className="mt-1 text-lg font-bold text-white">
                Manage Categories
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Add Category */}
          <div className="mb-5">
            <label className={labelClass}>New Category</label>

            <div className="flex gap-2">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAdd();
                  }
                }}
                placeholder="e.g. Transport, Electricity..."
                className={inputClass}
              />

              <button
                type="button"
                onClick={handleAdd}
                disabled={isSaving}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Plus size={17} />
                )}
                Add
              </button>
            </div>
          </div>

          {/* Categories */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Existing Categories
              </p>

              <span className="rounded-full bg-slate-800 px-2.5 py-1 text-[10px] font-semibold text-slate-400">
                {categories.length}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/40">
              {categories.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  No categories found.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between border-b border-slate-800/70 px-4 py-3 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold text-slate-400">
                          {getInitial(category.name)}
                        </div>

                        <span className="text-sm font-medium text-slate-200">
                          {category.name}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(category)}
                        disabled={deletingId === category.id}
                        className="rounded-lg border border-slate-700 p-2 text-slate-500 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                      >
                        {deletingId === category.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 bg-slate-950/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   ADD / EDIT EXPENSE MODAL
===================================================== */

function ExpenseFormModal({
  categories,
  factories,
  existingExpense,
  onClose,
  onSaved,
  onManageCategories,
}: {
  categories: ExpenseCategory[];
  factories: Factory[];
  existingExpense: Expense | null;
  onClose: () => void;
  onSaved: () => void;
  onManageCategories: () => void;
}) {
  const [date, setDate] = useState(
    existingExpense?.expenseDate ?? toLocalISODate(new Date()),
  );

  const [factory, setFactory] = useState(
    existingExpense?.factory ?? factories[0]?.name ?? "",
  );

  const [category, setCategory] = useState(existingExpense?.category ?? "");

  const [description, setDescription] = useState(
    existingExpense?.description ?? "",
  );

  const [amount, setAmount] = useState(
    existingExpense ? String(existingExpense.amount) : "",
  );

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (existingExpense?.paymentMethod as PaymentMethod) ?? "Cash",
  );

  const [notes, setNotes] = useState(existingExpense?.notes ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");

    if (!factory) {
      setError("Factory select karein.");
      return;
    }

    if (!category) {
      setError("Category select karein.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setError("Valid amount enter karein.");
      return;
    }

    const payload: CreateExpenseInput = {
      expenseDate: date,
      factory,
      category,
      description: description.trim() || undefined,
      amount: Number(amount),
      paymentMethod,
      notes: notes.trim() || undefined,
    };

    try {
      setIsSaving(true);

      if (existingExpense) {
        await expenseService.updateExpense(existingExpense.id, payload);
      } else {
        await expenseService.createExpense(payload);
      }

      onSaved();
    } catch (err) {
      setError(typeof err === "string" ? err : "Expense save nahi ho saka.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-400">
              {existingExpense ? <Pencil size={23} /> : <Banknote size={23} />}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-400">
                Factory Accounts
              </p>

              <h2 className="mt-1 text-xl font-bold text-white">
                {existingExpense ? "Edit Expense" : "Add Expense"}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Factory ka daily kharcha record karein.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            {/* Factory + Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <Building2 size={14} />
                    Factory
                  </span>
                </label>

                <div className="relative">
                  <select
                    value={factory}
                    onChange={(e) => setFactory(e.target.value)}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="">Select factory</option>

                    {factories.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={14} />
                    Date
                  </span>
                </label>

                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Category + Amount */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Expense Category
                  </label>

                  <button
                    type="button"
                    onClick={onManageCategories}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 transition hover:text-emerald-300"
                  >
                    <Settings size={12} />
                    Manage
                  </button>
                </div>

                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="">Select category</option>

                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={17}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  <span className="inline-flex items-center gap-2">
                    <Banknote size={14} />
                    Amount
                  </span>
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">
                    Rs.
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className={`${inputClass} pl-12 text-lg font-semibold`}
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <FileText size={14} />
                  Description
                </span>
              </label>

              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jaise: Factory se market tak transport"
                className={inputClass}
              />

              <p className="mt-1.5 text-[11px] text-slate-600">
                Optional — expense ki short detail.
              </p>
            </div>

            {/* Payment Method */}
            <div>
              <label className={labelClass}>Payment Method</label>

              <div className="grid grid-cols-3 gap-3">
                {(["Cash", "Bank", "Other"] as PaymentMethod[]).map(
                  (method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                        paymentMethod === method
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-slate-700 bg-slate-950/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                      }`}
                    >
                      {method}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={labelClass}>Notes</label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Optional notes..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Preview */}
            {amount && Number(amount) > 0 && (
              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Expense Summary
                    </p>

                    <p className="mt-1 text-sm text-slate-300">
                      {factory || "No factory"} • {category || "No category"}
                    </p>
                  </div>

                  <p className="text-xl font-bold text-orange-400">
                    {formatCurrency(Number(amount))}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950/30 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={17} />
                {existingExpense ? "Update Expense" : "Save Expense"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   MAIN EXPENSES PAGE
===================================================== */

const Expenses = ({
  user,
  activePage,
  onNavigate,
  onLogout,
}: ExpensesProps) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);

  const [factories, setFactories] = useState<Factory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [dateFilter, setDateFilter] = useState<DateFilter>("all");

  const [customDate, setCustomDate] = useState(toLocalISODate(new Date()));

  const [categoryFilter, setCategoryFilter] = useState("all");

  const [factoryFilter, setFactoryFilter] = useState("all");

  const [showFormModal, setShowFormModal] = useState(false);

  const [showCategoriesModal, setShowCategoriesModal] = useState(false);

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const today = toLocalISODate(new Date());

  /* =====================================================
     LOAD DATA
  ===================================================== */

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const [expenseData, categoryData, factoryData] = await Promise.all([
        expenseService.getExpenses(),
        expenseService.getCategories(),
        settingsService.getFactories(),
      ]);

      setExpenses(expenseData);
      setCategories(categoryData);

      setFactories(factoryData.filter((factory) => factory.isActive));
    } catch (error) {
      setLoadError(
        typeof error === "string" ? error : "Data load nahi ho saka.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     TOTALS
  ===================================================== */

  const todayTotal = useMemo(
    () =>
      expenses
        .filter(
          (expense) =>
            expense.expenseDate === today &&
            (factoryFilter === "all" || expense.factory === factoryFilter),
        )
        .reduce((sum, expense) => sum + expense.amount, 0),
    [expenses, today, factoryFilter],
  );

  const allTimeTotal = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses],
  );

  const factoryTotal = useMemo(() => {
    if (factoryFilter === "all") {
      return allTimeTotal;
    }

    return expenses
      .filter((expense) => expense.factory === factoryFilter)
      .reduce((sum, expense) => sum + expense.amount, 0);
  }, [expenses, factoryFilter, allTimeTotal]);

  /* =====================================================
     FILTERED EXPENSES
  ===================================================== */

  const filteredExpenses = useMemo(() => {
    let list = expenses;

    if (factoryFilter !== "all") {
      list = list.filter((expense) => expense.factory === factoryFilter);
    }

    if (dateFilter === "today") {
      list = list.filter((expense) => expense.expenseDate === today);
    } else if (dateFilter === "custom") {
      list = list.filter((expense) => expense.expenseDate === customDate);
    }

    if (categoryFilter !== "all") {
      list = list.filter((expense) => expense.category === categoryFilter);
    }

    return list;
  }, [expenses, dateFilter, customDate, categoryFilter, factoryFilter, today]);

  const filteredTotal = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses],
  );

  /* =====================================================
     CATEGORY BREAKDOWN
  ===================================================== */

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();

    filteredExpenses.forEach((expense) => {
      map.set(
        expense.category,
        (map.get(expense.category) ?? 0) + expense.amount,
      );
    });

    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredExpenses]);

  /* =====================================================
     DELETE
  ===================================================== */

  const handleDelete = async (expense: Expense) => {
    setActionError("");

    const confirmed = window.confirm(
      `Kya aap "${expense.category}" (${formatCurrency(
        expense.amount,
      )}) delete karna chahte hain?`,
    );

    if (!confirmed) return;

    try {
      await expenseService.deleteExpense(expense.id);

      setExpenses((prev) => prev.filter((item) => item.id !== expense.id));
    } catch (error) {
      setActionError(
        typeof error === "string" ? error : "Delete nahi ho saka.",
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden p-5 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          {/* =====================================================
              HEADER
          ===================================================== */}

          <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
                <Wallet size={27} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
                  Factory Accounts
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
                  Factory Expenses
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Factory ke daily kharchay record aur manage karein.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 font-bold text-emerald-400">
                {getInitial(user.username)}
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Current User
                </p>

                <p className="text-sm font-semibold text-white">
                  {user.username}
                </p>

                <p className="text-xs capitalize text-slate-500">{user.role}</p>
              </div>
            </div>
          </div>

          {/* =====================================================
              ERRORS
          ===================================================== */}

          {loadError && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} />
                <span>{loadError}</span>
              </div>

              <button
                onClick={loadData}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/10"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            </div>
          )}

          {actionError && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} />
                <span>{actionError}</span>
              </div>

              <button
                onClick={() => setActionError("")}
                className="rounded-lg p-1 transition hover:bg-red-500/10"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* =====================================================
              SUMMARY CARDS
          ===================================================== */}

          <div className="mb-6 grid gap-4 md:grid-cols-3">
            {/* Today */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Today's Expenses
                  </p>

                  <p className="mt-2 text-2xl font-bold text-orange-400">
                    {formatCurrency(todayTotal)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Aaj ka total kharcha
                  </p>
                </div>

                <div className="rounded-xl bg-orange-500/10 p-3 text-orange-400">
                  <CalendarDays size={21} />
                </div>
              </div>
            </div>

            {/* Factory / Filter Total */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {factoryFilter === "all"
                      ? "All Factories"
                      : "Selected Factory — All-Time"}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {formatCurrency(factoryTotal)}
                  </p>

                  <p className="mt-1 max-w-[210px] truncate text-xs text-slate-500">
                    {factoryFilter === "all"
                      ? "Combined expense total"
                      : `${factoryFilter} ka complete expense total`}
                  </p>
                </div>

                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
                  <Building2 size={21} />
                </div>
              </div>
            </div>

            {/* All Time */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    All-Time Total
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {formatCurrency(allTimeTotal)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Complete expense record
                  </p>
                </div>

                <div className="rounded-xl bg-slate-800 p-3 text-slate-300">
                  <Banknote size={21} />
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              FILTER TOOLBAR
          ===================================================== */}

          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex flex-col gap-4">
              {/* Top */}
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Date
                  </span>

                  {(["all", "today", "custom"] as DateFilter[]).map(
                    (filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setDateFilter(filter)}
                        className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                          dateFilter === filter
                            ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        {filter === "all"
                          ? "All Dates"
                          : filter === "today"
                            ? "Today"
                            : "Specific Date"}
                      </button>
                    ),
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  {/* Factory Dropdown */}
                  <div className="relative min-w-[210px]">
                    <Building2
                      size={16}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <select
                      value={factoryFilter}
                      onChange={(e) => setFactoryFilter(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-10 text-sm text-slate-200 outline-none transition focus:border-emerald-500"
                    >
                      <option value="all">All Factories</option>

                      {factories.map((factory) => (
                        <option key={factory.id} value={factory.name}>
                          {factory.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>

                  {/* Category Dropdown */}
                  <div className="relative min-w-[190px]">
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 pr-10 text-sm text-slate-200 outline-none transition focus:border-emerald-500"
                    >
                      <option value="all">All Categories</option>

                      {categories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                  </div>
                </div>
              </div>

              {/* Bottom */}
              <div className="flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                {dateFilter === "custom" ? (
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Date:
                    </span>

                    <input
                      type="date"
                      value={customDate}
                      onChange={(e) => setCustomDate(e.target.value)}
                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-500"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Showing expenses according to selected filters.
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCategoriesModal(true)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
                  >
                    <Settings size={16} />
                    Categories
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setActionError("");

                      if (factories.length === 0) {
                        setActionError(
                          "Pehle Settings mein kam az kam ek active factory add karein.",
                        );
                        return;
                      }

                      setEditingExpense(null);
                      setShowFormModal(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    <Plus size={17} />
                    Add Expense
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              CONTENT
          ===================================================== */}

          {isLoading ? (
            <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
              <div className="text-center">
                <Loader2
                  size={30}
                  className="mx-auto animate-spin text-emerald-400"
                />

                <p className="mt-3 text-sm text-slate-400">
                  Expenses load ho rahe hain...
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 xl:grid-cols-3">
              {/* =================================================
                  EXPENSE TABLE
              ================================================= */}

              <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 xl:col-span-2">
                {/* Table Header */}
                <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold text-white">Expense Ledger</h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {filteredExpenses.length} entries
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-400">
                      {formatCurrency(filteredTotal)}
                    </span>

                    <button
                      type="button"
                      onClick={loadData}
                      disabled={isLoading}
                      className="rounded-xl border border-slate-700 p-2.5 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                      title="Refresh"
                    >
                      <RefreshCw
                        size={16}
                        className={isLoading ? "animate-spin" : ""}
                      />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/30">
                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Date
                        </th>

                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Factory
                        </th>

                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Category
                        </th>

                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Description
                        </th>

                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Amount
                        </th>

                        <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Method
                        </th>

                        <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800">
                      {filteredExpenses.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-16">
                            <div className="flex flex-col items-center justify-center text-center">
                              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                                <Wallet size={25} />
                              </div>

                              <h3 className="mt-4 font-semibold text-slate-200">
                                Koi expense nahi mila
                              </h3>

                              <p className="mt-1 max-w-sm text-sm text-slate-500">
                                Filters change karein ya new expense add karein.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredExpenses.map((expense) => (
                          <tr
                            key={expense.id}
                            className="group transition hover:bg-slate-800/30"
                          >
                            {/* Date */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2 text-sm text-slate-300">
                                <CalendarDays
                                  size={15}
                                  className="text-slate-600"
                                />
                                {formatDate(expense.expenseDate)}
                              </div>
                            </td>

                            {/* Factory */}
                            <td className="px-5 py-4">
                              <span className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 px-2.5 py-1.5 text-xs font-semibold text-blue-400">
                                <Building2 size={13} />
                                {expense.factory}
                              </span>
                            </td>

                            {/* Category */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-400">
                                  {getInitial(expense.category)}
                                </div>

                                <span className="text-sm font-semibold text-slate-200">
                                  {expense.category}
                                </span>
                              </div>
                            </td>

                            {/* Description */}
                            <td className="max-w-[220px] px-5 py-4">
                              <span className="block truncate text-sm text-slate-400">
                                {expense.description ?? "—"}
                              </span>
                            </td>

                            {/* Amount */}
                            <td className="px-5 py-4 text-right">
                              <span className="font-bold text-orange-400">
                                {formatCurrency(expense.amount)}
                              </span>
                            </td>

                            {/* Method */}
                            <td className="px-5 py-4">
                              <span className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300">
                                {expense.paymentMethod}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4">
                              <div className="flex justify-end gap-2 opacity-80 transition group-hover:opacity-100">
                                <button
                                  type="button"
                                  title="Edit expense"
                                  onClick={() => {
                                    setEditingExpense(expense);
                                    setShowFormModal(true);
                                  }}
                                  className="rounded-xl border border-slate-700 p-2.5 text-slate-400 transition hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400"
                                >
                                  <Pencil size={15} />
                                </button>

                                <button
                                  type="button"
                                  title="Delete expense"
                                  onClick={() => handleDelete(expense)}
                                  className="rounded-xl border border-slate-700 p-2.5 text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* =================================================
                  CATEGORY BREAKDOWN
              ================================================= */}

              <div className="rounded-2xl border border-slate-800 bg-slate-900">
                <div className="border-b border-slate-800 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        Category Breakdown
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Selected filters ke according
                      </p>
                    </div>

                    <div className="rounded-xl bg-orange-500/10 p-2.5 text-orange-400">
                      <Banknote size={18} />
                    </div>
                  </div>
                </div>

                <div className="p-5">
                  {categoryBreakdown.length === 0 ? (
                    <div className="py-10 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-slate-500">
                        <Banknote size={21} />
                      </div>

                      <p className="mt-3 text-sm text-slate-500">
                        Koi expense data nahi.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categoryBreakdown.map(([category, total], index) => {
                        const percentage =
                          filteredTotal > 0 ? (total / filteredTotal) * 100 : 0;

                        return (
                          <div
                            key={category}
                            className="rounded-xl border border-slate-800 bg-slate-950/30 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-xs font-bold text-orange-400">
                                  {index + 1}
                                </div>

                                <span className="truncate text-sm font-medium text-slate-300">
                                  {category}
                                </span>
                              </div>

                              <span className="shrink-0 text-sm font-bold text-white">
                                {formatCurrency(total)}
                              </span>
                            </div>

                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-orange-500 transition-all"
                                style={{
                                  width: `${Math.min(percentage, 100)}%`,
                                }}
                              />
                            </div>

                            <p className="mt-1.5 text-right text-[10px] text-slate-600">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* =====================================================
          ADD / EDIT MODAL
      ===================================================== */}

      {showFormModal && (
        <ExpenseFormModal
          categories={categories}
          factories={factories}
          existingExpense={editingExpense}
          onClose={() => {
            setShowFormModal(false);
            setEditingExpense(null);
          }}
          onSaved={() => {
            setShowFormModal(false);
            setEditingExpense(null);
            loadData();
          }}
          onManageCategories={() => setShowCategoriesModal(true)}
        />
      )}

      {/* =====================================================
          CATEGORIES MODAL
      ===================================================== */}

      {showCategoriesModal && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setShowCategoriesModal(false)}
          onChanged={loadData}
        />
      )}
    </div>
  );
};

export default Expenses;
