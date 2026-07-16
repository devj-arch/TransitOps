import { Navigate, Outlet } from "react-router-dom";
import { getToken, getStoredUser } from "../lib/auth.js";

export default function ProtectedRoute({ allowedRoles }) {
  const token = getToken();
  const user = getStoredUser();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/access-denied" replace />;
    }
  }

  return <Outlet />;
}
