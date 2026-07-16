import { Link } from "react-router-dom";
import { getStoredUser } from "../lib/auth.js";
import { IconShield } from "../components/Icons.jsx";
import Sidebar from "../components/Sidebar.jsx";

export default function AccessDenied() {
  const user = getStoredUser();

  return (
    <div className="min-h-screen bg-paper">
      <Sidebar />
      <main className="md:pl-64 pt-14 md:pt-0">
        <div className="flex items-center justify-center min-h-[80vh] px-6">
          <div className="text-center max-w-md">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-alert-soft text-alert">
              <IconShield width="28" height="28" />
            </span>
            <h1 className="mt-5 font-display text-2xl font-medium text-text">Access Denied</h1>
            <p className="mt-2 text-muted leading-relaxed">
              {user
                ? `Your role "${user.role}" does not have permission to view this page.`
                : "You need to sign in to access this page."}
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Link
                to="/dashboard"
                className="rounded-md bg-signal px-5 py-2.5 text-sm font-medium text-ink hover:bg-signal-dark transition"
              >
                Go to Dashboard
              </Link>
              {user && (
                <p className="text-xs text-muted">
                  Signed in as <span className="font-medium text-text">{user.name || user.email}</span>
                  {" · "}{user.role}
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
