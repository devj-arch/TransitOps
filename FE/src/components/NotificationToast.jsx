import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  IconX,
  IconTruck,
  IconMap,
  IconUser,
  IconWrench,
  IconFuel,
  IconShield,
} from "./Icons.jsx";
import { onWebSocketEvent } from "../lib/websocket.js";

// ── Style map using CSS variables directly (Tailwind v4 safe) ───────────
// Dynamic class strings like `${t.style.bg}` are never seen by the Tailwind
// scanner, so they get purged. Inline styles referencing CSS vars always work.
const EVENT_STYLE = {
  // Green — completions / returns to available
  trip_completed: {
    border: "var(--color-transit)",
    bg: "var(--color-transit-soft)",
    color: "var(--color-transit)",
    Icon: IconMap,
  },
  maintenance_closed: {
    border: "var(--color-transit)",
    bg: "var(--color-transit-soft)",
    color: "var(--color-transit)",
    Icon: IconWrench,
  },
  vehicle_available: {
    border: "var(--color-transit)",
    bg: "var(--color-transit-soft)",
    color: "var(--color-transit)",
    Icon: IconTruck,
  },

  // Amber — creations / dispatches / general info
  trip_created: {
    border: "var(--color-signal)",
    bg: "var(--color-signal-soft)",
    color: "var(--color-signal-dark)",
    Icon: IconMap,
  },
  trip_dispatched: {
    border: "var(--color-signal)",
    bg: "var(--color-signal-soft)",
    color: "var(--color-signal-dark)",
    Icon: IconMap,
  },
  trip_status_changed: {
    border: "var(--color-signal)",
    bg: "var(--color-signal-soft)",
    color: "var(--color-signal-dark)",
    Icon: IconMap,
  },
  fuel_logged: {
    border: "var(--color-signal)",
    bg: "var(--color-signal-soft)",
    color: "var(--color-signal-dark)",
    Icon: IconFuel,
  },
  expense_logged: {
    border: "var(--color-signal)",
    bg: "var(--color-signal-soft)",
    color: "var(--color-signal-dark)",
    Icon: IconFuel,
  },
  maintenance_opened: {
    border: "var(--color-signal)",
    bg: "var(--color-signal-soft)",
    color: "var(--color-signal-dark)",
    Icon: IconWrench,
  },
  vehicle_status_changed: {
    border: "var(--color-signal)",
    bg: "var(--color-signal-soft)",
    color: "var(--color-signal-dark)",
    Icon: IconTruck,
  },
  driver_status_changed: {
    border: "var(--color-signal)",
    bg: "var(--color-signal-soft)",
    color: "var(--color-signal-dark)",
    Icon: IconUser,
  },

  // Orange — warnings (using raw hex since --color-orange isn't in your theme)
  license_expiring_soon: {
    border: "#f97316",
    bg: "#fff7ed",
    color: "#c2410c",
    Icon: IconShield,
  },
  safety_score_low: {
    border: "#f97316",
    bg: "#fff7ed",
    color: "#c2410c",
    Icon: IconShield,
  },

  // Red — critical
  license_expired: {
    border: "var(--color-alert)",
    bg: "var(--color-alert-soft)",
    color: "var(--color-alert)",
    Icon: IconShield,
  },
  driver_suspended: {
    border: "var(--color-alert)",
    bg: "var(--color-alert-soft)",
    color: "var(--color-alert)",
    Icon: IconUser,
  },
  vehicle_deleted: {
    border: "var(--color-alert)",
    bg: "var(--color-alert-soft)",
    color: "var(--color-alert)",
    Icon: IconTruck,
  },
  large_expense_alert: {
    border: "var(--color-alert)",
    bg: "var(--color-alert-soft)",
    color: "var(--color-alert)",
    Icon: IconFuel,
  },

  // Fallback
  _default: {
    border: "#d1d5db",
    bg: "#ffffff",
    color: "var(--color-text)",
    Icon: null,
  },
};

