import {
  BarChart3,
  BookText,
  Coins,
  History,
  LayoutDashboard,
  LogOut,
  Settings as SettingsIcon,
  ShoppingBag,
  ShoppingCart,
  Wallet,
} from "lucide-react";

import logo from "../assets/kn-logo.png";
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
  const navItems: {
    page: Page;
    label: string;
    icon: ReactNode;
  }[] = [
    {
      page: "dashboard",
      label: "Dashboard",
      icon: <LayoutDashboard size={19} />,
    },
    {
      page: "purchase",
      label: "Purchase",
      icon: <ShoppingCart size={19} />,
    },
    {
      page: "sale",
      label: "Sale",
      icon: <ShoppingBag size={19} />,
    },
    {
      page: "history",
      label: "History",
      icon: <History size={19} />,
    },
    {
      page: "khata",
      label: "Khata",
      icon: <BookText size={19} />,
    },
    {
      page: "payments",
      label: "Payments",
      icon: <Wallet size={19} />,
    },
    {
      page: "expenses",
      label: "Expenses",
      icon: <Coins size={19} />,
    },
    {
      page: "reports",
      label: "Reports",
      icon: <BarChart3 size={19} />,
    },
    {
      page: "settings",
      label: "Settings",
      icon: <SettingsIcon size={19} />,
    },
  ];

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      {/* Brand */}
      <div className="border-b border-slate-800 px-5 py-5">
  <div className="flex items-center gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
      <img
        src={logo}
        alt="Kamran Gujjer Enterprise"
        className="h-8 w-8 object-contain"
      />
    </div>

    <div className="min-w-0">
      <h1 className="truncate text-base font-bold tracking-tight text-white">
        Kamran Gujjer
      </h1>

      <p className="mt-0.5 text-xs font-medium text-emerald-400">
        Enterprise
      </p>
    </div>
  </div>
</div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500">
          Main Menu
        </p>

        <div className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = activePage === item.page;

            return (
              <button
                key={item.page}
                type="button"
                onClick={() => onNavigate(item.page)}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-950/20"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                }`}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-emerald-300" />
                )}

                {/* Icon */}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "bg-slate-800/70 text-slate-400 group-hover:bg-slate-700 group-hover:text-emerald-400"
                  }`}
                >
                  {item.icon}
                </span>

                {/* Label */}
                <span className="text-sm font-medium">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t border-slate-800 p-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">
          Account
        </p>

        <button
          type="button"
          onClick={onLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-slate-400 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800/70 transition-colors group-hover:bg-red-500/10">
            <LogOut size={18} />
          </span>

          <span className="text-sm font-medium">
            Logout
          </span>
        </button>

        <div className="mt-3 px-3 pb-1">
          <p className="text-[10px] text-slate-600">
            Factory Management System
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;