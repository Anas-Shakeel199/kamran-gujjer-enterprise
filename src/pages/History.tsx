import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  FileDown,
  Pencil,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";
import jsPDF from "jspdf";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import Sidebar from "../components/Sidebar";
import purchaseService from "../services/purchaseService";
import saleService from "../services/saleService";
import settingsService from "../services/settingsService";
import type {
  CreatePurchaseInput,
  Purchase,
  PaymentStatus as PurchasePaymentStatus,
} from "../types/purchase";
import type {
  CreateSaleInput,
  Sale,
  PaymentStatus as SalePaymentStatus,
} from "../types/sale";
import type { Page } from "../types/navigation";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

interface HistoryProps {
  user: LoggedInUser;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

type Tab = "purchase" | "sale";

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

const statusBadgeClass = (status: string) => {
  if (status === "Paid") return "bg-emerald-500/10 text-emerald-400";
  if (status === "Partial") return "bg-orange-500/10 text-orange-400";
  return "bg-red-500/10 text-red-400";
};

// =====================================================
// PDF BILL GENERATOR (native Save As dialog)
// =====================================================

interface BillData {
  type: "Purchase" | "Sale";
  billNumber: string;
  date: string;
  partyLabel: string;
  partyName: string;
  phoneNumber: string;
  assignedFactory: string;
  category: string;
  quantity: number;
  ratePerKg: number;
  bundleCount: number | null;
  tarSize: string | null;
  totalAmount: number;
  paymentStatus: string;
  paidAmount: number;
  remainingAmount: number;
  notes: string | null;
  factoryName: string;
  factoryPhone: string;
  factoryAddress: string;
}

const statusRgb = (status: string): [number, number, number] => {
  if (status === "Paid") return [5, 150, 105];
  if (status === "Partial") return [217, 119, 6];
  return [220, 38, 38];
};

const buildInvoicePdf = async (bill: BillData) => {
  const doc = new jsPDF({ format: "a5", unit: "mm" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 12;
  const contentWidth = pageWidth - marginX * 2;

  const black: [number, number, number] = [15, 23, 42];
  const gray: [number, number, number] = [100, 116, 139];
  const lightGray: [number, number, number] = [226, 232, 240];

  // ---------- HEADER ----------
  doc.setTextColor(...black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(bill.factoryName, marginX, 16);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);

  const headerLine2Parts: string[] = [];

  if (bill.factoryPhone) {
    headerLine2Parts.push(`Ph: ${bill.factoryPhone}`);
  }

  if (bill.factoryAddress) {
    headerLine2Parts.push(bill.factoryAddress);
  }

  const headerLine2 =
    headerLine2Parts.length > 0
      ? headerLine2Parts.join("  |  ")
      : "Factory Management & Trading";

  doc.text(headerLine2, marginX, 21);

  // Bill type tag
  const tagWidth = 34;
  const tagHeight = 7;

  doc.setFillColor(...black);

  doc.rect(pageWidth - marginX - tagWidth, 10, tagWidth, tagHeight, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  doc.text(
    `${bill.type.toUpperCase()} BILL`,
    pageWidth - marginX - tagWidth / 2,
    10 + tagHeight / 2 + 1.2,
    {
      align: "center",
    },
  );

  doc.setTextColor(...black);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);

  doc.text(bill.billNumber, pageWidth - marginX, 24, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...gray);

  doc.text(`Date: ${bill.date}`, pageWidth - marginX, 29, {
    align: "right",
  });

  // Divider
  doc.setDrawColor(...black);
  doc.setLineWidth(0.6);

  doc.line(marginX, 33, pageWidth - marginX, 33);

  // ---------- PARTY BOX ----------
  const partyBoxY = 38;
  const partyBoxHeight = 28;

  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);

  doc.rect(marginX, partyBoxY, contentWidth, partyBoxHeight);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...gray);

  doc.text(bill.partyLabel.toUpperCase(), marginX + 4, partyBoxY + 6);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...black);

  doc.text(bill.partyName, marginX + 4, partyBoxY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...gray);

  doc.text(`Phone: ${bill.phoneNumber}`, marginX + 4, partyBoxY + 19);

  doc.text(`Factory: ${bill.assignedFactory}`, marginX + 4, partyBoxY + 25);

