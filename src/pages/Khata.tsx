import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import partyService from "../services/partyService";
import settingsService from "../services/settingsService";
import type {
  PartyLedgerResponse,
  PartySummary,
  PartyType,
} from "../types/party";
import type { Page } from "../types/navigation";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

interface KhataProps {
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
  }).format(Math.abs(amount));
};

const formatDate = (dateString: string) => {
  if (dateString === "Opening") return "Opening";

  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

// =====================================================
// ADD PARTY MODAL
// =====================================================

function AddPartyModal({
  partyType,
  factory,
  onClose,
  onSaved,
}: {
  partyType: PartyType;
  factory: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const isSupplier = partyType === "supplier";

  const handleSave = async () => {
    setError("");

    if (!name.trim() || !phoneNumber.trim()) {
      setError("Name aur phone number required hain.");
      return;
    }

    try {
      setIsSaving(true);

      await partyService.saveParty({
        name: name.trim(),
        phoneNumber: phoneNumber.trim(),
        partyType,
        factory,
        address: address.trim() || undefined,
        openingBalance: Number(openingBalance) || 0,
      });

      onSaved();
    } catch (err) {
      setError(
        typeof err === "string" ? err : "Party save nahi ho saki."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                isSupplier
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-blue-500/10 text-blue-400"
              }`}
            >
              {isSupplier ? <Users size={21} /> : <BookOpen size={21} />}
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Party Management
              </p>
              <h2 className="mt-0.5 text-lg font-semibold text-white">
                Naya {isSupplier ? "Supplier" : "Customer"} Khata
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 p-2 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto px-6 py-5">
          {/* Factory */}
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-slate-400">
              <Building2 size={17} />
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Factory
              </p>
              <p className="mt-0.5 text-sm font-semibold text-white">
                {factory}
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400">
                Party Name
              </label>

              <div className="relative">
                <User
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Party ka naam"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400">
                Phone Number
              </label>

              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="03XXXXXXXXX"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>

            {/* Address */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400">
                Address
                <span className="ml-1 text-slate-600">(Optional)</span>
              </label>

              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Party ka address"
                className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>

            {/* Opening Balance */}
            <div>
              <label className="mb-2 block text-xs font-medium text-slate-400">
                Opening Balance
              </label>

              <div className="relative">
                <CircleDollarSign
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                />

                <input
                  type="number"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Agar pehle se koi balance chala aa raha hai to yahan enter
                karein.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-slate-800 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                Save Party
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// PARTY LEDGER MODAL
// =====================================================

function PartyLedgerModal({
  phoneNumber,
  partyType,
  factory,
  onClose,
  onChanged,
}: {
  phoneNumber: string;
  partyType: PartyType;
  factory: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [ledger, setLedger] = useState<PartyLedgerResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const isSupplier = partyType === "supplier";

  const loadLedger = async () => {
    try {
      setIsLoading(true);
      setError("");

      const data = await partyService.getPartyLedger(
        phoneNumber,
        partyType,
        factory
      );

      setLedger(data);
    } catch (err) {
      setError(
        typeof err === "string" ? err : "Ledger load nahi ho saka."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneNumber, partyType, factory]);

  const handleRecordPayment = async () => {
    setPaymentError("");

    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setPaymentError("Valid amount enter karein.");
      return;
    }

    try {
      setIsSavingPayment(true);

      await partyService.createPayment({
        phoneNumber,
        partyType,
        factory,
        amount: Number(paymentAmount),
        paymentDate,
        paymentMethod: paymentMethod || undefined,
        notes: paymentNotes.trim() || undefined,
      });

      setPaymentAmount("");
      setPaymentMethod("");
      setPaymentNotes("");
      setShowPaymentForm(false);

      await loadLedger();
      onChanged();
    } catch (err) {
      setPaymentError(
        typeof err === "string" ? err : "Payment save nahi ho saka."
      );
    } finally {
      setIsSavingPayment(false);
    }
  };

  const balanceLabel = isSupplier ? "Hum inko dete hain" : "Ye humein dete hain";

  const balancePositive =
    ledger && ledger.party.balance > 0.01;

  const balanceNegative =
    ledger && ledger.party.balance < -0.01;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-5">
          <div className="flex min-w-0 items-center gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                isSupplier
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-blue-500/10 text-blue-400"
              }`}
            >
              <BookOpen size={21} />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Party Ledger
              </p>

              <h2 className="truncate text-lg font-semibold text-white">
                {ledger?.party.name ?? "Loading..."}
              </h2>

              <p className="mt-0.5 truncate text-xs text-slate-500">
                {phoneNumber} · {factory}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-800 p-2 text-slate-400 transition hover:border-slate-700 hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-emerald-400">
                <Loader2 size={25} className="animate-spin" />
              </div>

              <p className="mt-4 text-sm font-medium text-slate-300">
                Ledger load ho raha hai...
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Please wait
              </p>
            </div>
          ) : ledger ? (
            <>
              {/* Summary Cards */}
              <div className="mb-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Total Business
                      </p>

                      <p className="mt-2 text-xl font-bold text-white">
                        {formatCurrency(ledger.party.totalBusiness)}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <CircleDollarSign size={19} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        Total Payments
                      </p>

                      <p className="mt-2 text-xl font-bold text-white">
                        {formatCurrency(ledger.party.totalPayments)}
                      </p>
                    </div>

                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Wallet size={19} />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                        {balanceLabel}
                      </p>

                      <p
                        className={`mt-2 text-xl font-bold ${
                          balancePositive
                            ? "text-red-400"
                            : balanceNegative
                            ? "text-emerald-400"
                            : "text-slate-300"
                        }`}
                      >
                        {formatCurrency(ledger.party.balance)}
                      </p>
                    </div>

                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                        balancePositive
                          ? "bg-red-500/10 text-red-400"
                          : balanceNegative
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {balancePositive ? (
                        <ArrowUpRight size={19} />
                      ) : (
                        <ArrowDownLeft size={19} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transaction Header */}
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white">
                    Transaction History
                  </h3>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Is party ke tamam hisaab aur payments
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentError("");
                    setShowPaymentForm((prev) => !prev);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition ${
                    showPaymentForm
                      ? "bg-slate-700 shadow-slate-950/20 hover:bg-slate-600"
                      : "bg-emerald-600 shadow-emerald-950/20 hover:bg-emerald-500"
                  }`}
                >
                  {showPaymentForm ? (
                    <>
                      <X size={16} />
                      Close
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Record Payment
                    </>
                  )}
                </button>
              </div>

              {/* Payment Form */}
              {showPaymentForm && (
                <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-slate-950/70 p-5">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <CreditCard size={17} />
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Record New Payment
                      </h4>
                      <p className="text-xs text-slate-500">
                        Payment ki details enter karein
                      </p>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
                      <AlertCircle
                        size={15}
                        className="mt-0.5 shrink-0"
                      />
                      {paymentError}
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Amount */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">
                        Amount
                      </label>

                      <div className="relative">
                        <CircleDollarSign
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                          type="number"
                          min="0"
                          value={paymentAmount}
                          onChange={(e) =>
                            setPaymentAmount(e.target.value)
                          }
                          placeholder="Enter amount"
                          className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                        />
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">
                        Payment Date
                      </label>

                      <div className="relative">
                        <CalendarDays
                          size={16}
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />

                        <input
                          type="date"
                          value={paymentDate}
                          onChange={(e) =>
                            setPaymentDate(e.target.value)
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-3 text-sm text-white outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                        />
                      </div>
                    </div>

                    {/* Method */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">
                        Payment Method
                        <span className="ml-1 text-slate-600">
                          (Optional)
                        </span>
                      </label>

                      <select
                        value={paymentMethod}
                        onChange={(e) =>
                          setPaymentMethod(e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-3 text-sm text-white outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                      >
                        <option value="">Select Method</option>
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">
                          Bank Transfer
                        </option>
                        <option value="Cheque">Cheque</option>
                      </select>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-400">
                        Notes
                        <span className="ml-1 text-slate-600">
                          (Optional)
                        </span>
                      </label>

                      <input
                        type="text"
                        value={paymentNotes}
                        onChange={(e) =>
                          setPaymentNotes(e.target.value)
                        }
                        placeholder="Payment notes"
                        className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecordPayment}
                    disabled={isSavingPayment}
                    className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingPayment ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving Payment...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        Save Payment
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Ledger Table */}
              <div className="overflow-hidden rounded-2xl border border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950">
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Date
                        </th>

                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Detail
                        </th>

                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Debit
                        </th>

                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Credit
                        </th>

                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Balance
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {ledger.entries.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-12 text-center"
                          >
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                              <FileText size={20} />
                            </div>

                            <p className="mt-3 text-sm font-medium text-slate-300">
                              No transactions found
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Is party ka abhi koi transaction nahi hai.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        ledger.entries.map((entry, index) => (
                          <tr
                            key={index}
                            className="border-b border-slate-800/70 transition last:border-0 hover:bg-slate-800/30"
                          >
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                              {formatDate(entry.date)}
                            </td>

                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-500">
                                  <FileText size={13} />
                                </div>

                                <span className="max-w-[260px] truncate text-xs font-medium text-slate-200">
                                  {entry.detail}
                                </span>
                              </div>
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-red-400">
                              {entry.debit > 0
                                ? formatCurrency(entry.debit)
                                : "—"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-medium text-emerald-400">
                              {entry.credit > 0
                                ? formatCurrency(entry.credit)
                                : "—"}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3 text-right text-xs font-bold text-white">
                              {formatCurrency(entry.balance)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN KHATA PAGE
// =====================================================

const Khata = ({
  user,
  activePage,
  onNavigate,
  onLogout,
}: KhataProps) => {
  const [factories, setFactories] = useState<
    { id: number; name: string }[]
  >([]);

  const [selectedFactory, setSelectedFactory] = useState<string>("");
  const [tab, setTab] = useState<PartyType>("supplier");
  const [parties, setParties] = useState<PartySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedParty, setSelectedParty] =
    useState<PartySummary | null>(null);

  const [deleteError, setDeleteError] = useState("");

  const isSupplier = tab === "supplier";

  // =====================================================
  // LOAD FACTORIES
  // =====================================================

  useEffect(() => {
    (async () => {
      try {
        const list = await settingsService.getFactories();
        const active = list.filter((f) => f.isActive);

        setFactories(active);

        if (active.length > 0) {
          setSelectedFactory(active[0].name);
        }
      } catch {
        // Ignore factory loading error here.
      }
    })();
  }, []);

  // =====================================================
  // LOAD PARTIES
  // =====================================================

  const loadParties = async () => {
    if (!selectedFactory) return;

    try {
      setIsLoading(true);
      setLoadError("");

      const data = await partyService.getParties(
        tab,
        selectedFactory
      );

      setParties(data);
    } catch (error) {
      setLoadError(
        typeof error === "string"
          ? error
          : "Parties load nahi ho sakin."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFactory) {
      loadParties();
      setSearchQuery("");
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedFactory]);

  // =====================================================
  // FILTER
  // =====================================================

  const filteredParties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) return parties;

    return parties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.phoneNumber.toLowerCase().includes(q)
    );
  }, [parties, searchQuery]);

  // =====================================================
  // STATS
  // =====================================================

  const totalBalance = useMemo(() => {
    return parties.reduce(
      (sum, party) => sum + party.balance,
      0
    );
  }, [parties]);

  const partiesWithBalance = useMemo(() => {
    return parties.filter(
      (party) => Math.abs(party.balance) > 0.01
    ).length;
  }, [parties]);

  const clearParties = useMemo(() => {
    return parties.filter(
      (party) => Math.abs(party.balance) <= 0.01
    ).length;
  }, [parties]);

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (party: PartySummary) => {
    setDeleteError("");

    const confirmed = window.confirm(
      `Kya aap "${party.name}" ka khata delete karna chahte hain?`
    );

    if (!confirmed) return;

    try {
      await partyService.deleteParty(
        party.phoneNumber,
        party.partyType,
        party.factory
      );

      setParties((prev) =>
        prev.filter(
          (p) =>
            !(
              p.phoneNumber === party.phoneNumber &&
              p.partyType === party.partyType &&
              p.factory === party.factory
            )
        )
      );
    } catch (error) {
      setDeleteError(
        typeof error === "string"
          ? error
          : "Delete nahi ho saka."
      );
    }
  };

  const balanceLabel = isSupplier ? "Dena hai" : "Lena hai";

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="min-w-0 flex-1 p-5 lg:p-8">
        {/* =====================================================
            HEADER
        ===================================================== */}

        <div className="mb-8 flex flex-col justify-between gap-5 xl:flex-row xl:items-center">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${
                isSupplier
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-blue-500/20 bg-blue-500/10 text-blue-400"
              }`}
            >
              <BookOpen size={25} />
            </div>

            <div>
              <p
                className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                  isSupplier
                    ? "text-emerald-400"
                    : "text-blue-400"
                }`}
              >
                Accounts Management
              </p>

              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
                Khata
              </h1>

              <p className="mt-1 text-sm text-slate-400">
                Har factory aur party ka complete hisaab manage karein.
              </p>
            </div>
          </div>

          {/* Current User */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold uppercase text-emerald-400">
              {user.username.charAt(0)}
            </div>

            <div>
              <p className="text-[11px] uppercase tracking-wider text-slate-500">
                Current User
              </p>

              <p className="mt-0.5 text-sm font-semibold text-white">
                {user.username}
              </p>

              <p className="text-[11px] capitalize text-slate-500">
                {user.role}
              </p>
            </div>
          </div>
        </div>

        {factories.length === 0 ? (
          /* =====================================================
             NO FACTORIES
          ===================================================== */

          <div className="flex min-h-[500px] items-center justify-center rounded-3xl border border-slate-800 bg-slate-900">
            <div className="max-w-md px-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-slate-500">
                <Building2 size={28} />
              </div>

              <h2 className="mt-5 text-lg font-semibold text-white">
                No Factory Available
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Abhi tak koi active factory nahi hai. Pehle Settings
                mein factory add karein, phir party khata manage
                karein.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* =====================================================
                FACTORY SELECTOR
            ===================================================== */}

            <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={15} className="text-slate-500" />

                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Select Factory
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {factories.map((factory) => (
                  <button
                    key={factory.id}
                    type="button"
                    onClick={() => {
                      setSelectedFactory(factory.name);
                      setDeleteError("");
                    }}
                    className={`rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                      selectedFactory === factory.name
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-sm"
                        : "border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600 hover:bg-slate-800 hover:text-slate-200"
                    }`}
                  >
                    {factory.name}
                  </button>
                ))}
              </div>
            </div>

            {/* =====================================================
                STATS
            ===================================================== */}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Total Parties
                    </p>

                    <p className="mt-2 text-2xl font-bold text-white">
                      {parties.length}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                    <Users size={19} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Active Khatas
                    </p>

                    <p className="mt-2 text-2xl font-bold text-white">
                      {partiesWithBalance}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                    <Wallet size={19} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Clear Khatas
                    </p>

                    <p className="mt-2 text-2xl font-bold text-white">
                      {clearParties}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 size={19} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                      Net Balance
                    </p>

                    <p
                      className={`mt-2 truncate text-xl font-bold ${
                        totalBalance > 0.01
                          ? "text-red-400"
                          : totalBalance < -0.01
                          ? "text-emerald-400"
                          : "text-slate-300"
                      }`}
                    >
                      {formatCurrency(totalBalance)}
                    </p>
                  </div>

                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                    <CircleDollarSign size={19} />
                  </div>
                </div>
              </div>
            </div>

            {/* =====================================================
                TABS + SEARCH + ADD
            ===================================================== */}

            <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                {/* Tabs */}
                <div className="flex rounded-xl border border-slate-800 bg-slate-950/70 p-1">
                  <button
                    type="button"
                    onClick={() => setTab("supplier")}
                    className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                      tab === "supplier"
                        ? "bg-emerald-500/10 text-emerald-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Users size={16} />
                    Suppliers

                    {tab === "supplier" && (
                      <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px]">
                        {parties.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab("customer")}
                    className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                      tab === "customer"
                        ? "bg-blue-500/10 text-blue-400 shadow-sm"
                        : "text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <BookOpen size={16} />
                    Customers

                    {tab === "customer" && (
                      <span className="rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px]">
                        {parties.length}
                      </span>
                    )}
                  </button>
                </div>

                {/* Search + Actions */}
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative min-w-0 sm:w-72">
                    <Search
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />

                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) =>
                        setSearchQuery(e.target.value)
                      }
                      placeholder="Naam ya phone search..."
                      className="w-full rounded-xl border border-slate-700 bg-slate-800/70 py-2.5 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={loadParties}
                    disabled={isLoading}
                    title="Refresh"
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/70 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw
                      size={16}
                      className={isLoading ? "animate-spin" : ""}
                    />
                    <span className="sm:hidden">Refresh</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDeleteError("");
                      setShowAddModal(true);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition ${
                      isSupplier
                        ? "bg-emerald-600 shadow-emerald-950/20 hover:bg-emerald-500"
                        : "bg-blue-600 shadow-blue-950/20 hover:bg-blue-500"
                    }`}
                  >
                    <Plus size={16} />
                    Add {isSupplier ? "Supplier" : "Customer"}
                  </button>
                </div>
              </div>
            </div>

            {/* =====================================================
                ALERTS
            ===================================================== */}

            {loadError && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />

                <div>
                  <p className="font-medium">Something went wrong</p>
                  <p className="mt-0.5 text-xs text-red-400/80">
                    {loadError}
                  </p>
                </div>
              </div>
            )}

            {deleteError && (
              <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                <AlertCircle size={17} className="mt-0.5 shrink-0" />

                <div>
                  <p className="font-medium">Delete failed</p>
                  <p className="mt-0.5 text-xs text-red-400/80">
                    {deleteError}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setDeleteError("")}
                  className="ml-auto rounded-lg p-1 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* =====================================================
                CONTENT
            ===================================================== */}

            {isLoading ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-emerald-400">
                  <Loader2 size={25} className="animate-spin" />
                </div>

                <p className="mt-4 text-sm font-medium text-slate-300">
                  {isSupplier
                    ? "Suppliers"
                    : "Customers"}{" "}
                  load ho rahe hain...
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Please wait
                </p>
              </div>
            ) : filteredParties.length === 0 ? (
              <div className="flex min-h-[420px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900 px-6 text-center">
                <div
                  className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
                    isSupplier
                      ? "bg-emerald-500/10 text-emerald-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}
                >
                  {searchQuery ? (
                    <Search size={27} />
                  ) : isSupplier ? (
                    <Users size={27} />
                  ) : (
                    <BookOpen size={27} />
                  )}
                </div>

                <h2 className="mt-5 text-lg font-semibold text-white">
                  {searchQuery
                    ? "No Party Found"
                    : `No ${
                        isSupplier ? "Suppliers" : "Customers"
                      } Yet`}
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                  {searchQuery
                    ? "Search ko change karke dobara try karein."
                    : "Abhi tak koi party nahi hai. Purchase/Sale karein ya manually new party add karein."}
                </p>

                {!searchQuery && (
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className={`mt-5 flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition ${
                      isSupplier
                        ? "bg-emerald-600 hover:bg-emerald-500"
                        : "bg-blue-600 hover:bg-blue-500"
                    }`}
                  >
                    <Plus size={16} />
                    Add {isSupplier ? "Supplier" : "Customer"}
                  </button>
                )}
              </div>
            ) : (
              <div>
                {/* Results Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      {isSupplier ? "Supplier" : "Customer"} Khatas
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Showing {filteredParties.length} of{" "}
                      {parties.length} parties
                    </p>
                  </div>

                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-300"
                    >
                      <X size={13} />
                      Clear search
                    </button>
                  )}
                </div>

                {/* Party Cards */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredParties.map((party) => {
                    const hasPositiveBalance =
                      party.balance > 0.01;

                    const hasNegativeBalance =
                      party.balance < -0.01;

                    return (
                      <div
                        key={`${party.phoneNumber}-${party.partyType}-${party.factory}`}
                        className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-slate-700 hover:shadow-xl hover:shadow-black/10"
                      >
                        {/* Party Top */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold uppercase ${
                                isSupplier
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-blue-500/10 text-blue-400"
                              }`}
                            >
                              {party.name.charAt(0)}
                            </div>

                            <div className="min-w-0">
                              <h3 className="truncate text-sm font-semibold text-white">
                                {party.name}
                              </h3>

                              <p className="mt-1 truncate text-xs text-slate-500">
                                {party.phoneNumber}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDelete(party)}
                            title="Delete khata"
                            className="shrink-0 rounded-xl border border-slate-800 p-2 text-slate-500 opacity-0 transition group-hover:opacity-100 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        {/* Factory */}
                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-950/60 px-3 py-2">
                          <Building2
                            size={13}
                            className="text-slate-600"
                          />

                          <span className="truncate text-xs text-slate-500">
                            {party.factory}
                          </span>
                        </div>

                        {/* Balance */}
                        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                                {balanceLabel}
                              </p>

                              <p
                                className={`mt-1 text-lg font-bold ${
                                  hasPositiveBalance
                                    ? "text-red-400"
                                    : hasNegativeBalance
                                    ? "text-emerald-400"
                                    : "text-slate-300"
                                }`}
                              >
                                {formatCurrency(party.balance)}
                              </p>
                            </div>

                            <div
                              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                                hasPositiveBalance
                                  ? "bg-red-500/10 text-red-400"
                                  : hasNegativeBalance
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-slate-800 text-slate-500"
                              }`}
                            >
                              {hasPositiveBalance ? (
                                <ArrowUpRight size={17} />
                              ) : hasNegativeBalance ? (
                                <ArrowDownLeft size={17} />
                              ) : (
                                <CheckCircle2 size={17} />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* View Button */}
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedParty(party)
                          }
                          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-xs font-semibold transition ${
                            isSupplier
                              ? "border-slate-700 text-slate-300 hover:border-emerald-500/40 hover:bg-emerald-500/5 hover:text-emerald-400"
                              : "border-slate-700 text-slate-300 hover:border-blue-500/40 hover:bg-blue-500/5 hover:text-blue-400"
                          }`}
                        >
                          <BookOpen size={14} />
                          View Khata
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* =====================================================
          ADD PARTY MODAL
      ===================================================== */}

      {showAddModal && selectedFactory && (
        <AddPartyModal
          partyType={tab}
          factory={selectedFactory}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            loadParties();
          }}
        />
      )}

      {/* =====================================================
          PARTY LEDGER MODAL
      ===================================================== */}

      {selectedParty && (
        <PartyLedgerModal
          phoneNumber={selectedParty.phoneNumber}
          partyType={selectedParty.partyType}
          factory={selectedParty.factory}
          onClose={() => setSelectedParty(null)}
          onChanged={loadParties}
        />
      )}
    </div>
  );
};

export default Khata;