import { getToken } from "./auth.js";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (response.status === 204) {
    return null;
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    // Response had no JSON body (e.g. a network-level failure).
  }

  if (!response.ok) {
    const message = body?.detail || "Something went wrong. Try again.";
    throw new ApiError(typeof message === "string" ? message : "Something went wrong. Try again.", response.status);
  }

  return body;
}

/** Same as `request`, but attaches the current session's bearer token. */
function authRequest(path, options = {}) {
  const token = getToken();
  return request(path, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

function authGet(path) {
  return authRequest(path, { method: "GET" });
}

function authPost(path, data) {
  return authRequest(path, {
    method: "POST",
    body: data !== undefined ? JSON.stringify(data) : undefined,
  });
}

function authPatch(path, data) {
  return authRequest(path, { method: "PATCH", body: JSON.stringify(data) });
}

function authDelete(path) {
  return authRequest(path, { method: "DELETE" });
}

// ── Auth ──────────────────────────────────────────────────────────────────

export function login({ email, password, role }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password, role }),
  });
}

export function getCurrentUser() {
  return authGet("/auth/me");
}

export function logout() {
  // Stateless JWTs — nothing to invalidate server-side. Kept for API
  // parity in case a token-blocklist endpoint is added later.
  return Promise.resolve();
}

export function forgotPassword(email) {
  return request("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPassword({ token, newPassword }) {
  return request("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

// ── Dashboard / Reports ──────────────────────────────────────────────────

export function getDashboardKpis() {
  return authGet("/dashboard/kpis");
}

export function getFleetAnalytics() {
  return authGet("/dashboard/analytics/fleet");
}

export function getSafetyAnalytics() {
  return authGet("/dashboard/analytics/safety");
}

export function getFinanceAnalytics() {
  return authGet("/dashboard/analytics/finance");
}

export function getVehicleOperationalCost(vehicleId) {
  return authGet(`/dashboard/vehicles/${vehicleId}/operational-cost`);
}

export function getVehicleRoi(vehicleId) {
  return authGet(`/dashboard/vehicles/${vehicleId}/roi`);
}

export function getVehicleFuelEfficiency(vehicleId) {
  return authGet(`/dashboard/vehicles/${vehicleId}/fuel-efficiency`);
}

// ── Vehicles ──────────────────────────────────────────────────────────────

export function listVehicles() {
  return authGet("/vehicles/");
}

export function getVehicle(id) {
  return authGet(`/vehicles/${id}`);
}

export function createVehicle(data) {
  return authPost("/vehicles/", data);
}

export function updateVehicle(id, data) {
  return authPatch(`/vehicles/${id}`, data);
}

export function deleteVehicle(id) {
  return authDelete(`/vehicles/${id}`);
}

// ── Drivers ───────────────────────────────────────────────────────────────

export function listDrivers() {
  return authGet("/drivers/");
}

export function getDriver(id) {
  return authGet(`/drivers/${id}`);
}

export function createDriver(data) {
  return authPost("/drivers/", data);
}

export function updateDriver(id, data) {
  return authPatch(`/drivers/${id}`, data);
}

export function deleteDriver(id) {
  return authDelete(`/drivers/${id}`);
}

// ── Trips ─────────────────────────────────────────────────────────────────

export function listTrips() {
  return authGet("/trips/");
}

export function getTrip(id) {
  return authGet(`/trips/${id}`);
}

export function createTrip(data) {
  return authPost("/trips/", data);
}

export function dispatchTrip(id) {
  return authPost(`/trips/${id}/dispatch`);
}

export function completeTrip(id, data) {
  return authPost(`/trips/${id}/complete`, data);
}

export function cancelTrip(id) {
  return authPost(`/trips/${id}/cancel`);
}

// ── Maintenance ───────────────────────────────────────────────────────────

export function listMaintenanceLogs() {
  return authGet("/maintenance/");
}

export function getMaintenanceLog(id) {
  return authGet(`/maintenance/${id}`);
}

export function createMaintenanceLog(data) {
  return authPost("/maintenance/", data);
}

export function updateMaintenanceLog(id, data) {
  return authPatch(`/maintenance/${id}`, data);
}

export function closeMaintenanceLog(id) {
  return authPost(`/maintenance/${id}/close`);
}

// ── Fuel logs ─────────────────────────────────────────────────────────────

export function listFuelLogs() {
  return authGet("/fuel-logs/");
}

export function createFuelLog(data) {
  return authPost("/fuel-logs/", data);
}

export function deleteFuelLog(id) {
  return authDelete(`/fuel-logs/${id}`);
}

// ── Expenses ──────────────────────────────────────────────────────────────

export function listExpenses() {
  return authGet("/expenses/");
}

export function createExpense(data) {
  return authPost("/expenses/", data);
}

export function deleteExpense(id) {
  return authDelete(`/expenses/${id}`);
}

export { ApiError, API_BASE_URL };