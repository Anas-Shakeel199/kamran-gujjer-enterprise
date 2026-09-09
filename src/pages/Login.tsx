import LoginForm from "../components/auth/LoginForm";
import logo from "../assets/kn-logo.png";
import { Mail, Phone } from "lucide-react";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

function Login({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: LoggedInUser) => void;
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-180px] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="absolute bottom-[-220px] left-[-120px] h-[400px] w-[400px] rounded-full bg-cyan-500/5 blur-3xl" />

        <div className="absolute right-[-140px] top-1/3 h-[360px] w-[360px] rounded-full bg-violet-500/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl shadow-black/20">
            <img
              src={logo}
              alt="Kamran Gujjer Enterprise Logo"
              className="h-20 w-auto object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-white">
            Kamran Gujjer
          </h1>

          <p className="mt-1 text-sm font-medium text-emerald-400">
            Enterprise
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          {/* Card Header */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Welcome back
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Login karein aur factory management system access karein.
            </p>
          </div>

          {/* Login Form */}
          <LoginForm onLoginSuccess={onLoginSuccess} />

          {/* Security note */}
          <div className="mt-6 border-t border-slate-800 pt-5">
            <p className="text-center text-xs leading-5 text-slate-500">
              Authorized users only. Apni login details kisi ke saath share
              na karein.
            </p>
          </div>
        </div>

        {/* Developer Information */}
        <div className="mt-6 rounded-xl border border-slate-800/80 bg-slate-900/50 px-4 py-4 text-center backdrop-blur">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-600">
            Developed by
          </p>

          <p className="mt-1 text-sm font-semibold text-slate-300">
            Anas Shakeel
          </p>

          <p className="mt-0.5 text-[11px] text-emerald-400">
             Software Developer
          </p>

          <div className="mt-3 flex items-center justify-center gap-4">
            <a
              href="tel:+923206362038"
              className="group flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-emerald-400"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>0320 6362038</span>
            </a>

            <span className="h-3 w-px bg-slate-700" />

            <a
              href="mailto:anas.work199786@gmail.com"
              className="group flex items-center gap-1.5 text-[11px] text-slate-500 transition-colors hover:text-emerald-400"
            >
              <Mail className="h-3.5 w-3.5" />
              <span>anas.work199786@gmail.com</span>
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs font-medium text-slate-500">
            Kamran Gujjer Enterprise
          </p>

          <p className="mt-1 text-[11px] text-slate-600">
            Factory Management System · © 2026
          </p>
        </div>
      </div>
    </main>
  );
}

export default Login;