// ── Human-readable messages ────────────────────────────────────────────
function formatMessage(eventType, data) {
  switch (eventType) {
    case "trip_created":
      return `New trip created: ${data.source || "?"} → ${data.destination || "?"}`;
    case "trip_status_changed":
      return `Trip #${data.trip_id} is now ${data.new_status}`;
    case "vehicle_status_changed":
      if (data.new_status === "deleted")
        return `Vehicle #${data.vehicle_id} deleted`;
      return `${data.registration_number || `Vehicle #${data.vehicle_id}`} is now ${data.new_status}`;
    case "driver_status_changed":
      return `${data.driver_name || `Driver #${data.driver_id}`} is now ${data.new_status}`;
    case "driver_suspended":
      return `${data.driver_name} has been suspended`;
    case "maintenance_opened":
      return `Maintenance opened: ${data.description || `#${data.maintenance_id}`}`;
    case "maintenance_closed":
      return `Maintenance #${data.maintenance_id} closed`;
    case "fuel_logged":
      return `${data.liters}L of fuel logged — ₹${data.cost}`;
    case "expense_logged":
      return `Expense logged: ₹${data.amount} (${data.category})`;
    case "large_expense_alert":
      return `⚠️ Large expense: ₹${data.amount}`;
    case "license_expiring_soon":
      return `${data.driver_name}'s license expires in ${data.days_left} days`;
    case "license_expired":
      return `${data.driver_name}'s license has expired`;
    case "safety_score_low":
      return `${data.driver_name}'s safety score dropped to ${data.score}`;
    default:
      return `${eventType}: ${JSON.stringify(data)}`;
  }
}

// ── Context so any component can trigger a manual toast ────────────────
const ToastContext = createContext(null);
export function useToast() {
  return useContext(ToastContext);
}

// ── Toast component ────────────────────────────────────────────────────
let _id = 0;

export default function NotificationToast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((eventType, data) => {
    const id = ++_id;
    const style = EVENT_STYLE[eventType] ?? EVENT_STYLE._default;
    const message = formatMessage(eventType, data);

    setToasts((prev) => [...prev, { id, message, style }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      5000,
    );
  }, []);

  useEffect(() => onWebSocketEvent(addToast), [addToast]);

  const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={addToast}>
      {/* Keyframe lives here so it's always injected regardless of toast count */}
      <style>{`
        @keyframes _toast-in {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        ._toast { animation: _toast-in 0.25s ease-out; }
      `}</style>

      <div
        style={{
          position: "fixed",
          bottom: "1rem",
          right: "1rem",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column-reverse",
          gap: "0.5rem",
          width: "20rem",
          maxWidth: "calc(100vw - 2rem)",
        }}
      >
        {toasts.map(({ id, message, style }) => {
          const Icon = style.Icon;
          return (
            <div
              key={id}
              className="_toast"
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.75rem 0.875rem",
                borderRadius: "0.5rem",
                border: `1px solid ${style.border}`,
                background: style.bg,
                boxShadow: "0 4px 12px rgba(0,0,0,0.10)",
              }}
            >
              {Icon && (
                <Icon
                  width="18"
                  height="18"
                  style={{
                    color: style.color,
                    flexShrink: 0,
                    marginTop: "1px",
                  }}
                />
              )}
              <p
                style={{
                  flex: 1,
                  margin: 0,
                  fontSize: "0.875rem",
                  lineHeight: 1.45,
                  color: style.color,
                  fontFamily: "var(--font-sans)",
                }}
              >
                {message}
              </p>
              <button
                onClick={() => dismiss(id)}
                style={{
                  flexShrink: 0,
                  background: "none",
                  border: "none",
                  padding: "2px",
                  cursor: "pointer",
                  borderRadius: "4px",
                  color: style.color,
                  opacity: 0.6,
                  marginTop: "-2px",
                  marginRight: "-2px",
                }}
              >
                <IconX width="14" height="14" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