  // ---------- ITEMS TABLE ----------
  const tableY = partyBoxY + partyBoxHeight + 8;

  // Column widths - designed specifically for A5
  const descriptionWidth = 34;
  const bundlesWidth = 16;
  const sizeWidth = 13;
  const qtyWidth = 20;
  const rateWidth = 23;
  const amountWidth =
    contentWidth -
    descriptionWidth -
    bundlesWidth -
    sizeWidth -
    qtyWidth -
    rateWidth;

  const tableX = marginX;

  const descriptionX = tableX;
  const bundlesX = descriptionX + descriptionWidth;
  const sizeX = bundlesX + bundlesWidth;
  const qtyX = sizeX + sizeWidth;
  const rateX = qtyX + qtyWidth;
  const amountX = rateX + rateWidth;

  const headerHeight = 10;
  const dataRowHeight = 12;

  // ---------- TABLE HEADER ----------
  doc.setFillColor(...black);
  doc.rect(tableX, tableY, contentWidth, headerHeight, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);

  const headerTextY = tableY + 6.5;

  // Description
  doc.text("DESCRIPTION", descriptionX + 2, headerTextY);

  // Bundles
  doc.text("BUNDLES", bundlesX + bundlesWidth / 2, headerTextY, {
    align: "center",
  });

  // Size
  doc.text("SIZE", sizeX + sizeWidth / 2, headerTextY, {
    align: "center",
  });

  // Quantity
  doc.text("QTY (KG)", qtyX + qtyWidth / 2, headerTextY, {
    align: "center",
  });

  // Rate
  doc.text("RATE/KG", rateX + rateWidth / 2, headerTextY, {
    align: "center",
  });

  // Amount
  doc.text("AMOUNT", amountX + amountWidth / 2, headerTextY, {
    align: "center",
  });

