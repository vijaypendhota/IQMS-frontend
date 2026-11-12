
import React from "react";
import { useNavigate } from "react-router-dom";

import { useCurrentUser } from "../../hooks/useCurrentUser";

import "./Topbar.css";

const Topbar = () => {
  const navigate = useNavigate();

  const { user } = useCurrentUser();

  const handleLogout = () => {
    sessionStorage.removeItem("iqms_token");

    navigate("/", {
      replace: true
    });
  };

  const handleChangePassword = () => {
    navigate("/change-password");
  };

  return (
    <header className="iqms-topbar">

      <div className="topbar-title">
        <h3>
          Industrial Quality Management System
        </h3>

        <p>
          QMS • MES • ERP Integration Platform
        </p>
      </div>

      <div className="topbar-user">

        <div className="topbar-user-details">
          <strong>
            {user?.username || "User"}
          </strong>

          <span>
            {user?.role || ""}
          </span>
        </div>

        <button
          type="button"
          className="topbar-change-password"
          onClick={handleChangePassword}
        >
          Change Password
        </button>

        <button
          type="button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>
    </header>
  );
};

export default Topbar;
