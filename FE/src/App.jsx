import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import AccessDenied from "./pages/AccessDenied.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import VehicleRegistry from "./pages/VehicleRegistry.jsx";
import DriverManagement from "./pages/DriverManagement.jsx";
import TripDispatcher from "./pages/TripDispatcher.jsx";
import MaintenanceLog from "./pages/MaintenanceLog.jsx";
import FuelExpenseManagement from "./pages/FuelExpenseManagement.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import { ROLES } from "./lib/roles.js";

const ALL = [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST];
const NO_FINANCE = [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.DISPATCHER, ROLES.SAFETY_OFFICER];
const NO_DISPATCH = [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST];
const FINANCE_ONLY = [ROLES.ADMIN, ROLES.FINANCIAL_ANALYST];
const REPORTS_ROLES = [ROLES.ADMIN, ROLES.FLEET_MANAGER, ROLES.SAFETY_OFFICER, ROLES.FINANCIAL_ANALYST];

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/access-denied" element={<AccessDenied />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={ALL} />}>
        <Route path="/vehicles" element={<VehicleRegistry />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={NO_FINANCE} />}>
        <Route path="/drivers" element={<DriverManagement />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={ALL} />}>
        <Route path="/trips" element={<TripDispatcher />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={NO_DISPATCH} />}>
        <Route path="/maintenance" element={<MaintenanceLog />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={FINANCE_ONLY} />}>
        <Route path="/fuel-expenses" element={<FuelExpenseManagement />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={REPORTS_ROLES} />}>
        <Route path="/reports" element={<Reports />} />
      </Route>

      <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
        <Route path="/settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
