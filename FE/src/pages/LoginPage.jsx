import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import RouteMap from "../components/RouteMap.jsx";
import {
  IconMail,
  IconLock,
  IconEye,
  IconEyeOff,
  IconChevronDown,
  IconAlert,
  IconTruck,
  IconMap,
  IconShield,
  IconWallet,
  IconSettings,
} from "../components/Icons.jsx";
import { login, ApiError } from "../lib/api.js";
import { setSession } from "../lib/auth.js";
import { connectWebSocket } from "../lib/websocket.js";

const ROLES = [
  {
    value: "Admin",
    description: "Full system access and settings management.",
    Icon: IconSettings,
  },
  {
    value: "Fleet Manager",
    description: "Oversees fleet assets, maintenance, and vehicle lifecycle.",
    Icon: IconTruck,
  },
  {
    value: "Dispatcher",
    description: "Creates trips and assigns vehicles and drivers.",
    Icon: IconMap,
  },
  {
    value: "Safety Officer",
    description: "Tracks license validity and driver safety scores.",
    Icon: IconShield,
  },
  {
    value: "Financial Analyst",
    description: "Reviews fuel, maintenance, and operating cost.",
    Icon: IconWallet,
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [signedInAs, setSignedInAs] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!role) {
      setError("Select the role you sign in as.");
      return;
    }

    setLoading(true);
    try {
      const result = await login({ email, password, role });
      setSession({ token: result.access_token, user: result.user, remember });
      connectWebSocket();
      setSignedInAs(result.user);

      setTimeout(() => navigate("/", { replace: true }), 700);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-paper">
      <aside className="relative md:w-[46%] bg-ink text-ink-text px-8 py-10 md:px-14 md:py-14 flex flex-col justify-between overflow-hidden">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-signal text-ink">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h13l3 4v6h-3" />
              <path d="M4 6v10h2" />
              <circle cx="8" cy="17" r="1.8" />
              <circle cx="16.5" cy="17" r="1.8" />
            </svg>
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">TransitOps</span>
        </div>

        <div className="mt-10 md:mt-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-4">
            Fleet operations console
          </p>
          <h1 className="font-display text-3xl md:text-[2.15rem] leading-[1.15] font-medium max-w-sm">
            Every vehicle, every driver, one console.
          </h1>
          <p className="mt-3 text-sm text-ink-muted max-w-xs leading-relaxed">
            Dispatch, maintenance, and cost tracking for your fleet, in one place instead of a spreadsheet.
          </p>

          <div className="mt-10 hidden md:block">
            <RouteMap />
          </div>
        </div>

        <div className="mt-10 md:mt-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted mb-3">
            One login, role-based access
          </p>
          <ul className="space-y-2.5">
            {ROLES.map(({ value, description, Icon }) => (
              <li key={value} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-sm border border-ink-line text-signal">
                  <Icon />
                </span>
                <span className="text-sm">
                  <span className="text-ink-text font-medium">{value}</span>
                  <span className="text-ink-muted"> — {description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-10 font-mono text-[11px] text-ink-muted tracking-wide">
          TRANSITOPS · SMART TRANSPORT OPS · © 2026
        </p>
      </aside>

      <main className="flex-1 flex items-center justify-center px-6 py-12 md:py-10">
        <div className="w-full max-w-sm">
          {signedInAs ? (
            <div className="text-center" role="status">
              <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-transit-soft text-transit">
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </span>
              <h1 className="font-display text-xl font-medium text-text">Signed in</h1>
              <p className="mt-2 text-sm text-muted">
                Welcome back, {signedInAs.name.split(" ")[0]}. Redirecting you to the {signedInAs.role} dashboard...
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-medium text-text">Sign in to your console</h1>
              <p className="mt-2 text-sm text-muted">Enter your credentials to continue.</p>

              {error && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mt-6 flex items-start gap-2.5 rounded-md border border-alert/25 bg-alert-soft px-3.5 py-3 text-sm text-alert"
                >
                  <span className="mt-0.5 flex-none">
                    <IconAlert />
                  </span>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text mb-1.5">
                    Work email
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                      <IconMail />
                    </span>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@fleetco.com"
                      className="w-full rounded-md border border-black/10 bg-white pl-10 pr-3 py-2.5 text-sm text-text placeholder:text-muted/70 outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-text">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-sm text-signal-dark hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
                      <IconLock />
                    </span>
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full rounded-md border border-black/10 bg-white pl-10 pr-10 py-2.5 text-sm text-text placeholder:text-muted/70 outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text"
                    >
                      {showPassword ? <IconEyeOff /> : <IconEye />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-text mb-1.5">
                    Sign in as
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      required
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full appearance-none rounded-md border border-black/10 bg-white pl-3 pr-9 py-2.5 text-sm text-text outline-none transition focus:border-signal focus:ring-2 focus:ring-signal/20"
                    >
                      <option value="" disabled>
                        Select your role
                      </option>
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.value}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted">
                      <IconChevronDown />
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-muted">Must match the role on your account.</p>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label htmlFor="remember" className="flex items-center gap-2 text-sm text-muted cursor-pointer">
                    <input
                      id="remember"
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      style={{ accentColor: "var(--color-signal)" }}
                      className="h-4 w-4 rounded"
                    />
                    Keep me signed in
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-signal py-2.5 text-sm font-semibold text-ink transition hover:bg-signal-dark disabled:cursor-not-allowed disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && (
                    <span
                      aria-hidden="true"
                      className="h-3.5 w-3.5 rounded-full border-2 border-ink/30 border-t-ink animate-spin"
                    />
                  )}
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-muted">
                Need access? Contact your fleet administrator.
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}