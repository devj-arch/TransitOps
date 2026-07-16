import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  IconTruck,
  IconDashboard,
  IconUser,
  IconMap,
  IconWrench,
  IconFuel,
  IconChart,
  IconLogOut,
  IconMenu,
  IconX,
  IconSettings,
} from "./Icons.jsx";
import { logout } from "../lib/api.js";
import { clearSession, getStoredUser } from "../lib/auth.js";
import { ROLES } from "../lib/roles.js";

const ALL_NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: IconDashboard, roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST] },
  { label: "Vehicle Registry", to: "/vehicles", icon: IconTruck, roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST] },
  { label: "Drivers", to: "/drivers", icon: IconUser, roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER, ROLES.SAFETY_OFFICER] },
  { label: "Trips", to: "/trips", icon: IconMap, roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST] },
  { label: "Maintenance", to: "/maintenance", icon: IconWrench, roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST] },
  { label: "Fuel & Expenses", to: "/fuel-expenses", icon: IconFuel, roles: [ROLES.ADMIN, ROLES.FINANCIAL_ANALYST] },
  { label: "Reports", to: "/reports", icon: IconChart, roles: [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST] },
  { label: "Settings", to: "/settings", icon: IconSettings, roles: [ROLES.ADMIN] },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = getStoredUser();
  const userRole = user?.role;

  function handleLogout() {
    logout();
    clearSession();
    window.location.href = "/login";
  }

  function isActive(to) {
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  }

  function NavLinks() {
    const visibleItems = ALL_NAV_ITEMS.filter(
      (item) => !userRole || item.roles.includes(userRole)
    );

    return (
      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleItems.map(({ label, to, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-signal text-ink"
                  : "text-ink-muted hover:bg-ink-soft hover:text-ink-text"
              }`}
            >
              <Icon width="18" height="18" />
              {label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-black/10 bg-ink px-4 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-text transition hover:bg-ink-soft"
        >
          <IconMenu width="20" height="20" />
        </button>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-signal text-ink">
            <IconTruck width="16" height="16" />
          </span>
          <span className="font-display text-base font-semibold text-ink-text">TransitOps</span>
        </button>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Log out"
          className="flex h-9 w-9 items-center justify-center rounded-md text-ink-muted transition hover:bg-ink-soft hover:text-ink-text"
        >
          <IconLogOut width="18" height="18" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-ink/60 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="relative flex h-full w-64 flex-col bg-ink">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-signal text-ink">
                  <IconTruck width="18" height="18" />
                </span>
                <span className="font-display text-lg font-semibold text-ink-text">TransitOps</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted transition hover:bg-ink-soft hover:text-ink-text"
              >
                <IconX width="18" height="18" />
              </button>
            </div>
            <NavLinks />
            <SidebarFooter user={user} onLogout={handleLogout} />
          </div>
        </div>
      )}

      {/* Desktop fixed sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col bg-ink md:flex">
        <div className="flex items-center gap-2 border-b border-ink-line px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-signal text-ink">
            <IconTruck width="18" height="18" />
          </span>
          <span className="font-display text-lg font-semibold text-ink-text">TransitOps</span>
        </div>
        <NavLinks />
        <SidebarFooter user={user} onLogout={handleLogout} />
      </aside>
    </>
  );
}

function SidebarFooter({ user, onLogout }) {
  return (
    <div className="border-t border-ink-line px-3 py-4">
      {user && (
        <div className="mb-2 flex items-center gap-3 rounded-md px-3 py-2">
          <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink-soft text-ink-text">
            <IconUser width="16" height="16" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-ink-text">{user.name || user.email}</p>
            <p className="truncate text-xs text-ink-muted">{user.role}</p>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-ink-muted transition hover:bg-ink-soft hover:text-ink-text"
      >
        <IconLogOut width="18" height="18" />
        Logout
      </button>
    </div>
  );
}
