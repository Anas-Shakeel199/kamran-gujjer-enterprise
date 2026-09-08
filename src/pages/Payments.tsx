import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  Wallet,
  X,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import paymentService from "../services/paymentService";
import partyService from "../services/partyService";
import settingsService from "../services/settingsService";

import type { CreatePaymentInput, PartySummary, PartyType } from "../types/party";
import type { PaymentRecord } from "../types/payment";
import type { Page } from "../types/navigation";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

interface PaymentsProps {
  user: LoggedInUser;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

type FilterType = "all" | "in" | "out";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10";

const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400";

const getInitial = (name?: string) =>
  name?.trim()?.charAt(0)?.toUpperCase() || "?";

/* =========================================================
   ADD PAYMENT MODAL
========================================================= */

function AddPaymentModal({
  factories,
  onClose,
  onSaved,
  onNavigate,
}: {
  factories: { id: number; name: string }[];
  onClose: () => void;
  onSaved: () => void;
  onNavigate: (page: Page) => void;
}) {
  const [direction, setDirection] = useState<"in" | "out">("in");

  const partyType: PartyType =
    direction === "in" ? "customer" : "supplier";

  const [factory, setFactory] = useState(factories[0]?.name ?? "");
  const [parties, setParties] = useState<PartySummary[]>([]);
  const [loadingParties, setLoadingParties] = useState(false);

  const [partySearch, setPartySearch] = useState("");
  const [selectedParty, setSelectedParty] = useState<PartySummary | null>(
    null
  );

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!factory) {
      setParties([]);
      setSelectedParty(null);
      return;
    }

    const loadParties = async () => {
      try {
        setLoadingParties(true);
        setError("");

        const data = await partyService.getParties(partyType, factory);
        setParties(data);
        setSelectedParty(null);
      } catch (err) {
        console.error(err);
        setError("Parties load nahi ho sakin.");
      } finally {
        setLoadingParties(false);
      }
    };

