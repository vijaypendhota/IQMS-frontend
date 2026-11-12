import React from "react";
import "./Dashboard.css";
import { useCurrentUser } from "../../hooks/useCurrentUser";

const Dashboard = () => {

  const { user, loading, error } = useCurrentUser();

  const handleLogout = () => {
    sessionStorage.removeItem("iqms_token");
    window.location.href = "/";
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-card">
        <h1>Industrial Quality Management System</h1>
        <h2>Welcome to IQMS Dashboard</h2>

        <p>You have successfully logged in.</p>

        {loading && <p>Loading user profile...</p>}

{error && <p>{error}</p>}

{user && (
  <div className="profile-info">
    <h3>Logged-in User Details</h3>

    <p>Username: {user.username}</p>
    <p>Email: {user.email}</p>
    <p>Role: {user.role}</p>

    <h4>My Permissions</h4>

    <ul>
      {user.permissions.map((permission) => (
        <li key={permission}>{permission}</li>
      ))}
    </ul>
  </div>
)}

        <button onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;