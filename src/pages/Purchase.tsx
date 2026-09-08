import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileText,
  Loader2,
  Package,
  Phone,
  Save,
  ShoppingCart,
  User,
  Wallet,
  X,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import purchaseService from "../services/purchaseService";
import settingsService from "../services/settingsService";

import type {
  CreatePurchaseInput,
  PaymentStatus,
} from "../types/purchase";

import type {
  MaalCategory,
  Factory,
  PaymentMethodRecord,
} from "../types/settings";

import type { Page } from "../types/navigation";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

interface PurchaseProps {
  user: LoggedInUser;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const getTodayDate = () => {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (amount: number) => {
  return amount.toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  });
};

const Purchase = ({
  user,
  activePage,
  onNavigate,
  onLogout,
}: PurchaseProps) => {
  // ==========================================
  // FORM STATE
  // ==========================================

  const [date, setDate] = useState(getTodayDate());

  const [supplierName, setSupplierName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [factory, setFactory] = useState("");
  const [category, setCategory] = useState("");

  const [quantity, setQuantity] = useState("");
  const [rate, setRate] = useState("");
  const [bundleCount, setBundleCount] = useState("");
  const [tarSize, setTarSize] = useState("");

  const [paymentStatus, setPaymentStatus] =
    useState<PaymentStatus>("Unpaid");

  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [notes, setNotes] = useState("");

  // ==========================================
  // UI STATE
  // ==========================================

  const [isLoading, setIsLoading] = useState(false);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ==========================================
  // SETTINGS OPTIONS
  // ==========================================

  const [factories, setFactories] = useState<Factory[]>([]);
  const [categories, setCategories] = useState<MaalCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<
    PaymentMethodRecord[]
  >([]);

  // ==========================================
  // VALIDATION
  // ==========================================

  const [errors, setErrors] = useState({
    supplierName: "",
    phoneNumber: "",
    factory: "",
    category: "",
    quantity: "",
    rate: "",
    paidAmount: "",
  });

  // ==========================================
  // LOAD SETTINGS OPTIONS
  // ==========================================

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setIsOptionsLoading(true);

        const [
          factoryList,
          categoryList,
          paymentMethodList,
        ] = await Promise.all([
          settingsService.getFactories(),
          settingsService.getMaalCategories(),
          settingsService.getPaymentMethods(),
        ]);

        setFactories(
          factoryList.filter((factory) => factory.isActive)
        );

        setCategories(
          categoryList.filter((category) => category.isActive)
        );

        setPaymentMethods(
          paymentMethodList.filter(
            (method) => method.isActive
          )
        );
      } catch {
        // Options load fail hon to form usable rahega.
      } finally {
        setIsOptionsLoading(false);
      }
    };

    loadOptions();
  }, []);

  // ==========================================
  // CALCULATIONS
  // ==========================================

  const totalAmount = useMemo(() => {
    const quantityNumber = Number(quantity) || 0;
    const rateNumber = Number(rate) || 0;

    return quantityNumber * rateNumber;
  }, [quantity, rate]);

  const remainingAmount = useMemo(() => {
    if (paymentStatus === "Paid") {
      return 0;
    }

    if (paymentStatus === "Unpaid") {
      return totalAmount;
    }

    const paid = Number(paidAmount) || 0;

    return Math.max(totalAmount - paid, 0);
  }, [totalAmount, paidAmount, paymentStatus]);

  const paymentPercentage = useMemo(() => {
    if (totalAmount <= 0) {
      return 0;
    }

    const paid =
      paymentStatus === "Paid"
        ? totalAmount
        : paymentStatus === "Unpaid"
          ? 0
          : Number(paidAmount) || 0;

    return Math.min(
      Math.max((paid / totalAmount) * 100, 0),
      100
    );
  }, [totalAmount, paidAmount, paymentStatus]);

  // ==========================================
  // PAYMENT STATUS
  // ==========================================

  const handlePaymentStatusChange = (
    status: PaymentStatus
  ) => {
    setPaymentStatus(status);

    setErrors((previous) => ({
      ...previous,
      paidAmount: "",
    }));

    if (status === "Paid") {
      setPaidAmount(
        totalAmount > 0 ? totalAmount.toString() : ""
      );
    }

    if (status === "Unpaid") {
      setPaidAmount("0");
    }

    if (status === "Partial") {
      setPaidAmount("");
    }
  };

  // ==========================================
  // RESET FORM
  // ==========================================

  const resetForm = () => {
    setDate(getTodayDate());

    setSupplierName("");
    setPhoneNumber("");
    setFactory("");
    setCategory("");

    setQuantity("");
    setRate("");
    setBundleCount("");
    setTarSize("");

    setPaymentStatus("Unpaid");

    setPaidAmount("");
    setPaymentMethod("");
    setNotes("");

    setErrors({
      supplierName: "",
      phoneNumber: "",
      factory: "",
      category: "",
      quantity: "",
      rate: "",
      paidAmount: "",
    });
  };

  // ==========================================
  // CLEAR SUCCESS MESSAGE
  // ==========================================

  const clearSuccessMessage = () => {
    setSuccessMessage("");
  };

  // ==========================================
  // VALIDATION
  // ==========================================

  const validateForm = () => {
    const newErrors = {
      supplierName: "",
      phoneNumber: "",
      factory: "",
      category: "",
      quantity: "",
      rate: "",
      paidAmount: "",
    };

    if (!supplierName.trim()) {
      newErrors.supplierName =
        "Supplier name required hai.";
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber =
        "Phone number required hai.";
    }

    if (!factory) {
      newErrors.factory =
        "Factory select karein.";
    }

    if (!category) {
      newErrors.category =
        "Maal category select karein.";
    }

    if (!quantity || Number(quantity) <= 0) {
      newErrors.quantity =
        "Valid quantity enter karein.";
    }

    if (!rate || Number(rate) <= 0) {
      newErrors.rate =
        "Valid rate enter karein.";
    }

    if (
      paymentStatus === "Partial" &&
      (!paidAmount ||
        Number(paidAmount) <= 0 ||
        Number(paidAmount) >= totalAmount)
    ) {
      newErrors.paidAmount =
        "Partial payment total amount se kam honi chahiye.";
    }

    if (
      paymentStatus === "Paid" &&
      totalAmount <= 0
    ) {
      newErrors.paidAmount =
        "Paid payment ke liye valid total amount required hai.";
    }

    setErrors(newErrors);

    return !Object.values(newErrors).some(
      (error) => error
    );
  };

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setSuccessMessage("");
    setErrorMessage("");

    if (!validateForm()) {
      return;
    }

    const payload: CreatePurchaseInput = {
      purchaseDate: date,
      supplierName: supplierName.trim(),
      phoneNumber: phoneNumber.trim(),
      factory,
      category,
      quantity: Number(quantity),
      ratePerKg: Number(rate),
      bundleCount: bundleCount
        ? Number(bundleCount)
        : undefined,
      tarSize: tarSize.trim() || undefined,
      paymentStatus,
      paidAmount:
        paymentStatus === "Paid"
          ? totalAmount
          : Number(paidAmount) || 0,
      notes: notes.trim() || undefined,
    };

    try {
      setIsLoading(true);

      const saved =
        await purchaseService.createPurchase(payload);

      setSuccessMessage(
        `Purchase ${saved.billNumber} successfully save ho gayi!`
      );

      resetForm();
    } catch (error) {
      setErrorMessage(
        typeof error === "string"
          ? error
          : "Purchase save karte waqt masla ho gaya. Dobara try karein."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // FIELD ERROR HELPER
  // ==========================================

  const clearFieldError = (
    field: keyof typeof errors
  ) => {
    if (!errors[field]) {
      return;
    }

    setErrors((previous) => ({
      ...previous,
      [field]: "",
    }));
  };

  // ==========================================
  // INPUT CLASS
  // ==========================================

  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

  const getInputClass = (
    hasError: boolean
  ) =>
    `w-full rounded-xl border bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:ring-2 ${
      hasError
        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
        : "border-slate-700 focus:border-emerald-500 focus:ring-emerald-500/20"
    }`;

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="min-w-0 flex-1 p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          {/* ==========================================
              PAGE HEADER
          ========================================== */}

          <header className="mb-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" />

                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
                    Purchase Management
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                    <ShoppingCart size={23} />
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      New Purchase
                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                      Naya maal purchase entry add karein.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold uppercase text-emerald-400 sm:flex">
                  {user.username.charAt(0)}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Current User
                  </p>

                  <p className="mt-1 text-sm font-semibold capitalize text-emerald-400">
                    {user.username}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* ==========================================
              ALERTS
          ========================================== */}

          {successMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <CheckCircle2
                  size={18}
                  className="text-emerald-400"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-emerald-300">
                  Purchase Saved
                </p>

                <p className="mt-1 text-sm text-emerald-400">
                  {successMessage}
                </p>
              </div>

              <button
                type="button"
                onClick={clearSuccessMessage}
                className="rounded-lg p-1.5 text-emerald-500/60 transition hover:bg-emerald-500/10 hover:text-emerald-400"
              >
                <X size={17} />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <AlertCircle
                  size={18}
                  className="text-red-400"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-red-300">
                  Purchase Error
                </p>

                <p className="mt-1 text-sm text-red-400">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid gap-6 xl:grid-cols-3">
              {/* ==========================================
                  LEFT CONTENT
              ========================================== */}

              <div className="space-y-6 xl:col-span-2">
                {/* ==========================================
                    PURCHASE INFORMATION
                ========================================== */}

                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <FileText size={20} />
                    </div>

                    <div>
                      <h2 className="font-semibold text-white">
                        Purchase Information
                      </h2>

                      <p className="text-sm text-slate-500">
                        Bill aur factory details
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {/* Bill Number */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Bill Number
                      </label>

                      <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-700 bg-slate-800/70 px-4 py-3">
                        <FileText
                          size={17}
                          className="text-slate-500"
                        />

                        <div>
                          <p className="text-sm font-medium text-slate-300">
                            Auto-generated
                          </p>

                          <p className="text-[11px] text-slate-500">
                            Save karne par bill number milega
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Date */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Purchase Date
                      </label>

                      <div className="relative">
                        <input
                          type="date"
                          value={date}
                          onChange={(event) =>
                            setDate(event.target.value)
                          }
                          className={`${inputClass} pr-11`}
                        />

                        <CalendarDays
                          size={18}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                      </div>
                    </div>

                    {/* Factory */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Factory
                        <span className="ml-1 text-red-400">
                          *
                        </span>
                      </label>

                      <select
                        value={factory}
                        disabled={isOptionsLoading}
                        onChange={(event) => {
                          setFactory(event.target.value);
                          clearFieldError("factory");
                        }}
                        className={getInputClass(
                          Boolean(errors.factory)
                        )}
                      >
                        <option value="">
                          {isOptionsLoading
                            ? "Loading factories..."
                            : "Select factory"}
                        </option>

                        {factories.map((item) => (
                          <option
                            key={item.id}
                            value={item.name}
                          >
                            {item.name}
                          </option>
                        ))}
                      </select>

                      {errors.factory && (
                        <p className="mt-2 text-xs text-red-400">
                          {errors.factory}
                        </p>
                      )}

                      {!isOptionsLoading &&
                        factories.length === 0 && (
                          <p className="mt-2 text-xs text-amber-400">
                            Koi active factory nahi hai.
                            Settings mein add karein.
                          </p>
                        )}
                    </div>

                    {/* Category */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Maal Category
                        <span className="ml-1 text-red-400">
                          *
                        </span>
                      </label>

                      <select
                        value={category}
                        disabled={isOptionsLoading}
                        onChange={(event) => {
                          setCategory(event.target.value);
                          clearFieldError("category");
                        }}
                        className={getInputClass(
                          Boolean(errors.category)
                        )}
                      >
                        <option value="">
                          {isOptionsLoading
                            ? "Loading categories..."
                            : "Select category"}
                        </option>

                        {categories.map((item) => (
                          <option
                            key={item.id}
                            value={item.name}
                          >
                            {item.name}
                          </option>
                        ))}
                      </select>

                      {errors.category && (
                        <p className="mt-2 text-xs text-red-400">
                          {errors.category}
                        </p>
                      )}

                      {!isOptionsLoading &&
                        categories.length === 0 && (
                          <p className="mt-2 text-xs text-amber-400">
                            Koi active maal category nahi
                            hai. Settings mein add karein.
                          </p>
                        )}
                    </div>
                  </div>
                </section>

                {/* ==========================================
                    SUPPLIER INFORMATION
                ========================================== */}

                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                      <User size={20} />
                    </div>

                    <div>
                      <h2 className="font-semibold text-white">
                        Supplier Information
                      </h2>

                      <p className="text-sm text-slate-500">
                        Jis party se maal purchase hua
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {/* Supplier */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Supplier / Party Name
                        <span className="ml-1 text-red-400">
                          *
                        </span>
                      </label>

                      <input
                        type="text"
                        value={supplierName}
                        onChange={(event) => {
                          setSupplierName(
                            event.target.value
                          );
                          clearFieldError("supplierName");
                        }}
                        placeholder="Enter supplier name"
                        className={getInputClass(
                          Boolean(errors.supplierName)
                        )}
                      />

                      {errors.supplierName && (
                        <p className="mt-2 text-xs text-red-400">
                          {errors.supplierName}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Phone Number
                        <span className="ml-1 text-red-400">
                          *
                        </span>
                      </label>

                      <div className="relative">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(event) => {
                            setPhoneNumber(
                              event.target.value
                            );
                            clearFieldError(
                              "phoneNumber"
                            );
                          }}
                          placeholder="03XXXXXXXXX"
                          className={`${getInputClass(
                            Boolean(errors.phoneNumber)
                          )} pr-11`}
                        />

                        <Phone
                          size={18}
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                        />
                      </div>

                      {errors.phoneNumber && (
                        <p className="mt-2 text-xs text-red-400">
                          {errors.phoneNumber}
                        </p>
                      )}
                    </div>
                  </div>
                </section>

                {/* ==========================================
                    MAAL DETAILS
                ========================================== */}

                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
                      <Package size={20} />
                    </div>

                    <div>
                      <h2 className="font-semibold text-white">
                        Maal Details
                      </h2>

                      <p className="text-sm text-slate-500">
                        Quantity, bundle aur rate ki information
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2">
                    {/* Bundle */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Total Tar Bundle Number
                        <span className="ml-1 text-xs font-normal text-slate-500">
                          Optional
                        </span>
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={bundleCount}
                        onChange={(event) =>
                          setBundleCount(
                            event.target.value
                          )
                        }
                        placeholder="e.g. 25"
                        className={inputClass}
                      />
                    </div>

                    {/* Tar Size */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Tar Size Number
                        <span className="ml-1 text-xs font-normal text-slate-500">
                          Optional
                        </span>
                      </label>

                      <input
                        type="text"
                        value={tarSize}
                        onChange={(event) =>
                          setTarSize(event.target.value)
                        }
                        placeholder="e.g. 8mm"
                        className={inputClass}
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Quantity / Weight
                        <span className="ml-1 text-red-400">
                          *
                        </span>
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={quantity}
                          onChange={(event) => {
                            setQuantity(
                              event.target.value
                            );
                            clearFieldError("quantity");
                          }}
                          placeholder="Enter quantity"
                          className={`${getInputClass(
                            Boolean(errors.quantity)
                          )} pr-16`}
                        />

                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                          KG
                        </span>
                      </div>

                      {errors.quantity && (
                        <p className="mt-2 text-xs text-red-400">
                          {errors.quantity}
                        </p>
                      )}
                    </div>

                    {/* Rate */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Rate per KG
                        <span className="ml-1 text-red-400">
                          *
                        </span>
                      </label>

                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rate}
                          onChange={(event) => {
                            setRate(event.target.value);
                            clearFieldError("rate");
                          }}
                          placeholder="Enter rate"
                          className={`${getInputClass(
                            Boolean(errors.rate)
                          )} pr-14`}
                        />

                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500">
                          PKR
                        </span>
                      </div>

                      {errors.rate && (
                        <p className="mt-2 text-xs text-red-400">
                          {errors.rate}
                        </p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="md:col-span-2">
                      <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500/80">
                              Purchase Total
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              Quantity × Rate per KG
                            </p>
                          </div>

                          <p className="text-2xl font-bold text-emerald-400">
                            {formatCurrency(totalAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ==========================================
                    PAYMENT DETAILS
                ========================================== */}

                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 text-orange-400">
                      <Wallet size={20} />
                    </div>

                    <div>
                      <h2 className="font-semibold text-white">
                        Payment Details
                      </h2>

                      <p className="text-sm text-slate-500">
                        Payment status aur remaining balance
                      </p>
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-slate-300">
                      Payment Status
                    </label>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {(
                        [
                          {
                            value: "Paid" as PaymentStatus,
                            label: "Paid",
                            description:
                              "Full payment",
                          },
                          {
                            value:
                              "Partial" as PaymentStatus,
                            label: "Partial",
                            description:
                              "Some payment",
                          },
                          {
                            value:
                              "Unpaid" as PaymentStatus,
                            label: "Unpaid",
                            description:
                              "No payment",
                          },
                        ] as const
                      ).map((option) => {
                        const selected =
                          paymentStatus === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() =>
                              handlePaymentStatusChange(
                                option.value
                              )
                            }
                            className={`group rounded-xl border p-4 text-left transition ${
                              selected
                                ? option.value === "Paid"
                                  ? "border-emerald-500/40 bg-emerald-500/10"
                                  : option.value ===
                                      "Partial"
                                    ? "border-orange-500/40 bg-orange-500/10"
                                    : "border-red-500/40 bg-red-500/10"
                                : "border-slate-700 bg-slate-800/70 hover:border-slate-600 hover:bg-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className={`text-sm font-semibold ${
                                  selected
                                    ? option.value ===
                                      "Paid"
                                      ? "text-emerald-400"
                                      : option.value ===
                                          "Partial"
                                        ? "text-orange-400"
                                        : "text-red-400"
                                    : "text-slate-300"
                                }`}
                              >
                                {option.label}
                              </span>

                              <span
                                className={`h-4 w-4 rounded-full border-2 ${
                                  selected
                                    ? option.value ===
                                      "Paid"
                                      ? "border-emerald-400 bg-emerald-400"
                                      : option.value ===
                                          "Partial"
                                        ? "border-orange-400 bg-orange-400"
                                        : "border-red-400 bg-red-400"
                                    : "border-slate-600"
                                }`}
                              />
                            </div>

                            <p className="mt-1 text-xs text-slate-500">
                              {option.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-6 grid gap-5 md:grid-cols-2">
                    {/* Paid Amount */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Paid Amount
                      </label>

                      <input
                        type="number"
                        min="0"
                        max={totalAmount}
                        value={
                          paymentStatus === "Paid"
                            ? totalAmount || ""
                            : paymentStatus ===
                                "Unpaid"
                              ? "0"
                              : paidAmount
                        }
                        disabled={
                          paymentStatus === "Paid" ||
                          paymentStatus === "Unpaid"
                        }
                        onChange={(event) => {
                          setPaidAmount(
                            event.target.value
                          );
                          clearFieldError(
                            "paidAmount"
                          );
                        }}
                        placeholder="Enter paid amount"
                        className={`${getInputClass(
                          Boolean(errors.paidAmount)
                        )} disabled:cursor-not-allowed disabled:opacity-50`}
                      />

                      {errors.paidAmount && (
                        <p className="mt-2 text-xs text-red-400">
                          {errors.paidAmount}
                        </p>
                      )}
                    </div>

                    {/* Remaining */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Remaining Amount
                      </label>

                      <div className="flex min-h-[46px] items-center rounded-xl border border-slate-700 bg-slate-800 px-4">
                        <span
                          className={`text-sm font-semibold ${
                            remainingAmount > 0
                              ? "text-orange-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {formatCurrency(
                            remainingAmount
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-300">
                        Payment Method
                      </label>

                      <select
                        value={paymentMethod}
                        disabled={isOptionsLoading}
                        onChange={(event) =>
                          setPaymentMethod(
                            event.target.value
                          )
                        }
                        className={inputClass}
                      >
                        <option value="">
                          {isOptionsLoading
                            ? "Loading payment methods..."
                            : "Select payment method"}
                        </option>

                        {paymentMethods.length > 0 ? (
                          paymentMethods.map((method) => (
                            <option
                              key={method.id}
                              value={method.name}
                            >
                              {method.name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="Cash">
                              Cash
                            </option>
                            <option value="Bank Transfer">
                              Bank Transfer
                            </option>
                            <option value="Cheque">
                              Cheque
                            </option>
                            <option value="Other">
                              Other
                            </option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Payment Progress */}
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-sm font-medium text-slate-300">
                          Payment Progress
                        </label>

                        <span className="text-xs font-semibold text-slate-400">
                          {Math.round(paymentPercentage)}%
                        </span>
                      </div>

                      <div className="h-[46px] rounded-xl border border-slate-700 bg-slate-800 p-3">
                        <div className="h-full overflow-hidden rounded-full bg-slate-700">
                          <div
                            className={`h-full rounded-full transition-all ${
                              paymentStatus ===
                              "Paid"
                                ? "bg-emerald-500"
                                : paymentStatus ===
                                    "Partial"
                                  ? "bg-orange-500"
                                  : "bg-red-500"
                            }`}
                            style={{
                              width: `${paymentPercentage}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* ==========================================
                    NOTES
                ========================================== */}

                <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:p-6">
                  <div className="mb-4">
                    <h2 className="font-semibold text-white">
                      Additional Notes
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Extra information agar koi ho
                    </p>
                  </div>

                  <textarea
                    value={notes}
                    onChange={(event) =>
                      setNotes(event.target.value)
                    }
                    rows={4}
                    placeholder="Additional details ya notes..."
                    className={`${inputClass} resize-none`}
                  />
                </section>
              </div>

              {/* ==========================================
                  RIGHT SUMMARY
              ========================================== */}

              <aside>
                <div className="sticky top-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
                  {/* Summary Header */}
                  <div className="border-b border-slate-800 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                          Review
                        </p>

                        <h2 className="mt-1 text-lg font-semibold text-white">
                          Purchase Summary
                        </h2>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                        <FileText size={19} />
                      </div>
                    </div>

                    <p className="mt-2 text-sm text-slate-500">
                      Save karne se pehle entry verify karein.
                    </p>
                  </div>

                  <div className="p-6">
                    {/* Supplier */}
                    <div className="mb-5 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                        Supplier
                      </p>

                      <p className="mt-1 truncate text-sm font-semibold text-white">
                        {supplierName || "Supplier name"}
                      </p>

                      {phoneNumber && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                          <Phone size={13} />
                          {phoneNumber}
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">
                          Date
                        </span>

                        <span className="text-right text-sm font-medium text-slate-300">
                          {date || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">
                          Factory
                        </span>

                        <span className="max-w-[170px] truncate text-right text-sm font-medium text-slate-300">
                          {factory || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">
                          Category
                        </span>

                        <span className="max-w-[170px] truncate text-right text-sm font-medium text-slate-300">
                          {category || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">
                          Quantity
                        </span>

                        <span className="text-sm font-semibold text-white">
                          {quantity
                            ? `${formatNumber(
                                Number(quantity)
                              )} KG`
                            : "0 KG"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">
                          Rate / KG
                        </span>

                        <span className="text-sm font-semibold text-white">
                          {formatCurrency(
                            Number(rate) || 0
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">
                          Bundles
                        </span>

                        <span className="text-sm font-medium text-slate-300">
                          {bundleCount || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-slate-500">
                          Tar Size
                        </span>

                        <span className="text-sm font-medium text-slate-300">
                          {tarSize || "—"}
                        </span>
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="my-5 border-t border-slate-800" />

                    {/* Payment */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          Payment
                        </span>

                        <span
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                            paymentStatus ===
                            "Paid"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : paymentStatus ===
                                  "Partial"
                                ? "bg-orange-500/10 text-orange-400"
                                : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {paymentStatus}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                          Remaining
                        </span>

                        <span className="text-sm font-semibold text-white">
                          {formatCurrency(
                            remainingAmount
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Total */}
                    <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500/80">
                        Total Amount
                      </p>

                      <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-400">
                        {formatCurrency(totalAmount)}
                      </p>

                      <div className="mt-4 h-px bg-emerald-500/10" />

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          Payment progress
                        </span>

                        <span className="font-semibold text-slate-300">
                          {Math.round(
                            paymentPercentage
                          )}
                          %
                        </span>
                      </div>
                    </div>

                    {/* Save Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-500 hover:shadow-emerald-950/30 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoading ? (
                        <>
                          <Loader2
                            size={18}
                            className="animate-spin"
                          />
                          Saving Purchase...
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          Save Purchase
                          <ChevronRight size={17} />
                        </>
                      )}
                    </button>

                    <p className="mt-3 text-center text-[11px] leading-5 text-slate-600">
                      Save karne ke baad purchase stock aur
                      party ledger mein record ho jayegi.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Purchase;