    loadParties();
  }, [partyType, factory]);

  const filteredParties = useMemo(() => {
    const query = partySearch.trim().toLowerCase();

    if (!query) return parties;

    return parties.filter(
      (party) =>
        party.name.toLowerCase().includes(query) ||
        party.phoneNumber.toLowerCase().includes(query)
    );
  }, [parties, partySearch]);

  const handleSave = async () => {
    if (!factory) {
      setError("Factory select karein.");
      return;
    }

    if (!selectedParty) {
      setError(
        direction === "in"
          ? "Customer select karein."
          : "Supplier select karein."
      );
      return;
    }

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Valid payment amount enter karein.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const payload: CreatePaymentInput = {
        phoneNumber: selectedParty.phoneNumber,
        partyType,
        factory,
        amount: numericAmount,
        paymentDate: date,
        paymentMethod: method || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await paymentService.createPayment(payload);

      onSaved();
    } catch (err) {
      console.error(err);
      setError("Payment save nahi ho saki.");
    } finally {
      setIsSaving(false);
    }
  };

  const isPaymentIn = direction === "in";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                isPaymentIn
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {isPaymentIn ? (
                <ArrowDownLeft size={24} />
              ) : (
                <ArrowUpRight size={24} />
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Cash Management
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">
                Add Payment
              </h2>
            </div>
          </div>

          <button
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
              <AlertCircle className="mt-0.5 shrink-0" size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Direction */}
          <div className="mb-6">
            <label className={labelClass}>Payment Direction</label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setDirection("in")}
                className={`rounded-2xl border p-4 text-left transition ${
                  isPaymentIn
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-400">
                    <ArrowDownLeft size={20} />
                  </div>

                  <div>
                    <p className="font-semibold text-white">Payment In</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Customer se paisa receive
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDirection("out")}
                className={`rounded-2xl border p-4 text-left transition ${
                  !isPaymentIn
                    ? "border-red-500/40 bg-red-500/10"
                    : "border-slate-800 bg-slate-950/40 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-red-500/10 p-2.5 text-red-400">
                    <ArrowUpRight size={20} />
                  </div>

                  <div>
                    <p className="font-semibold text-white">Payment Out</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Supplier ko paisa pay
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Factory */}
          <div className="mb-6">
            <label className={labelClass}>
              <span className="inline-flex items-center gap-2">
                <Building2 size={14} />
                Factory
              </span>
            </label>

            <select
              value={factory}
              onChange={(e) => setFactory(e.target.value)}
              className={inputClass}
            >
              <option value="">Select factory</option>
              {factories.map((item) => (
                <option key={item.id} value={item.name}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          {/* Party */}
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {isPaymentIn ? "Customer" : "Supplier"}
                </label>

                <p className="text-xs text-slate-500">
                  Payment kis party ke against hai?
                </p>
              </div>

              {selectedParty && (
                <button
                  type="button"
                  onClick={() => setSelectedParty(null)}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Change
                </button>
              )}
            </div>

            {selectedParty ? (
              <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-900 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 font-bold text-emerald-400">
                    {getInitial(selectedParty.name)}
                  </div>

                  <div>
                    <p className="font-semibold text-white">
                      {selectedParty.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedParty.phoneNumber}
                    </p>
                  </div>
                </div>

                <CheckCircle2
                  size={19}
                  className="text-emerald-400"
                />
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    value={partySearch}
                    onChange={(e) => setPartySearch(e.target.value)}
                    placeholder={`Search ${
                      isPaymentIn ? "customer" : "supplier"
                    }...`}
                    className={`${inputClass} pl-10`}
                  />
                </div>

                <div className="mt-3 max-h-44 space-y-2 overflow-y-auto">
                  {loadingParties ? (
                    <div className="flex items-center justify-center py-6 text-sm text-slate-500">
                      <Loader2
                        size={18}
                        className="mr-2 animate-spin"
                      />
                      Loading parties...
                    </div>
                  ) : filteredParties.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-800 px-4 py-6 text-center text-sm text-slate-500">
                      No party found.
                    </div>
                  ) : (
                    filteredParties.map((party) => (
                      <button
                        key={party.id}
                        type="button"
                        onClick={() => setSelectedParty(party)}
                        className="flex w-full items-center justify-between rounded-xl border border-transparent bg-slate-900 px-3 py-3 text-left transition hover:border-slate-700 hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-slate-300">
                            {getInitial(party.name)}
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-slate-200">
                              {party.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {party.phoneNumber}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs text-slate-500">
                          {formatCurrency(party.balance)}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate("khata")}
                  className="mt-3 text-xs font-medium text-emerald-400 transition hover:text-emerald-300"
                >
                  Manage parties in Khata →
                </button>
              </>
            )}
          </div>

          {/* Amount + Date */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
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

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={14} />
                  Payment Date
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

          {/* Method + Reference */}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <CreditCard size={14} />
                  Payment Method
                </span>
              </label>

              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputClass}
              >
                <option value="">Select method</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Online">Online</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                <span className="inline-flex items-center gap-2">
                  <FileText size={14} />
                  Reference
                </span>
              </label>

              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction / cheque no."
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional payment notes..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-950/30 px-6 py-4">
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
            className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              isPaymentIn
                ? "bg-emerald-600 hover:bg-emerald-500"
                : "bg-red-600 hover:bg-red-500"
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={17} />
                Save Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EDIT PAYMENT MODAL
========================================================= */

function EditPaymentModal({
  payment,
  onClose,
  onSaved,
}: {
  payment: PaymentRecord;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [date, setDate] = useState(
    payment.paymentDate?.split("T")[0] ??
      new Date().toISOString().split("T")[0]
  );
  const [method, setMethod] = useState(payment.paymentMethod ?? "");
  const [reference, setReference] = useState(payment.reference ?? "");
  const [notes, setNotes] = useState(payment.notes ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const isPaymentIn = payment.partyType === "customer";

  const handleSave = async () => {
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      setError("Valid payment amount enter karein.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");

      const payload: CreatePaymentInput = {
        phoneNumber: payment.phoneNumber,
        partyType: payment.partyType,
        factory: payment.factory,
        amount: numericAmount,
        paymentDate: date,
        paymentMethod: method || undefined,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      await paymentService.updatePayment(payment.id, payload);

      onSaved();
    } catch (err) {
      console.error(err);
      setError("Payment update nahi ho saki.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
              <Pencil size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Payment Management
              </p>
              <h2 className="mt-1 text-xl font-bold text-white">
                Edit Payment
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Party Info */}
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-xl font-bold ${
                  isPaymentIn
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {getInitial(payment.partyName)}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">
                    {payment.partyName}
                  </p>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      isPaymentIn
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {isPaymentIn ? "Payment In" : "Payment Out"}
                  </span>
                </div>

                <p className="mt-1 text-xs text-slate-500">
                  {payment.phoneNumber} • {payment.factory}
                </p>
              </div>
            </div>
          </div>

          {/* Amount + Date */}
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Amount</label>

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
                  className={`${inputClass} pl-12 text-lg font-semibold`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Payment Date</label>

              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Method + Reference */}
          <div className="mb-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Payment Method</label>

              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className={inputClass}
              >
                <option value="">Select method</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Online">Online</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Reference</label>

              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Transaction / cheque no."
                className={inputClass}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>Notes</label>

            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-slate-800 bg-slate-950/30 px-6 py-4">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="rounded-xl border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 size={17} className="animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 size={17} />
                Update Payment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PAYMENTS PAGE
========================================================= */

export default function Payments({
  user,
  activePage,
  onNavigate,
  onLogout,
}: PaymentsProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [factories, setFactories] = useState<
    { id: number; name: string }[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [factoryFilter, setFactoryFilter] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPayment, setEditingPayment] =
    useState<PaymentRecord | null>(null);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const [data, factoryList] = await Promise.all([
        paymentService.getPayments(),
        settingsService.getFactories(),
      ]);

      setPayments(data);
      setFactories(
        factoryList.filter((factory) => factory.isActive)
      );
    } catch (err) {
      console.error(err);
      setLoadError("Payments load nahi ho sakin.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  const totalIn = useMemo(
    () =>
      payments
        .filter((payment) => payment.partyType === "customer")
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments]
  );

  const totalOut = useMemo(
    () =>
      payments
        .filter((payment) => payment.partyType === "supplier")
        .reduce((sum, payment) => sum + payment.amount, 0),
    [payments]
  );

  const netAmount = totalIn - totalOut;

  const filteredPayments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return payments.filter((payment) => {
      const matchesType =
        filterType === "all" ||
        (filterType === "in" && payment.partyType === "customer") ||
        (filterType === "out" && payment.partyType === "supplier");

      const matchesFactory =
        factoryFilter === "all" ||
        payment.factory === factoryFilter;

      const matchesSearch =
        !query ||
        payment.partyName?.toLowerCase().includes(query) ||
        payment.phoneNumber?.toLowerCase().includes(query) ||
        payment.reference?.toLowerCase().includes(query) ||
        payment.notes?.toLowerCase().includes(query);

      return matchesType && matchesFactory && matchesSearch;
    });
  }, [payments, filterType, factoryFilter, searchQuery]);

  const handleDelete = async (payment: PaymentRecord) => {
    const confirmed = window.confirm(
      `Kya aap ${formatCurrency(payment.amount)} ki payment delete karna chahte hain?`
    );

    if (!confirmed) return;

    try {
      setActionError("");

      await paymentService.deletePayment(payment.id);

      setPayments((current) =>
        current.filter((item) => item.id !== payment.id)
      );
    } catch (err) {
      console.error(err);
      setActionError("Payment delete nahi ho saki.");
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
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <Wallet size={27} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                  Cash Management
                </p>

                <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
                  Payments
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Incoming aur outgoing payments ka complete record manage karein.
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

                <p className="text-xs capitalize text-slate-500">
                  {user.role}
                </p>
              </div>
            </div>
          </div>

          {/* =====================================================
              ERROR ALERTS
          ===================================================== */}
          {loadError && (
            <div className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} />
                <span>{loadError}</span>
              </div>

              <button
                onClick={loadPayments}
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
            {/* Payment In */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Payment In
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {formatCurrency(totalIn)}
                  </p>

                  <p className="mt-1 text-xs text-emerald-400">
                    Customer se received
                  </p>
                </div>

                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
                  <ArrowDownLeft size={21} />
                </div>
              </div>
            </div>

            {/* Payment Out */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Total Payment Out
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {formatCurrency(totalOut)}
                  </p>

                  <p className="mt-1 text-xs text-red-400">
                    Supplier ko paid
                  </p>
                </div>

                <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
                  <ArrowUpRight size={21} />
                </div>
              </div>
            </div>

            {/* Net */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Net Cash Flow
                  </p>

                  <p
                    className={`mt-2 text-2xl font-bold ${
                      netAmount >= 0
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatCurrency(netAmount)}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    In − Out
                  </p>
                </div>

                <div
                  className={`rounded-xl p-3 ${
                    netAmount >= 0
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-red-500/10 text-red-400"
                  }`}
                >
                  <Banknote size={21} />
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              FILTER TOOLBAR
          ===================================================== */}
          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Filter
                </span>

                {[
                  {
                    key: "all" as const,
                    label: "All Payments",
                  },
                  {
                    key: "in" as const,
                    label: "Payment In",
                  },
                  {
                    key: "out" as const,
                    label: "Payment Out",
                  },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setFilterType(item.key)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      filterType === item.key
                        ? item.key === "in"
                          ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                          : item.key === "out"
                          ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
                          : "bg-slate-800 text-white"
                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={factoryFilter}
                  onChange={(e) => setFactoryFilter(e.target.value)}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-200 outline-none transition focus:border-emerald-500"
                >
                  <option value="all">All Factories</option>

                  {factories.map((factory) => (
                    <option key={factory.id} value={factory.name}>
                      {factory.name}
                    </option>
                  ))}
                </select>

                <div className="relative min-w-[240px]">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search party, phone, reference..."
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={() => {
                    setActionError("");
                    setShowAddModal(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                >
                  <Plus size={18} />
                  Add Payment
                </button>
              </div>
            </div>
          </div>

          {/* =====================================================
              TABLE
          ===================================================== */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
            {/* Table Header */}
            <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-white">
                  Payment Ledger
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  Showing {filteredPayments.length} of {payments.length} records
                </p>
              </div>

              <button
                onClick={loadPayments}
                disabled={isLoading}
                className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={isLoading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/30">
                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Date
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Party
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Factory
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Type
                    </th>

                    <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Method
                    </th>

                    <th className="px-5 py-4 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Reference
                    </th>

                    <th className="px-5 py-4 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16">
                        <div className="flex flex-col items-center justify-center">
                          <Loader2
                            size={28}
                            className="animate-spin text-emerald-400"
                          />

                          <p className="mt-3 text-sm text-slate-400">
                            Loading payments...
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16">
                        <div className="flex flex-col items-center justify-center text-center">
                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                            <Wallet size={25} />
                          </div>

                          <h3 className="mt-4 font-semibold text-slate-200">
                            Koi payment nahi mili
                          </h3>

                          <p className="mt-1 max-w-sm text-sm text-slate-500">
                            Search ya filters change karein, ya new payment
                            add karein.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => {
                      const isIn = payment.partyType === "customer";

                      return (
                        <tr
                          key={payment.id}
                          className="group transition hover:bg-slate-800/30"
                        >
                          {/* Date */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2 text-sm text-slate-300">
                              <CalendarDays
                                size={15}
                                className="text-slate-600"
                              />
                              {formatDate(payment.paymentDate)}
                            </div>
                          </td>

                          {/* Party */}
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                                  isIn
                                    ? "bg-emerald-500/10 text-emerald-400"
                                    : "bg-red-500/10 text-red-400"
                                }`}
                              >
                                {getInitial(payment.partyName)}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-200">
                                  {payment.partyName}
                                </p>

                                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                                  <User size={12} />
                                  {payment.phoneNumber}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Factory */}
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2 text-sm text-slate-300">
                              <Building2
                                size={15}
                                className="text-slate-600"
                              />
                              {payment.factory}
                            </span>
                          </td>

                          {/* Type */}
                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                isIn
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-red-500/10 text-red-400"
                              }`}
                            >
                              {isIn ? (
                                <ArrowDownLeft size={13} />
                              ) : (
                                <ArrowUpRight size={13} />
                              )}

                              {isIn ? "Payment In" : "Payment Out"}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="px-5 py-4 text-right">
                            <p
                              className={`font-bold ${
                                isIn
                                  ? "text-emerald-400"
                                  : "text-red-400"
                              }`}
                            >
                              {isIn ? "+" : "−"}
                              {formatCurrency(payment.amount)}
                            </p>
                          </td>

                          {/* Method */}
                          <td className="px-5 py-4">
                            {payment.paymentMethod ? (
                              <span className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300">
                                <CreditCard size={13} />
                                {payment.paymentMethod}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600">
                                —
                              </span>
                            )}
                          </td>

                          {/* Reference */}
                          <td className="max-w-[180px] px-5 py-4">
                            <span className="block truncate text-sm text-slate-400">
                              {payment.reference || "—"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2 opacity-80 transition group-hover:opacity-100">
                              <button
                                onClick={() => {
                                  setActionError("");
                                  setEditingPayment(payment);
                                }}
                                title="Edit payment"
                                className="rounded-xl border border-slate-700 p-2.5 text-slate-400 transition hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-400"
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                onClick={() => handleDelete(payment)}
                                title="Delete payment"
                                className="rounded-xl border border-slate-700 p-2.5 text-slate-400 transition hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* =====================================================
          MODALS
      ===================================================== */}

      {showAddModal && (
        <AddPaymentModal
          factories={factories}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            loadPayments();
          }}
          onNavigate={onNavigate}
        />
      )}

      {editingPayment && (
        <EditPaymentModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSaved={() => {
            setEditingPayment(null);
            loadPayments();
          }}
        />
      )}
    </div>
  );
}