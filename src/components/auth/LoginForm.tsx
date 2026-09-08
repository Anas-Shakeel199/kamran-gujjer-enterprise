import { useState } from "react";
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  User,
  LockKeyhole,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

type LoggedInUser = {
  id: number;
  username: string;
  role: string;
};

function LoginForm({
  onLoginSuccess,
}: {
  onLoginSuccess: (user: LoggedInUser) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({
    username: "",
    password: "",
  });

  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const newErrors = {
      username: "",
      password: "",
    };

    setLoginError("");

    if (!username.trim()) {
      newErrors.username = "Username required hai.";
    }

    if (!password.trim()) {
      newErrors.password = "Password required hai.";
    }

    setErrors(newErrors);

    if (newErrors.username || newErrors.password) {
      return;
    }

    try {
      setIsLoading(true);

      const user = await invoke<LoggedInUser>("login", {
        username: username.trim(),
        password,
      });

      onLoginSuccess(user);
    } catch (error) {
      setLoginError(
        typeof error === "string"
          ? error
          : "Login ke waqt kuch masla ho gaya. Dobara try karein."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const usernameHasError = Boolean(errors.username);
  const passwordHasError = Boolean(errors.password);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Login Error */}
      {loginError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
            <AlertCircle size={17} className="text-red-400" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-medium text-red-300">
              Login failed
            </p>

            <p className="mt-0.5 text-xs leading-5 text-red-400/90">
              {loginError}
            </p>
          </div>
        </div>
      )}

      {/* Username */}
      <div>
        <label
          htmlFor="username"
          className="mb-2 block text-sm font-medium text-slate-300"
        >
          Username
        </label>

        <div className="relative">
          <div
            className={`pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center justify-center ${
              usernameHasError
                ? "text-red-400"
                : "text-slate-500"
            }`}
          >
            <User size={18} />
          </div>

          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);

              if (errors.username) {
                setErrors((previous) => ({
                  ...previous,
                  username: "",
                }));
              }

              if (loginError) {
                setLoginError("");
              }
            }}
            placeholder="Enter your username"
            autoComplete="username"
            disabled={isLoading}
            className={`w-full rounded-xl border bg-slate-800/80 py-3.5 pl-11 pr-4 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 ${
              usernameHasError
                ? "border-red-500/70 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                : "border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            }`}
          />
        </div>

        {errors.username && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle size={13} />
            {errors.username}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-300"
          >
            Password
          </label>
        </div>

        <div className="relative">
          <div
            className={`pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center justify-center ${
              passwordHasError
                ? "text-red-400"
                : "text-slate-500"
            }`}
          >
            <LockKeyhole size={18} />
          </div>

          <input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);

              if (errors.password) {
                setErrors((previous) => ({
                  ...previous,
                  password: "",
                }));
              }

              if (loginError) {
                setLoginError("");
              }
            }}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isLoading}
            className={`w-full rounded-xl border bg-slate-800/80 py-3.5 pl-11 pr-12 text-sm text-white outline-none transition-all duration-200 placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-60 ${
              passwordHasError
                ? "border-red-500/70 focus:border-red-500 focus:ring-4 focus:ring-red-500/10"
                : "border-slate-700 hover:border-slate-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
            }`}
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword((previous) => !previous)
            }
            disabled={isLoading}
            className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-all hover:bg-slate-700 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={
              showPassword ? "Hide password" : "Show password"
            }
          >
            {showPassword ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        </div>

        {errors.password && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
            <AlertCircle size={13} />
            {errors.password}
          </p>
        )}
      </div>

      {/* Login Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-950/20 transition-all duration-200 hover:bg-emerald-500 hover:shadow-emerald-900/30 active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-emerald-600"
      >
        {isLoading ? (
          <>
            <Loader2
              size={18}
              className="animate-spin"
            />
            <span>Logging in...</span>
          </>
        ) : (
          <>
            <span>Login to Dashboard</span>
          </>
        )}
      </button>
    </form>
  );
}

export default LoginForm;