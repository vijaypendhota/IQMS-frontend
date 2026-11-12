
import React from "react";

import {
  Navigate,
  Outlet,
  useLocation
} from "react-router-dom";

import { useCurrentUser } from "../hooks/useCurrentUser";

import { hasPermission } from "../utils/permissions";

const ProtectedRoute = ({
  children,
  requiredPermission,
  adminOnly = false
}) => {
  const location = useLocation();

  const token = sessionStorage.getItem(
    "iqms_token"
  );

  const {
    user,
    loading,
    error
  } = useCurrentUser();

  if (!token) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div style={{ padding: "30px" }}>
        <p>Checking access permissions...</p>
      </div>
    );
  }

  if (error || !user) {
    return <Navigate to="/" replace />;
  }

  // Mandatory password change.
  if (
    user.mustChangePassword === true &&
    location.pathname !== "/change-password"
  ) {
    return (
      <Navigate
        to="/change-password"
        replace
      />
    );
  }

  if (adminOnly && user.role !== "Admin") {
    return (
      <div style={{ padding: "30px" }}>
        <h2>Access Denied</h2>
        <p>
          Only administrators can access this page.
        </p>
      </div>
    );
  }

  if (
    requiredPermission &&
    !hasPermission(user, requiredPermission)
  ) {
    return (
      <div style={{ padding: "30px" }}>
        <h2>Access Denied</h2>
        <p>
          You do not have permission to access this page.
        </p>
      </div>
    );
  }

  return children || <Outlet />;
};

export default ProtectedRoute;
