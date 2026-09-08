export type PaymentStatus = "Paid" | "Unpaid" | "Partial";

export interface CreatePurchaseInput {
  purchaseDate: string;
  supplierName: string;
  phoneNumber: string;
  factory: string;
  category: string;
  quantity: number;
  ratePerKg: number;
  bundleCount?: number;
  tarSize?: string;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  notes?: string;
}

export interface Purchase {
  id: number;
  billNumber: string;
  purchaseDate: string;
  supplierName: string;
  phoneNumber: string;
  factory: string;
  category: string;
  quantity: number;
  ratePerKg: number;
  bundleCount: number | null;
  tarSize: string | null;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  remainingAmount: number;
  notes: string | null;
  createdAt: string;
}