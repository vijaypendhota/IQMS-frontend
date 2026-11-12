
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./EditUser.css";

const EditUser = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "",
    status: "Active"
  });

  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // FETCH USER AND ROLE MASTER
  useEffect(() => {
    const fetchUserAndRoles = async () => {
      try {
        setLoading(true);
        setError("");

        const token = sessionStorage.getItem("iqms_token");

        const headers = {
          Authorization: `Bearer ${token}`
        };

        const [userResponse, rolesResponse] =
          await Promise.all([
            fetch(
              "http://localhost:1700/api/user/get-users",
              { headers }
            ),
            fetch(
              "http://localhost:1700/api/roles",
              { headers }
            )
          ]);

        const [userData, rolesData] =
          await Promise.all([
            userResponse.json(),
            rolesResponse.json()
          ]);

        if (!userResponse.ok) {
          throw new Error(
            userData.msg || "Failed to load users"
          );
        }

        if (!rolesResponse.ok) {
          throw new Error(
            rolesData.msg || "Failed to load roles"
          );
        }

        const selectedUser = (
          userData.getDetails || []
        ).find((user) => user._id === id);

        if (!selectedUser) {
          throw new Error("User not found");
        }

        setRoles(
          (rolesData.roles || []).filter(
            (role) => role.status === "Active"
          )
        );

        setFormData({
          username: selectedUser.username || "",
          email: selectedUser.email || "",
          role: selectedUser.role || "",
          status: selectedUser.status || "Active"
        });

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndRoles();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");

    try {
      const selectedRole = roles.find(
        (role) => role.roleName === formData.role
      );

      if (!selectedRole) {
        throw new Error(
          "Please select an active role"
        );
      }

      const token = sessionStorage.getItem("iqms_token");

      const response = await fetch(
        `http://localhost:1700/api/user/update-user/${id}`,
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
          data.msg || "Update failed"
        );
      }

      navigate("/users");

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-user-page">
        <p>Loading user details and roles...</p>
      </div>
    );
  }

  return (
    <div className="edit-user-page">
      <form
        className="edit-user-form"
        onSubmit={handleSubmit}
      >
        <h2>Edit User</h2>

        {error && (
          <p className="edit-user-error">
            {error}
          </p>
        )}

        <label>Username</label>
        <input
          name="username"
          value={formData.username}
          onChange={handleChange}
          required
        />

        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          required
        />

        <label>Role</label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          required
        >
          <option value="">Select Role</option>

          {formData.role &&
            !roles.some(
              (role) =>
                role.roleName === formData.role
            ) && (
              <option
                value={formData.role}
                disabled
              >
                {formData.role} (Inactive or unavailable)
              </option>
            )}

          {roles.map((role) => (
            <option
              key={role._id}
              value={role.roleName}
            >
              {role.roleName}
            </option>
          ))}
        </select>

        <label>Status</label>
        <select
          name="status"
          value={formData.status}
          onChange={handleChange}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        <div className="edit-user-actions">
          <button
            type="button"
            onClick={() => navigate("/users")}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              saving ||
              roles.length === 0 ||
              !roles.some(
                (role) =>
                  role.roleName === formData.role
              )
            }
          >
            {saving
              ? "Updating..."
              : "Update User"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditUser;