  // ---------- DATA ROW ----------
  const dataRowY = tableY + headerHeight;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);

  doc.rect(tableX, dataRowY, contentWidth, dataRowHeight);

  // Vertical column lines
  doc.line(bundlesX, tableY, bundlesX, dataRowY + dataRowHeight);

  doc.line(sizeX, tableY, sizeX, dataRowY + dataRowHeight);

  doc.line(qtyX, tableY, qtyX, dataRowY + dataRowHeight);

  doc.line(rateX, tableY, rateX, dataRowY + dataRowHeight);

  doc.line(amountX, tableY, amountX, dataRowY + dataRowHeight);

  // ---------- DATA TEXT ----------
  doc.setTextColor(...black);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const dataTextY = dataRowY + dataRowHeight / 2 + 2.5;

  // Description
  const description = `Maal (${bill.category})`;

  const descriptionLines = doc.splitTextToSize(
    description,
    descriptionWidth - 4,
  );

  doc.text(descriptionLines, descriptionX + 2, dataRowY + 5);

  // Bundles
  doc.text(
    bill.bundleCount !== null && bill.bundleCount !== undefined
      ? bill.bundleCount.toLocaleString()
      : "—",
    bundlesX + bundlesWidth / 2,
    dataTextY,
    {
      align: "center",
    },
  );

  // Size
  doc.text(
    bill.tarSize && bill.tarSize.trim() ? bill.tarSize : "—",
    sizeX + sizeWidth / 2,
    dataTextY,
    {
      align: "center",
    },
  );

  // Quantity
  doc.text(bill.quantity.toLocaleString(), qtyX + qtyWidth / 2, dataTextY, {
    align: "center",
  });

  // Rate
  doc.text(formatCurrency(bill.ratePerKg), rateX + rateWidth / 2, dataTextY, {
    align: "center",
  });

  // Amount
  doc.text(
    formatCurrency(bill.totalAmount),
    amountX + amountWidth - 2,
    dataTextY,
    {
      align: "right",
    },
  );

  // ---------- TABLE BOTTOM BORDER ----------
  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);

  doc.line(
    tableX,
    dataRowY + dataRowHeight,
    tableX + contentWidth,
    dataRowY + dataRowHeight,
  );

  // ---------- SUMMARY START ----------
  // IMPORTANT:
  // detailRowBottom/tableBottom removed.
  // Summary starts after the data row.
  let summaryY = dataRowY + dataRowHeight + 10;

  const summaryLabelX = marginX + contentWidth * 0.55;

  const summaryValueX = marginX + contentWidth - 3;

  const summaryRow = (
    label: string,
    value: string,
    options?: {
      bold?: boolean;
      color?: [number, number, number];
      size?: number;
    },
  ) => {
    doc.setFont("helvetica", options?.bold ? "bold" : "normal");

    doc.setFontSize(options?.size ?? 9.5);

    doc.setTextColor(...gray);

    doc.text(label, summaryLabelX, summaryY);

    doc.setTextColor(...(options?.color ?? black));

    doc.text(value, summaryValueX, summaryY, {
      align: "right",
    });

    summaryY += 7;
  };

  summaryRow("Payment Status", bill.paymentStatus, {
    bold: true,
    color: statusRgb(bill.paymentStatus),
  });

  summaryRow("Paid Amount", formatCurrency(bill.paidAmount));

  summaryRow("Remaining Amount", formatCurrency(bill.remainingAmount));

  doc.setDrawColor(...black);
  doc.setLineWidth(0.5);

  doc.line(summaryLabelX - 4, summaryY - 3, pageWidth - marginX, summaryY - 3);

  summaryY += 3;

  summaryRow("Total  ", formatCurrency(bill.totalAmount), {
    bold: true,
    size: 13,
  });

  // ---------- NOTES ----------
  if (bill.notes) {
    summaryY += 4;

    doc.setDrawColor(...black);
    doc.setLineWidth(1.2);

    doc.line(marginX, summaryY, marginX, summaryY + 12);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...black);

    doc.text("NOTES", marginX + 4, summaryY + 4);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...gray);

    const wrapped = doc.splitTextToSize(bill.notes, contentWidth - 8);

    doc.text(wrapped, marginX + 4, summaryY + 9);
  }

  // ---------- FOOTER ----------
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(...lightGray);
  doc.setLineWidth(0.3);

  doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...gray);

  doc.text(
    `Generated on ${new Date().toLocaleString("en-GB")} - ${bill.factoryName}`,
    pageWidth / 2,
    pageHeight - 9,
    {
      align: "center",
    },
  );

  // ---------- SAVE AS DIALOG ----------
  const destinationPath = await save({
    title: "Bill PDF save karein",
    defaultPath: `${bill.billNumber}.pdf`,
    filters: [
      {
        name: "PDF",
        extensions: ["pdf"],
      },
    ],
  });

  if (!destinationPath) return;

  const arrayBuffer = doc.output("arraybuffer") as ArrayBuffer;

  const bytes = Array.from(new Uint8Array(arrayBuffer));

  await invoke("save_binary_file", {
    path: destinationPath,
    data: bytes,
  });
};

const generatePurchasePdf = async (
  purchase: Purchase,
  factory: { name: string; phone: string; address: string },
) => {
  await buildInvoicePdf({
    type: "Purchase",
    billNumber: purchase.billNumber,
    date: formatDate(purchase.purchaseDate),
    partyLabel: "Supplier",
    partyName: purchase.supplierName,
    phoneNumber: purchase.phoneNumber,
    assignedFactory: purchase.factory,
    category: purchase.category,
    quantity: purchase.quantity,
    ratePerKg: purchase.ratePerKg,
    bundleCount: purchase.bundleCount,
    tarSize: purchase.tarSize,
    totalAmount: purchase.totalAmount,
    paymentStatus: purchase.paymentStatus,
    paidAmount: purchase.paidAmount,
    remainingAmount: purchase.remainingAmount,
    notes: purchase.notes,
    factoryName: factory.name,
    factoryPhone: factory.phone,
    factoryAddress: factory.address,
  });
};

const generateSalePdf = async (
  sale: Sale,
  factory: { name: string; phone: string; address: string },
) => {
  await buildInvoicePdf({
    type: "Sale",
    billNumber: sale.billNumber,
    date: formatDate(sale.saleDate),
    partyLabel: "Customer",
    partyName: sale.customerName,
    phoneNumber: sale.phoneNumber,
    assignedFactory: sale.factory,
    category: sale.category,
    quantity: sale.quantity,
    ratePerKg: sale.ratePerKg,
    bundleCount: sale.bundleCount,
    tarSize: sale.tarSize,
    totalAmount: sale.totalAmount,
    paymentStatus: sale.paymentStatus,
    paidAmount: sale.paidAmount,
    remainingAmount: sale.remainingAmount,
    notes: sale.notes,
    factoryName: factory.name,
    factoryPhone: factory.phone,
    factoryAddress: factory.address,
  });
};

