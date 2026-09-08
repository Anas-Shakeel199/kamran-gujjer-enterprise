import { useState } from "react";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Purchase from "./pages/Purchase";
import Sale from "./pages/Sale";
import Stock from "./pages/Stock";
import HistoryPage from "./pages/History";
import Khata from "./pages/Khata";
import Payments from "./pages/Payments";
import Expenses from "./pages/Expenses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import type { Page } from "./types/navigation";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

function App() {
  const [user, setUser] = useState<LoggedInUser | null>(null);
  const [activePage, setActivePage] = useState<Page>("dashboard");

  const handleLogout = () => {
    setUser(null);
    setActivePage("dashboard");
  };

  if (!user) {
    return <Login onLoginSuccess={setUser} />;
  }

  const pageProps = {
    user,
    activePage,
    onNavigate: setActivePage,
    onLogout: handleLogout,
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {activePage === "dashboard" && <Dashboard {...pageProps} />}
      {activePage === "purchase" && <Purchase {...pageProps} />}
      {activePage === "sale" && <Sale {...pageProps} />}
      {activePage === "stock" && <Stock {...pageProps} />}
      {activePage === "history" && <HistoryPage {...pageProps} />}
      {activePage === "khata" && <Khata {...pageProps} />}
      {activePage === "payments" && <Payments {...pageProps} />}
      {activePage === "expenses" && <Expenses {...pageProps} />}
      {activePage === "reports" && <Reports {...pageProps} />}
      {activePage === "settings" && <Settings {...pageProps} />}
    </div>
  );
}

export default App;