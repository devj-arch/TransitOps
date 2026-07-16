export const ROLES = {
  ADMIN: "Admin",
  FLEET_MANAGER: "Fleet Manager",
  DISPATCHER: "Dispatcher",
  SAFETY_OFFICER: "Safety Officer",
  FINANCIAL_ANALYST: "Financial Analyst",
};

export const ALL_ROLES = [
  ROLES.ADMIN,
  ROLES.FLEET_MANAGER,
  ROLES.DISPATCHER,
  ROLES.SAFETY_OFFICER,
  ROLES.FINANCIAL_ANALYST,
];

/** Admin is always allowed, mirroring the backend's `require_roles` override. */
export function canAccess(user, allowedRoles) {
  if (!user) return false;
  if (user.role === ROLES.ADMIN) return true;
  return allowedRoles.includes(user.role);
}