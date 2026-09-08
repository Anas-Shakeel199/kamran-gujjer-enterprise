import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import type {
  AppSettings,
  Factory,
  MaalCategory,
  PaymentMethodRecord,
} from "../types/settings";

const settingsService = {
  getAppSettings: async (): Promise<AppSettings> => {
    return await invoke<AppSettings>("get_app_settings");
  },

  saveAppSettings: async (settings: AppSettings): Promise<AppSettings> => {
    return await invoke<AppSettings>("save_app_settings", { settings });
  },

  getMaalCategories: async (): Promise<MaalCategory[]> => {
    return await invoke<MaalCategory[]>("get_maal_categories");
  },

  addMaalCategory: async (name: string): Promise<MaalCategory> => {
    return await invoke<MaalCategory>("add_maal_category", { name });
  },

  toggleMaalCategory: async (id: number, isActive: boolean): Promise<void> => {
    await invoke("toggle_maal_category", { id, isActive });
  },

  getPaymentMethods: async (): Promise<PaymentMethodRecord[]> => {
    return await invoke<PaymentMethodRecord[]>("get_payment_methods");
  },

  addPaymentMethod: async (name: string): Promise<PaymentMethodRecord> => {
    return await invoke<PaymentMethodRecord>("add_payment_method", { name });
  },

  togglePaymentMethod: async (id: number, isActive: boolean): Promise<void> => {
    await invoke("toggle_payment_method", { id, isActive });
  },

  getFactories: async (): Promise<Factory[]> => {
    return await invoke<Factory[]>("get_factories");
  },

  addFactory: async (name: string): Promise<Factory> => {
    return await invoke<Factory>("add_factory", { name });
  },

  toggleFactory: async (id: number, isActive: boolean): Promise<void> => {
    await invoke("toggle_factory", { id, isActive });
  },

  changeUsername: async (userId: number, newUsername: string): Promise<void> => {
    await invoke("change_username", { userId, newUsername });
  },

  changePassword: async (
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<void> => {
    await invoke("change_password", { userId, currentPassword, newPassword });
  },

  backupDatabase: async (): Promise<string | null> => {
    const path = await save({
      title: "Backup file save karein",
      defaultPath: `Kamran_Gujjer_Backup_${new Date().toISOString().split("T")[0]}.db`,
      filters: [{ name: "Database Backup", extensions: ["db"] }],
    });

    if (!path) return null;

    await invoke("backup_database", { destinationPath: path });
    return path;
  },

  restoreDatabase: async (): Promise<string | null> => {
    const selected = await open({
      title: "Backup file select karein",
      multiple: false,
      filters: [{ name: "Database Backup", extensions: ["db"] }],
    });

    const path = Array.isArray(selected) ? selected[0] : selected;
    if (!path) return null;

    await invoke("restore_database", { sourcePath: path });
    return path;
  },
};

export default settingsService;