import { invoke } from "@tauri-apps/api/core";
import type {
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
} from "../types/expense";

const expenseService = {
  getCategories: async (): Promise<ExpenseCategory[]> => {
    return await invoke<ExpenseCategory[]>("get_expense_categories");
  },

  addCategory: async (name: string): Promise<ExpenseCategory> => {
    return await invoke<ExpenseCategory>("add_expense_category", { name });
  },

  deleteCategory: async (id: number): Promise<void> => {
    await invoke("delete_expense_category", { id });
  },

  createExpense: async (expense: CreateExpenseInput): Promise<Expense> => {
    return await invoke<Expense>("create_expense", { expense });
  },

  getExpenses: async (): Promise<Expense[]> => {
    return await invoke<Expense[]>("get_expenses");
  },

  updateExpense: async (
    id: number,
    expense: CreateExpenseInput
  ): Promise<Expense> => {
    return await invoke<Expense>("update_expense", { id, expense });
  },

  deleteExpense: async (id: number): Promise<void> => {
    await invoke("delete_expense", { id });
  },
};

export default expenseService;