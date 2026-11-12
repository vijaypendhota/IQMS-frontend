
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AddUser.css";

const AddUser = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "",
    status: "Active"
  });

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // FETCH ACTIVE ROLES FROM MONGODB
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setRolesLoading(true);
        setMessage("");

        const token = sessionStorage.getItem("iqms_token");

        const response = await fetch(
          "http://localhost:1700/api/roles",
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.msg || "Failed to load roles"
          );
        }

        const activeRoles = (data.roles || []).filter(
          (role) => role.status === "Active"
        );

        setRoles(activeRoles);

        // Set a default only if it is available.
        const defaultRole = activeRoles.find(
          (role) => role.roleName === "QualityInspector"
        );

        if (defaultRole) {
          setFormData((prev) => ({
            ...prev,
            role: prev.role || defaultRole.roleName
          }));
        }

      } catch (error) {
        setMessage(error.message);
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");

    if (!formData.role) {
      setMessage("Please select a role");
      return;
    }

    setLoading(true);

    try {
      const token = sessionStorage.getItem("iqms_token");

      const response = await fetch(
        "http://localhost:1700/api/user/add-user",
        {
          method: "POST",
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
          data.msg || "Failed to create user"
        );
      }

      navigate("/users");

    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-user-page">
      <form
        className="add-user-form"
        onSubmit={handleSubmit}
      >
        <h2>Add New User</h2>

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

        <label>Temporary Password</label>
        <input
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          minLength={8}
          required
        />

        <label>Role</label>
        <select
          name="role"
          value={formData.role}
          onChange={handleChange}
          disabled={rolesLoading || roles.length === 0}
          required
        >
          <option value="">
            {rolesLoading
              ? "Loading roles..."
              : "Select Role"}
          </option>

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

        {message && (
          <p className="add-user-error">
            {message}
          </p>
        )}

        <div className="add-user-actions">
          <button
            type="button"
            onClick={() => navigate("/users")}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={
              loading ||
              rolesLoading ||
              roles.length === 0 ||
              !formData.role
            }
          >
            {loading ? "Saving..." : "Save User"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddUser;