// =====================================================
// EDIT PURCHASE MODAL
// =====================================================

function EditPurchaseModal({
  purchase,
  onClose,
  onSaved,
}: {
  purchase: Purchase;
  onClose: () => void;
  onSaved: (updated: Purchase) => void;
}) {
  const [date, setDate] = useState(purchase.purchaseDate);
  const [supplierName, setSupplierName] = useState(purchase.supplierName);
  const [phoneNumber, setPhoneNumber] = useState(purchase.phoneNumber);
  const [factory, setFactory] = useState(purchase.factory);
  const [category, setCategory] = useState(purchase.category);
  const [quantity, setQuantity] = useState(String(purchase.quantity));
  const [rate, setRate] = useState(String(purchase.ratePerKg));
  const [bundleCount, setBundleCount] = useState(
    purchase.bundleCount !== null ? String(purchase.bundleCount) : "",
  );
  const [tarSize, setTarSize] = useState(purchase.tarSize ?? "");
  const [paymentStatus, setPaymentStatus] = useState<PurchasePaymentStatus>(
    purchase.paymentStatus,
  );
  const [paidAmount, setPaidAmount] = useState(String(purchase.paidAmount));
  const [notes, setNotes] = useState(purchase.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [factories, setFactories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const [factoryList, categoryList] = await Promise.all([
          settingsService.getFactories(),
          settingsService.getMaalCategories(),
        ]);
        setFactories(factoryList.filter((f) => f.isActive));
        setCategories(categoryList.filter((c) => c.isActive));
      } catch {
        // options load na ho sakein to dropdown khaali rahega
      }
    })();
  }, []);

  const totalAmount = (Number(quantity) || 0) * (Number(rate) || 0);

  const handleSave = async () => {
    setError("");

    if (
      !supplierName.trim() ||
      !phoneNumber.trim() ||
      !factory ||
      !category ||
      !quantity ||
      !rate
    ) {
      setError("Sab required fields bharein.");
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
      bundleCount: bundleCount ? Number(bundleCount) : undefined,
      tarSize: tarSize.trim() || undefined,
      paymentStatus,
      paidAmount:
        paymentStatus === "Paid" ? totalAmount : Number(paidAmount) || 0,
      notes: notes.trim() || undefined,
    };

    try {
      setIsSaving(true);
      const updated = await purchaseService.updatePurchase(
        purchase.id,
        payload,
      );
      onSaved(updated);
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : "Update nahi ho saka. Dobara try karein.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Edit Purchase — {purchase.billNumber}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Factory</label>
            <select
              value={factory}
              onChange={(e) => setFactory(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Select factory</option>
              {factories.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Total Tar Bundle Number
              </label>
              <input
                type="number"
                value={bundleCount}
                onChange={(e) => setBundleCount(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Tar Size Number
              </label>
              <input
                type="text"
                value={tarSize}
                onChange={(e) => setTarSize(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Supplier Name
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Quantity (KG)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Rate per KG
              </label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Total:{" "}
              <span className="text-emerald-400">
                {formatCurrency(totalAmount)}
              </span>
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs text-slate-400">
              Payment Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Paid", "Partial", "Unpaid"] as PurchasePaymentStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setPaymentStatus(status);
                      if (status === "Paid") setPaidAmount(String(totalAmount));
                      if (status === "Unpaid") setPaidAmount("0");
                      if (status === "Partial") setPaidAmount("");
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                      paymentStatus === status
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {status}
                  </button>
                ),
              )}
            </div>
          </div>

          {paymentStatus === "Partial" && (
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Paid Amount
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-slate-400">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// EDIT SALE MODAL
// =====================================================

function EditSaleModal({
  sale,
  onClose,
  onSaved,
}: {
  sale: Sale;
  onClose: () => void;
  onSaved: (updated: Sale) => void;
}) {
  const [date, setDate] = useState(sale.saleDate);
  const [customerName, setCustomerName] = useState(sale.customerName);
  const [phoneNumber, setPhoneNumber] = useState(sale.phoneNumber);
  const [factory, setFactory] = useState(sale.factory);
  const [category, setCategory] = useState(sale.category);
  const [quantity, setQuantity] = useState(String(sale.quantity));
  const [rate, setRate] = useState(String(sale.ratePerKg));
  const [bundleCount, setBundleCount] = useState(
    sale.bundleCount !== null ? String(sale.bundleCount) : "",
  );
  const [tarSize, setTarSize] = useState(sale.tarSize ?? "");
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus>(
    sale.paymentStatus,
  );
  const [paidAmount, setPaidAmount] = useState(String(sale.paidAmount));
  const [notes, setNotes] = useState(sale.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const [factories, setFactories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    [],
  );

  useEffect(() => {
    (async () => {
      try {
        const [factoryList, categoryList] = await Promise.all([
          settingsService.getFactories(),
          settingsService.getMaalCategories(),
        ]);
        setFactories(factoryList.filter((f) => f.isActive));
        setCategories(categoryList.filter((c) => c.isActive));
      } catch {
        // options load na ho sakein to dropdown khaali rahega
      }
    })();
  }, []);

  const totalAmount = (Number(quantity) || 0) * (Number(rate) || 0);

  const handleSave = async () => {
    setError("");

    if (
      !customerName.trim() ||
      !phoneNumber.trim() ||
      !factory ||
      !category ||
      !quantity ||
      !rate
    ) {
      setError("Sab required fields bharein.");
      return;
    }

    const payload: CreateSaleInput = {
      saleDate: date,
      customerName: customerName.trim(),
      phoneNumber: phoneNumber.trim(),
      factory,
      category,
      quantity: Number(quantity),
      ratePerKg: Number(rate),
      bundleCount: bundleCount ? Number(bundleCount) : undefined,
      tarSize: tarSize.trim() || undefined,
      paymentStatus,
      paidAmount:
        paymentStatus === "Paid" ? totalAmount : Number(paidAmount) || 0,
      notes: notes.trim() || undefined,
    };

    try {
      setIsSaving(true);
      const updated = await saleService.updateSale(sale.id, payload);
      onSaved(updated);
    } catch (err) {
      setError(
        typeof err === "string"
          ? err
          : "Update nahi ho saka. Dobara try karein.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            Edit Sale — {sale.billNumber}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">Factory</label>
            <select
              value={factory}
              onChange={(e) => setFactory(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Select factory</option>
              {factories.map((f) => (
                <option key={f.id} value={f.name}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Total Tar Bundle Number
              </label>
              <input
                type="number"
                value={bundleCount}
                onChange={(e) => setBundleCount(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Tar Size Number
              </label>
              <input
                type="text"
                value={tarSize}
                onChange={(e) => setTarSize(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-400">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Quantity (KG)
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Rate per KG
              </label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-400">
              Total:{" "}
              <span className="text-blue-400">
                {formatCurrency(totalAmount)}
              </span>
            </p>
          </div>

          <div>
            <label className="mb-2 block text-xs text-slate-400">
              Payment Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Paid", "Partial", "Unpaid"] as SalePaymentStatus[]).map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setPaymentStatus(status);
                      if (status === "Paid") setPaidAmount(String(totalAmount));
                      if (status === "Unpaid") setPaidAmount("0");
                      if (status === "Partial") setPaidAmount("");
                    }}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium ${
                      paymentStatus === status
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {status}
                  </button>
                ),
              )}
            </div>
          </div>

          {paymentStatus === "Partial" && (
            <div>
              <label className="mb-1 block text-xs text-slate-400">
                Paid Amount
              </label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs text-slate-400">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// =====================================================
// MAIN HISTORY PAGE
// =====================================================

const HistoryPage = ({
  user,
  activePage,
  onNavigate,
  onLogout,
}: HistoryProps) => {
  const [tab, setTab] = useState<Tab>("purchase");

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const [actionError, setActionError] = useState("");

  const [factoryInfo, setFactoryInfo] = useState({
    name: "Kamran Gujjer Enterprise",
    phone: "",
    address: "",
  });

  const [factories, setFactories] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [factoryFilter, setFactoryFilter] = useState<string>("all");

  const loadData = async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const [purchaseData, saleData, factoryList] = await Promise.all([
        purchaseService.getPurchases(),
        saleService.getSales(),
        settingsService.getFactories(),
      ]);

      setPurchases(purchaseData);
      setSales(saleData);
      setFactories(factoryList.filter((f) => f.isActive));
    } catch (error) {
      setLoadError(
        typeof error === "string"
          ? error
          : "History load nahi ho saki. Dobara try karein.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    (async () => {
      try {
        const settings = await settingsService.getAppSettings();
        setFactoryInfo({
          name: settings.factoryName,
          phone: settings.factoryPhone,
          address: settings.factoryAddress,
        });
      } catch {
        // Settings load na ho sakein to defaults hi rehne dein
      }
    })();
  }, []);

  const filteredPurchases = useMemo(() => {
    if (factoryFilter === "all") return purchases;
    return purchases.filter((p) => p.factory === factoryFilter);
  }, [purchases, factoryFilter]);

  const filteredSales = useMemo(() => {
    if (factoryFilter === "all") return sales;
    return sales.filter((s) => s.factory === factoryFilter);
  }, [sales, factoryFilter]);

  const handleDeletePurchase = async (purchase: Purchase) => {
    const confirmed = window.confirm(
      `Kya aap "${purchase.billNumber}" delete karna chahte hain? Ye action wapas nahi ho sakta.`,
    );
    if (!confirmed) return;

    setActionError("");

    try {
      await purchaseService.deletePurchase(purchase.id);
      setPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
    } catch (error) {
      setActionError(
        typeof error === "string" ? error : "Delete nahi ho saka.",
      );
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    const confirmed = window.confirm(
      `Kya aap "${sale.billNumber}" delete karna chahte hain? Ye action wapas nahi ho sakta.`,
    );
    if (!confirmed) return;

    setActionError("");

    try {
      await saleService.deleteSale(sale.id);
      setSales((prev) => prev.filter((s) => s.id !== sale.id));
    } catch (error) {
      setActionError(
        typeof error === "string" ? error : "Delete nahi ho saka.",
      );
    }
  };

  const handlePurchasePdf = async (purchase: Purchase) => {
    setActionError("");
    try {
      await generatePurchasePdf(purchase, factoryInfo);
    } catch (error) {
      setActionError(
        typeof error === "string" ? error : "PDF save nahi ho saka.",
      );
    }
  };

  const handleSalePdf = async (sale: Sale) => {
    setActionError("");
    try {
      await generateSalePdf(sale, factoryInfo);
    } catch (error) {
      setActionError(
        typeof error === "string" ? error : "PDF save nahi ho saka.",
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="min-w-0 flex-1 p-5 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          {/* =====================================================
            PAGE HEADER
        ===================================================== */}

          <header className="mb-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.5)]" />

                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-400">
                    Transaction History
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-400">
                    <FileDown size={23} />
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      History
                    </h1>

                    <p className="mt-1 text-sm text-slate-400">
                      Purchase aur sale ki tamam entries manage karein.
                    </p>
                  </div>
                </div>
              </div>

              {/* Current User */}

              <div className="flex items-center gap-3">
                <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold uppercase text-violet-400 sm:flex">
                  {user.username.charAt(0)}
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Current User
                  </p>

                  <p className="mt-1 text-sm font-semibold capitalize text-violet-400">
                    {user.username}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* =====================================================
            SUMMARY STATS
        ===================================================== */}

          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Purchases */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Purchases
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {filteredPurchases.length}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShoppingCart size={19} />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Total purchase entries
              </p>
            </div>

            {/* Sales */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sales
                  </p>

                  <p className="mt-2 text-2xl font-bold text-white">
                    {filteredSales.length}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <ShoppingBag size={19} />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">Total sale entries</p>
            </div>

            {/* Purchase Value */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Purchase Value
                  </p>

                  <p className="mt-2 text-xl font-bold text-emerald-400">
                    {formatCurrency(
                      filteredPurchases.reduce(
                        (sum, purchase) => sum + purchase.totalAmount,
                        0,
                      ),
                    )}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <ShoppingCart size={18} />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Total purchase amount
              </p>
            </div>

            {/* Sale Value */}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Sale Value
                  </p>

                  <p className="mt-2 text-xl font-bold text-blue-400">
                    {formatCurrency(
                      filteredSales.reduce(
                        (sum, sale) => sum + sale.totalAmount,
                        0,
                      ),
                    )}
                  </p>
                </div>

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                  <ShoppingBag size={18} />
                </div>
              </div>

              <p className="mt-3 text-xs text-slate-500">Total sale amount</p>
            </div>
          </div>

          {/* =====================================================
            FILTER / TABS CARD
        ===================================================== */}

          <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-3">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              {/* Tabs */}

              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="button"
                  onClick={() => setTab("purchase")}
                  className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    tab === "purchase"
                      ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                      : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                  }`}
                >
                  <ShoppingCart size={17} />
                  Purchase
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] ${
                      tab === "purchase"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {filteredPurchases.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setTab("sale")}
                  className={`flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition ${
                    tab === "sale"
                      ? "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20"
                      : "text-slate-500 hover:bg-slate-800 hover:text-slate-300"
                  }`}
                >
                  <ShoppingBag size={17} />
                  Sale
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] ${
                      tab === "sale"
                        ? "bg-blue-500/10 text-blue-400"
                        : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {filteredSales.length}
                  </span>
                </button>
              </div>

              {/* Factory Filter */}

              <div className="flex items-center gap-3">
                <div className="hidden text-xs font-medium text-slate-500 sm:block">
                  Factory
                </div>

                <select
                  value={factoryFilter}
                  onChange={(e) => setFactoryFilter(e.target.value)}
                  className="w-full min-w-[190px] rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition hover:border-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 sm:w-auto"
                >
                  <option value="all">All Factories</option>

                  {factories.map((factory) => (
                    <option key={factory.id} value={factory.name}>
                      {factory.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* =====================================================
            ALERTS
        ===================================================== */}

          {loadError && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <AlertCircle size={18} className="text-red-400" />
              </div>

              <div>
                <p className="text-sm font-semibold text-red-300">
                  History Error
                </p>

                <p className="mt-1 text-sm text-red-400">{loadError}</p>
              </div>
            </div>
          )}

          {actionError && (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                <AlertCircle size={18} className="text-red-400" />
              </div>

              <div>
                <p className="text-sm font-semibold text-red-300">
                  Action Failed
                </p>

                <p className="mt-1 text-sm text-red-400">{actionError}</p>
              </div>
            </div>
          )}

          {/* =====================================================
            LOADING
        ===================================================== */}

          {isLoading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-16">
              <div className="flex flex-col items-center justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-violet-400" />
                </div>

                <p className="mt-4 text-sm font-medium text-slate-300">
                  History load ho rahi hai...
                </p>

                <p className="mt-1 text-xs text-slate-600">Please wait</p>
              </div>
            </div>
          ) : tab === "purchase" ? (
            /* ===================================================
             PURCHASE HISTORY
          =================================================== */

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              {/* Table Header */}

              <div className="border-b border-slate-800 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Purchase History
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Purchase ki tamam saved entries
                    </p>
                  </div>

                  <div className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
                    {filteredPurchases.length} Entries
                  </div>
                </div>
              </div>

              {filteredPurchases.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-600">
                    <ShoppingCart size={25} />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-300">
                    No purchase entries
                  </h3>

                  <p className="mt-1 text-xs text-slate-600">
                    Is filter ke liye koi purchase record nahi mila.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/30">
                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Bill
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Date
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Supplier
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Factory
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Quantity
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Amount
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Payment
                        </th>

                        <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredPurchases.map((purchase) => (
                        <tr
                          key={purchase.id}
                          className="group border-b border-slate-800/70 transition last:border-0 hover:bg-slate-800/30"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {purchase.billNumber}
                              </p>

                              <p className="mt-0.5 text-[10px] text-slate-600">
                                Purchase
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-400">
                            {formatDate(purchase.purchaseDate)}
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[170px] truncate text-sm font-medium text-slate-300">
                              {purchase.supplierName}
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {purchase.phoneNumber}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                              {purchase.factory}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-300">
                              {purchase.quantity.toLocaleString()}
                            </p>

                            <p className="text-[10px] text-slate-600">KG</p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-emerald-400">
                              {formatCurrency(purchase.totalAmount)}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-600">
                              {formatCurrency(purchase.ratePerKg)} / KG
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(
                                purchase.paymentStatus,
                              )}`}
                            >
                              {purchase.paymentStatus}
                            </span>

                            {purchase.remainingAmount > 0 && (
                              <p className="mt-1 text-[10px] text-slate-600">
                                Remaining{" "}
                                {formatCurrency(purchase.remainingAmount)}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingPurchase(purchase)}
                                title="Edit purchase"
                                className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-500 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handlePurchasePdf(purchase)}
                                title="Save PDF bill"
                                className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-500 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
                              >
                                <FileDown size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePurchase(purchase)}
                                title="Delete purchase"
                                className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-500 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* ===================================================
             SALE HISTORY
          =================================================== */

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
              <div className="border-b border-slate-800 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Sale History
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                      Sale ki tamam saved entries
                    </p>
                  </div>

                  <div className="rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-400">
                    {filteredSales.length} Entries
                  </div>
                </div>
              </div>

              {filteredSales.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-600">
                    <ShoppingBag size={25} />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-300">
                    No sale entries
                  </h3>

                  <p className="mt-1 text-xs text-slate-600">
                    Is filter ke liye koi sale record nahi mila.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/30">
                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Bill
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Date
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Customer
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Factory
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Quantity
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Amount
                        </th>

                        <th className="px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Payment
                        </th>

                        <th className="px-5 py-4 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                          Actions
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredSales.map((sale) => (
                        <tr
                          key={sale.id}
                          className="group border-b border-slate-800/70 transition last:border-0 hover:bg-slate-800/30"
                        >
                          <td className="px-5 py-4">
                            <div>
                              <p className="text-sm font-semibold text-white">
                                {sale.billNumber}
                              </p>

                              <p className="mt-0.5 text-[10px] text-slate-600">
                                Sale
                              </p>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-400">
                            {formatDate(sale.saleDate)}
                          </td>

                          <td className="px-5 py-4">
                            <p className="max-w-[170px] truncate text-sm font-medium text-slate-300">
                              {sale.customerName}
                            </p>

                            <p className="mt-1 text-xs text-slate-600">
                              {sale.phoneNumber}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                              {sale.factory}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-slate-300">
                              {sale.quantity.toLocaleString()}
                            </p>

                            <p className="text-[10px] text-slate-600">KG</p>
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-blue-400">
                              {formatCurrency(sale.totalAmount)}
                            </p>

                            <p className="mt-1 text-[10px] text-slate-600">
                              {formatCurrency(sale.ratePerKg)} / KG
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-lg px-2.5 py-1 text-[11px] font-semibold ${statusBadgeClass(
                                sale.paymentStatus,
                              )}`}
                            >
                              {sale.paymentStatus}
                            </span>

                            {sale.remainingAmount > 0 && (
                              <p className="mt-1 text-[10px] text-slate-600">
                                Remaining {formatCurrency(sale.remainingAmount)}
                              </p>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingSale(sale)}
                                title="Edit sale"
                                className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-500 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
                              >
                                <Pencil size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSalePdf(sale)}
                                title="Save PDF bill"
                                className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-500 transition hover:border-blue-500/40 hover:bg-blue-500/10 hover:text-blue-400"
                              >
                                <FileDown size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteSale(sale)}
                                title="Delete sale"
                                className="rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-500 transition hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-400"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* =====================================================
        EDIT PURCHASE MODAL
    ===================================================== */}

      {editingPurchase && (
        <EditPurchaseModal
          purchase={editingPurchase}
          onClose={() => setEditingPurchase(null)}
          onSaved={(updated) => {
            setPurchases((prev) =>
              prev.map((purchase) =>
                purchase.id === updated.id ? updated : purchase,
              ),
            );

            setEditingPurchase(null);
          }}
        />
      )}

      {/* =====================================================
        EDIT SALE MODAL
    ===================================================== */}

      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          onClose={() => setEditingSale(null)}
          onSaved={(updated) => {
            setSales((prev) =>
              prev.map((sale) => (sale.id === updated.id ? updated : sale)),
            );

            setEditingSale(null);
          }}
        />
      )}
    </div>
  );
};

export default HistoryPage;
