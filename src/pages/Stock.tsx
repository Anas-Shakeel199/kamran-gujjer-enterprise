import {
  BarChart3,
  BookText,
  Coins,
  History,
  LayoutDashboard,
  LogOut,
  Package,
  Settings as SettingsIcon,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from "lucide-react";


import type { Page } from "../types/navigation";
import { ReactNode } from "react";

interface SidebarProps {
  activePage: Page;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const Sidebar = ({
  activePage,
  onNavigate,
  onLogout,
}: SidebarProps) => {
  const navItems: { page: Page; label: string; icon: ReactNode }[] = [
    { page: "dashboard", label: "Dashboard", icon: <LayoutDashboard size={20} /> },
    { page: "purchase", label: "Purchase", icon: <ShoppingCart size={20} /> },
    { page: "sale", label: "Sale", icon: <ShoppingBag size={20} /> },
    { page: "stock", label: "Stock", icon: <Package size={20} /> },
    { page: "history", label: "History", icon: <History size={20} /> },
    { page: "khata", label: "Khata", icon: <BookText size={20} /> },
    { page: "payments", label: "Payments", icon: <Wallet size={20} /> },
    { page: "expenses", label: "Expenses", icon: <Coins size={20} /> },
    { page: "reports", label: "Reports", icon: <BarChart3 size={20} /> },
    { page: "settings", label: "Settings", icon: <SettingsIcon size={20} /> },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 px-6 py-5">
        <h1 className="text-xl font-bold text-white">Kamran Gujjer</h1>
        <p className="text-sm text-slate-400">Enterprise</p>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {navItems.map((item) => (
          <button
            key={item.page}
            type="button"
            onClick={() => onNavigate(item.page)}
            className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition ${
              activePage === item.page
                ? "bg-emerald-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            }`}
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;