import { invoke } from "@tauri-apps/api/core";
import type { CreatePaymentInput } from "../types/party";
import type { PaymentRecord } from "../types/payment";

const paymentService = {
  getPayments: async (): Promise<PaymentRecord[]> => {
    return await invoke<PaymentRecord[]>("get_payments");
  },

  createPayment: async (payment: CreatePaymentInput): Promise<void> => {
    await invoke("create_payment", { payment });
  },

  updatePayment: async (
    id: number,
    payment: CreatePaymentInput
  ): Promise<void> => {
    await invoke("update_payment", { id, payment });
  },

  deletePayment: async (id: number): Promise<void> => {
    await invoke("delete_payment", { id });
  },
};

export default paymentService;