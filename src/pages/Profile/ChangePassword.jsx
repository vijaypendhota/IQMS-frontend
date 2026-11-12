

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ChangePassword.css";

const ChangePassword = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (formData.newPassword.length < 8) {
      setError(
        "New password must contain at least 8 characters"
      );
      return;
    }

    if (
      formData.newPassword !==
      formData.confirmPassword
    ) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem(
        "iqms_token"
      );

      const response = await fetch(
        "http://localhost:1700/api/user/change-password",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.msg || "Failed to change password"
        );
      }

      sessionStorage.removeItem("iqms_token");

      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });

      setSuccess(
        "Password changed successfully. Please log in again."
      );

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-page">
      <form
        className="change-password-form"
        onSubmit={handleSubmit}
      >
        <h2>Change Password</h2>

        <p className="change-password-description">
          Update your IQMS account password.
        </p>

        {error && (
          <p className="change-password-error">
            {error}
          </p>
        )}

        {success && (
          <div className="change-password-success">
            <p>{success}</p>
            <button
              type="button"
              onClick={() =>
                navigate("/", { replace: true })
              }
            >
              Go to Login
            </button>
          </div>
        )}

        {!success && (
          <>
            <label>Current Password</label>
            <input
              type={showPasswords ? "text" : "password"}
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              autoComplete="current-password"
              required
            />

            <label>New Password</label>
            <input
              type={showPasswords ? "text" : "password"}
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <label>Confirm New Password</label>
            <input
              type={showPasswords ? "text" : "password"}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={8}
              required
            />

            <label className="password-visibility">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(e) =>
                  setShowPasswords(e.target.checked)
                }
              />
              Show passwords
            </label>

            <div className="change-password-actions">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "Updating..."
                  : "Change Password"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};

export default ChangePassword;
