export interface ExpenseCategory {
  id: number;
  name: string;
}

export type PaymentMethod = "Cash" | "Bank" | "Other";

export interface CreateExpenseInput {
  expenseDate: string;
  category: string;
  description?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  factory: string;
}

export interface Expense {
  id: number;
  expenseDate: string;
  category: string;
  description: string | null;
  amount: number;
  paymentMethod: string;
  notes: string | null;
  factory: string;
  createdAt: string;
}