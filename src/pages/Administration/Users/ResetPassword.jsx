

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./ResetPassword.css";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [user, setUser] = useState(null);
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const loadUser = async () => {
      try {
        setLoading(true);

        const token = sessionStorage.getItem("iqms_token");

        const response = await fetch(
          "http://localhost:1700/api/user/get-users",
          {
            headers: {
              Authorization: `Bearer ${token}`
            },
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.msg || "Unable to load user");
        }

        const selectedUser = (data.getDetails || []).find(
          (item) => item._id === id
        );

        if (!selectedUser) {
          throw new Error("User not found");
        }

        setUser(selectedUser);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadUser();

    return () => controller.abort();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (temporaryPassword.length < 8 || temporaryPassword.length > 72) {
      setError("Temporary password must contain 8-72 characters");
      return;
    }

    if (temporaryPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);

    try {
      const token = sessionStorage.getItem("iqms_token");

      const response = await fetch(
        `http://localhost:1700/api/user/reset-password/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            temporaryPassword,
            confirmPassword
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Password reset failed");
      }

      setTemporaryPassword("");
      setConfirmPassword("");
      setSuccess(data.msg || "Password reset successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <h2>Reset User Password</h2>
        <p className="reset-password-description">
          Assign a temporary password. The user must change it after login.
        </p>

        {loading && <p>Loading user...</p>}
        {error && <p className="reset-password-error">{error}</p>}
        {success && (
          <p className="reset-password-success">{success}</p>
        )}

        {!loading && user && (
          <>
            <div className="reset-password-user">
              <strong>{user.username}</strong>
              <span>{user.email}</span>
              <span>Role: {user.role}</span>
            </div>

            {!success && (
              <form onSubmit={handleSubmit}>
                <label>Temporary Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={temporaryPassword}
                  onChange={(e) => setTemporaryPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  required
                />

                <label>Confirm Temporary Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />

                <label className="reset-password-show">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                  />
                  Show passwords
                </label>

                <div className="reset-password-actions">
                  <button
                    type="button"
                    onClick={() => navigate("/users")}
                  >
                    Cancel
                  </button>

                  <button type="submit" disabled={saving}>
                    {saving ? "Resetting..." : "Reset Password"}
                  </button>
                </div>
              </form>
            )}

            {success && (
              <button
                className="reset-password-back"
                onClick={() => navigate("/users")}
              >
                Back to Users
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
