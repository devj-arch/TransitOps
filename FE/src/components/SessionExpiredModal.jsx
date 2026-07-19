import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../lib/auth.js";
import { IconAlert } from "./Icons.jsx";

const SESSION_EXPIRED_EVENT = "session-expired";

/** Dispatch this from anywhere to trigger the modal. */
export function notifySessionExpired() {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
}

export default function SessionExpiredModal() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleExpired = useCallback(() => {
    setOpen(true);
  }, []);

  useEffect(() => {
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [handleExpired]);

  function handleConfirm() {
    clearSession();
    setOpen(false);
    navigate("/login", { replace: true });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-ink/60 backdrop-blur-[2px]" aria-hidden="true" />

      {/* Dialog */}
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label="Session expired"
        className="relative w-full max-w-sm rounded-xl border border-black/10 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-alert-soft text-alert">
            <IconAlert width="20" height="20" />
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-text">Session Expired</h2>
            <p className="mt-1 text-sm text-muted leading-relaxed">
              Your session has expired. Please sign in again to continue.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-signal px-5 py-2.5 text-sm font-semibold text-ink hover:bg-signal-dark transition"
          >
            Sign In Again
          </button>
        </div>
      </div>
    </div>
  );
}
