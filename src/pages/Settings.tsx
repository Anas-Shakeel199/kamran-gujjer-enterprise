import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Factory as FactoryIcon,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Package,
  Plus,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  ShieldCheck,
  Upload,
  UserRound,
  WalletCards,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import settingsService from "../services/settingsService";
import type {
  AppSettings,
  Factory,
  MaalCategory,
  PaymentMethodRecord,
} from "../types/settings";
import type { Page } from "../types/navigation";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

interface SettingsProps {
  user: LoggedInUser;
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

// =====================================================
// SHARED UI
// =====================================================

const inputClassName =
  "w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10";

const buttonPrimaryClass =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50";

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-5 flex items-start gap-3.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700/60 bg-slate-800/80 text-emerald-400">
        {icon}
      </div>

      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>

        {description && (
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function StatusMessage({
  type,
  message,
}: {
  type: "success" | "error";
  message: string;
}) {
  if (!message) return null;

  const isSuccess = type === "success";

  return (
    <div
      className={`mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs ${
        isSuccess
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
          : "border-red-500/20 bg-red-500/10 text-red-400"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
      ) : (
        <AlertCircle size={15} className="mt-0.5 shrink-0" />
      )}

      <span className="leading-5">{message}</span>
    </div>
  );
}

// =====================================================
// REUSABLE CATEGORY / METHOD MANAGER
// =====================================================

function ListManager<T extends { id: number; name: string; isActive: boolean }>({
  title,
  description,
  icon,
  items,
  onAdd,
  onToggle,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  items: T[];
  onAdd: (name: string) => Promise<void>;
  onToggle: (id: number, isActive: boolean) => Promise<void>;
}) {
  const [newName, setNewName] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const handleAdd = async () => {
    setError("");

    if (!newName.trim()) {
      setError("Naam enter karein.");
      return;
    }

    try {
      setIsSaving(true);

      await onAdd(newName.trim());

      setNewName("");
    } catch (err) {
      setError(typeof err === "string" ? err : "Add nahi ho saka.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (item: T) => {
    setError("");

    try {
      setTogglingId(item.id);

      await onToggle(item.id, !item.isActive);
    } catch (err) {
      setError(typeof err === "string" ? err : "Status update nahi ho saka.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-sm transition hover:border-slate-700/80">
      <SectionHeader icon={icon} title={title} description={description} />

      {error && <StatusMessage type="error" message={error} />}

      {/* Add */}
      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                void handleAdd();
              }
            }}
            placeholder={`Naya ${title.toLowerCase()} naam`}
            className={inputClassName}
            disabled={isSaving}
          />

          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={isSaving}
            className={`${buttonPrimaryClass} shrink-0`}
          >
            {isSaving ? (
              <RefreshCw size={15} className="animate-spin" />
            ) : (
              <Plus size={15} />
            )}

            {isSaving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-hidden rounded-xl border border-slate-800">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-slate-500">
              <Plus size={16} />
            </div>

            <p className="text-sm font-medium text-slate-400">
              Koi entry nahi hai
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Upar se pehli entry add karein.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-800/30"
              >
                <div className="min-w-0">
                  <p
                    className={`truncate text-sm font-medium ${
                      item.isActive ? "text-slate-200" : "text-slate-500"
                    }`}
                  >
                    {item.name}
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-600">
                    {item.isActive ? "Currently active" : "Currently inactive"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleToggle(item)}
                  disabled={togglingId === item.id}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition disabled:opacity-50 ${
                    item.isActive
                      ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                      : "bg-slate-800 text-slate-500 hover:bg-slate-700"
                  }`}
                >
                  {togglingId === item.id && (
                    <RefreshCw size={11} className="animate-spin" />
                  )}

                  {item.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] text-slate-600">
        {items.length} {items.length === 1 ? "entry" : "entries"} available
      </p>
    </section>
  );
}

// =====================================================
// MAIN SETTINGS PAGE
// =====================================================

const Settings = ({
  user,
  activePage,
  onNavigate,
  onLogout,
}: SettingsProps) => {
  const [factoryName, setFactoryName] = useState("");
  const [factoryPhone, setFactoryPhone] = useState("");
  const [factoryAddress, setFactoryAddress] = useState("");
  const [isSavingFactory, setIsSavingFactory] = useState(false);
  const [factoryMessage, setFactoryMessage] = useState("");
  const [factoryError, setFactoryError] = useState("");

  const [maalCategories, setMaalCategories] = useState<MaalCategory[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<
    PaymentMethodRecord[]
  >([]);

  const [newUsername, setNewUsername] = useState(user.username);
  const [usernameMessage, setUsernameMessage] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [isSavingUsername, setIsSavingUsername] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const [backupMessage, setBackupMessage] = useState("");
  const [backupError, setBackupError] = useState("");
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // =====================================================
  // LOAD SETTINGS
  // =====================================================

  const loadAll = async () => {
    try {
      setIsLoading(true);
      setLoadError("");

      const [settings, categories, methods, factoryList] = await Promise.all([
        settingsService.getAppSettings(),
        settingsService.getMaalCategories(),
        settingsService.getPaymentMethods(),
        settingsService.getFactories(),
      ]);

      setFactoryName(settings.factoryName);
      setFactoryPhone(settings.factoryPhone);
      setFactoryAddress(settings.factoryAddress);
      setMaalCategories(categories);
      setPaymentMethods(methods);
      setFactories(factoryList);
    } catch (error) {
      setLoadError(
        typeof error === "string"
          ? error
          : "Settings load nahi ho sakin."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAll();
  }, []);

  // =====================================================
  // FACTORY
  // =====================================================

  const handleSaveFactory = async () => {
    setFactoryMessage("");
    setFactoryError("");

    if (!factoryName.trim()) {
      setFactoryError("Factory name required hai.");
      return;
    }

    try {
      setIsSavingFactory(true);

      await settingsService.saveAppSettings({
        factoryName: factoryName.trim(),
        factoryPhone: factoryPhone.trim(),
        factoryAddress: factoryAddress.trim(),
      });

      setFactoryMessage("Factory information successfully save ho gayi.");
    } catch (err) {
      setFactoryError(
        typeof err === "string" ? err : "Save nahi ho saka."
      );
    } finally {
      setIsSavingFactory(false);
    }
  };

  // =====================================================
  // USERNAME
  // =====================================================

  const handleSaveUsername = async () => {
    setUsernameMessage("");
    setUsernameError("");

    if (!newUsername.trim()) {
      setUsernameError("Username khaali nahi ho sakta.");
      return;
    }

    try {
      setIsSavingUsername(true);

      await settingsService.changeUsername(
        user.id,
        newUsername.trim()
      );

      setUsernameMessage(
        "Username update ho gaya. Agli baar isi naye username se login karein."
      );
    } catch (err) {
      setUsernameError(
        typeof err === "string" ? err : "Update nahi ho saka."
      );
    } finally {
      setIsSavingUsername(false);
    }
  };

  // =====================================================
  // PASSWORD
  // =====================================================

  const handleSavePassword = async () => {
    setPasswordMessage("");
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Sab fields bharein.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError(
        "Naya password aur confirm password match nahi karte."
      );
      return;
    }

    try {
      setIsSavingPassword(true);

      await settingsService.changePassword(
        user.id,
        currentPassword,
        newPassword
      );

      setPasswordMessage("Password successfully update ho gaya.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      setPasswordError(
        typeof err === "string" ? err : "Update nahi ho saka."
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  // =====================================================
  // BACKUP
  // =====================================================

  const handleBackup = async () => {
    setBackupMessage("");
    setBackupError("");

    try {
      setIsBackingUp(true);

      const path = await settingsService.backupDatabase();

      if (path) {
        setBackupMessage(`Backup successfully save ho gaya: ${path}`);
      }
    } catch (err) {
      setBackupError(
        typeof err === "string" ? err : "Backup nahi ban saka."
      );
    } finally {
      setIsBackingUp(false);
    }
  };

  // =====================================================
  // RESTORE
  // =====================================================

  const handleRestore = async () => {
    setBackupMessage("");
    setBackupError("");

    const confirmed = window.confirm(
      "Kya aap purana backup restore karna chahte hain?\n\nYe current data ko overwrite kar dega aur ye action wapas nahi ho sakta."
    );

    if (!confirmed) return;

    try {
      setIsRestoring(true);

      const path = await settingsService.restoreDatabase();

      if (path) {
        setBackupMessage(
          "Restore successfully complete ho gaya. App ko band kar ke dobara khol lein taake naya data load ho."
        );
      }
    } catch (err) {
      setBackupError(
        typeof err === "string" ? err : "Restore nahi ho saka."
      );
    } finally {
      setIsRestoring(false);
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={onLogout}
        />

        <main className="min-w-0 flex-1 p-6 lg:p-8">
          <div className="mb-8">
            <div className="h-8 w-32 animate-pulse rounded-lg bg-slate-800" />
            <div className="mt-3 h-4 w-80 max-w-full animate-pulse rounded bg-slate-900" />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className={`animate-pulse rounded-2xl border border-slate-800 bg-slate-900 p-6 ${
                  item === 1 || item === 5 ? "xl:col-span-2" : ""
                }`}
              >
                <div className="h-5 w-40 rounded bg-slate-800" />
                <div className="mt-5 h-10 rounded-xl bg-slate-950" />
                <div className="mt-3 h-10 rounded-xl bg-slate-950" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <main className="min-w-0 flex-1 overflow-x-hidden p-5 lg:p-8">
        <div className="mx-auto max-w-[1500px]">
          {/* PAGE HEADER */}
          <div className="mb-7 flex flex-col gap-4 border-b border-slate-800/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-400">
                <SettingsIcon size={14} />
                SYSTEM SETTINGS
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white lg:text-3xl">
                Settings
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Factory information, categories, account security aur
                database backup yahan manage karein.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <UserRound size={16} />
              </div>

              <div>
                <p className="text-xs font-medium text-slate-300">
                  {user.username}
                </p>
                <p className="text-[10px] uppercase tracking-wide text-slate-600">
                  {user.role}
                </p>
              </div>
            </div>
          </div>

          {/* LOAD ERROR */}
          {loadError && (
            <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{loadError}</span>
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-2">
            {/* =================================================
                FACTORY INFORMATION
            ================================================== */}

            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-sm xl:col-span-2 lg:p-6">
              <SectionHeader
                icon={<FactoryIcon size={19} />}
                title="Factory Information"
                description="Ye information bills, reports aur factory records mein use hogi."
              />

              <StatusMessage
                type="success"
                message={factoryMessage}
              />

              <StatusMessage
                type="error"
                message={factoryError}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Factory Name
                  </label>

                  <input
                    type="text"
                    value={factoryName}
                    onChange={(e) => setFactoryName(e.target.value)}
                    placeholder="Enter factory name"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Factory Phone
                  </label>

                  <input
                    type="text"
                    value={factoryPhone}
                    onChange={(e) => setFactoryPhone(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    className={inputClassName}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Factory Address
                  </label>

                  <input
                    type="text"
                    value={factoryAddress}
                    onChange={(e) => setFactoryAddress(e.target.value)}
                    placeholder="Enter factory address"
                    className={inputClassName}
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-800/70 pt-5">
                <button
                  type="button"
                  onClick={() => void handleSaveFactory()}
                  disabled={isSavingFactory}
                  className={buttonPrimaryClass}
                >
                  {isSavingFactory ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}

                  {isSavingFactory ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </section>

            {/* =================================================
                FACTORIES
            ================================================== */}

            <ListManager
              title="Factories"
              description="Factory locations ya units manage karein."
              icon={<FactoryIcon size={18} />}
              items={factories}
              onAdd={async (name) => {
                const created = await settingsService.addFactory(name);

                setFactories((prev) => [...prev, created]);
              }}
              onToggle={async (id, isActive) => {
                await settingsService.toggleFactory(id, isActive);

                setFactories((prev) =>
                  prev.map((factory) =>
                    factory.id === id
                      ? { ...factory, isActive }
                      : factory
                  )
                );
              }}
            />

            {/* =================================================
                MAAL CATEGORIES
            ================================================== */}

            <ListManager
              title="Maal Categories"
              description="Scrap / maal ki categories yahan add karein."
              icon={<Package size={18} />}
              items={maalCategories}
              onAdd={async (name) => {
                const created =
                  await settingsService.addMaalCategory(name);

                setMaalCategories((prev) => [...prev, created]);
              }}
              onToggle={async (id, isActive) => {
                await settingsService.toggleMaalCategory(
                  id,
                  isActive
                );

                setMaalCategories((prev) =>
                  prev.map((category) =>
                    category.id === id
                      ? { ...category, isActive }
                      : category
                  )
                );
              }}
            />

            {/* =================================================
                PAYMENT METHODS
            ================================================== */}

            <ListManager
              title="Payment Methods"
              description="Payment ke available methods manage karein."
              icon={<WalletCards size={18} />}
              items={paymentMethods}
              onAdd={async (name) => {
                const created =
                  await settingsService.addPaymentMethod(name);

                setPaymentMethods((prev) => [...prev, created]);
              }}
              onToggle={async (id, isActive) => {
                await settingsService.togglePaymentMethod(
                  id,
                  isActive
                );

                setPaymentMethods((prev) =>
                  prev.map((method) =>
                    method.id === id
                      ? { ...method, isActive }
                      : method
                  )
                );
              }}
            />

            {/* =================================================
                USERNAME
            ================================================== */}

            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-sm">
              <SectionHeader
                icon={<UserRound size={18} />}
                title="Change Username"
                description="Login ke liye username update karein."
              />

              <StatusMessage
                type="success"
                message={usernameMessage}
              />

              <StatusMessage
                type="error"
                message={usernameError}
              />

              <div>
                <label className="mb-2 block text-xs font-medium text-slate-400">
                  New Username
                </label>

                <div className="relative">
                  <UserRound
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                  />

                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Enter new username"
                    className={`${inputClassName} pl-9`}
                  />
                </div>
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-800/70 pt-5">
                <button
                  type="button"
                  onClick={() => void handleSaveUsername()}
                  disabled={isSavingUsername}
                  className={buttonPrimaryClass}
                >
                  {isSavingUsername ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <Save size={15} />
                  )}

                  {isSavingUsername ? "Saving..." : "Update Username"}
                </button>
              </div>
            </section>

            {/* =================================================
                PASSWORD
            ================================================== */}

            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-sm">
              <SectionHeader
                icon={<LockKeyhole size={18} />}
                title="Change Password"
                description="Account ko secure rakhne ke liye password update karein."
              />

              <StatusMessage
                type="success"
                message={passwordMessage}
              />

              <StatusMessage
                type="error"
                message={passwordError}
              />

              <div className="space-y-3.5">
                {/* Current */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Current Password
                  </label>

                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                    />

                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) =>
                        setCurrentPassword(e.target.value)
                      }
                      placeholder="Enter current password"
                      className={`${inputClassName} pl-9 pr-10`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowCurrentPassword((prev) => !prev)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    >
                      {showCurrentPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* New */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    New Password
                  </label>

                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                    />

                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) =>
                        setNewPassword(e.target.value)
                      }
                      placeholder="Enter new password"
                      className={`${inputClassName} pl-9 pr-10`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowNewPassword((prev) => !prev)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    >
                      {showNewPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm */}
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <KeyRound
                      size={15}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600"
                    />

                    <input
                      type={
                        showConfirmPassword ? "text" : "password"
                      }
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(e.target.value)
                      }
                      placeholder="Confirm new password"
                      className={`${inputClassName} pl-9 pr-10`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword((prev) => !prev)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-300"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={16} />
                      ) : (
                        <Eye size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end border-t border-slate-800/70 pt-5">
                <button
                  type="button"
                  onClick={() => void handleSavePassword()}
                  disabled={isSavingPassword}
                  className={buttonPrimaryClass}
                >
                  {isSavingPassword ? (
                    <RefreshCw size={15} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={15} />
                  )}

                  {isSavingPassword ? "Updating..." : "Update Password"}
                </button>
              </div>
            </section>

            {/* =================================================
                BACKUP & RESTORE
            ================================================== */}

            <section className="rounded-2xl border border-slate-800/80 bg-slate-900/80 p-5 shadow-sm xl:col-span-2 lg:p-6">
              <SectionHeader
                icon={<Database size={19} />}
                title="Backup & Restore"
                description="Factory ka complete database backup karein ya previous backup restore karein."
              />

              <StatusMessage
                type="success"
                message={backupMessage}
              />

              <StatusMessage
                type="error"
                message={backupError}
              />

              <div className="grid gap-4 md:grid-cols-2">
                {/* Backup Card */}
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Create Backup
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Purchases, sales, khata, payments, expenses aur
                        settings ka complete backup create karein.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                      <Database size={17} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleBackup()}
                    disabled={isBackingUp || isRestoring}
                    className={buttonPrimaryClass}
                  >
                    {isBackingUp ? (
                      <RefreshCw
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Database size={15} />
                    )}

                    {isBackingUp
                      ? "Creating Backup..."
                      : "Backup Data"}
                  </button>
                </div>

                {/* Restore Card */}
                <div className="rounded-2xl border border-red-500/15 bg-red-500/[0.03] p-5">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Restore Backup
                      </h3>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Previous backup se database restore karein.
                        Existing data overwrite ho jayega.
                      </p>
                    </div>

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                      <Upload size={17} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRestore()}
                    disabled={isRestoring || isBackingUp}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isRestoring ? (
                      <RefreshCw
                        size={15}
                        className="animate-spin"
                      />
                    ) : (
                      <Upload size={15} />
                    )}

                    {isRestoring
                      ? "Restoring..."
                      : "Restore Backup"}
                  </button>
                </div>
              </div>

              {/* Warning */}
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5 px-3.5 py-3">
                <AlertCircle
                  size={15}
                  className="mt-0.5 shrink-0 text-amber-400"
                />

                <p className="text-[11px] leading-5 text-slate-500">
                  <span className="font-semibold text-amber-400">
                    Important:
                  </span>{" "}
                  Restore karne ke baad app ko band kar ke dobara
                  open karna zaroori hai taake restored data properly
                  load ho.
                </p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;