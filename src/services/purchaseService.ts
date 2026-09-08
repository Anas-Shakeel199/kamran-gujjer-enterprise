import { invoke } from "@tauri-apps/api/core";

import type {
  CreatePurchaseInput,
  Purchase,
} from "../types/purchase";

const purchaseService = {
  createPurchase: async (
    purchase: CreatePurchaseInput
  ): Promise<Purchase> => {
    return await invoke<Purchase>("create_purchase", { purchase });
  },

  getPurchases: async (): Promise<Purchase[]> => {
    return await invoke<Purchase[]>("get_purchases");
  },

  updatePurchase: async (
    id: number,
    purchase: CreatePurchaseInput
  ): Promise<Purchase> => {
    return await invoke<Purchase>("update_purchase", { id, purchase });
  },

  deletePurchase: async (id: number): Promise<void> => {
    await invoke("delete_purchase", { id });
  },
};

export default purchaseService;