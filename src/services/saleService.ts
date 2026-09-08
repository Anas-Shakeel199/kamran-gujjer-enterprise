import { invoke } from "@tauri-apps/api/core";
import type { CreateSaleInput, Sale } from "../types/sale";

const saleService = {
  createSale: async (sale: CreateSaleInput): Promise<Sale> => {
    return await invoke<Sale>("create_sale", { sale });
  },

  getSales: async (): Promise<Sale[]> => {
    return await invoke<Sale[]>("get_sales");
  },

  updateSale: async (id: number, sale: CreateSaleInput): Promise<Sale> => {
    return await invoke<Sale>("update_sale", { id, sale });
  },

  deleteSale: async (id: number): Promise<void> => {
    await invoke("delete_sale", { id });
  },
};

export default saleService;