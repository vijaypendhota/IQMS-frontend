import { useCallback, useEffect, useState } from "react";
import "./Roles.css";

const API_URL = "http://localhost:1700/api/roles";

// All permission groups must match backend Config/permissions.js
const PERMISSION_GROUPS = {
  "User Management": [
    "user.view",
    "user.create",
    "user.update"
  ],

  "Quality Orders": [
    "qualityOrder.view",
    "qualityOrder.create",
    "qualityOrder.update",
    "qualityOrder.approve"
  ],

  "Inspections": [
    "inspection.view",
    "inspection.create"
  ],

  "Item Master": [
    "item.view",
    "item.create",
    "item.update"
  ],

  "Quality Characteristics": [
    "qualityCharacteristic.view",
    "qualityCharacteristic.create",
    "qualityCharacteristic.update"
  ],

  "Item Specifications": [
    "itemSpecification.view",
    "itemSpecification.create",
    "itemSpecification.update"
  ],

  // NEW: ITEM SAMPLING
  "Item Sampling": [
    "itemSampling.view",
    "itemSampling.create",
    "itemSampling.update"
  ],

  "Test Instrument Master": [
    "testInstrument.view",
    "testInstrument.create",
    "testInstrument.update"
  ],

  "Calibration Records": [
    "calibration.view",
    "calibration.create",
    "calibration.update",
    "calibration.approve"
  ],

  "Production": [
    "production.view"
  ],

  "Inventory": [
    "inventory.view"
  ],

  "Asset Management": [
    "asset.view"
  ],

  "Companies": [
    "company.view",
    "company.create",
    "company.update"
  ],

  "Plants": [
    "plant.view",
    "plant.create",
    "plant.update"
  ],

  "Departments": [
    "department.view",
    "department.create",
    "department.update"
  ]
};

const ALL_PERMISSIONS = [
  ...new Set(Object.values(PERMISSION_GROUPS).flat())
];

const emptyForm = {
  roleName: "",
  description: "",
  permissions: [],
  status: "Active"
};

const Roles = () => {
  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // ==========================================
  // FETCH ROLES
  // ==========================================

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = sessionStorage.getItem("iqms_token");

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.msg ||
          data.message ||
          "Failed to fetch roles"
        );
      }

      setRoles(data.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  // ==========================================
  // SUCCESS MESSAGE
  // ==========================================

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  // ==========================================
  // FORM INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // ==========================================
  // PERMISSION CHECKBOX CHANGE
  // ==========================================

  const handlePermissionChange = (permission) => {
    setFormData((previous) => {
      const selected =
        previous.permissions.includes(permission);

      return {
        ...previous,
        permissions: selected
          ? previous.permissions.filter(
              (item) => item !== permission
            )
          : [...previous.permissions, permission]
      };
    });
  };

  // ==========================================
  // SELECT ALL PERMISSIONS
  // ==========================================

  const handleSelectAll = (checked) => {
    setFormData((previous) => ({
      ...previous,
      permissions: checked
        ? [
            ...new Set([
              ...previous.permissions,
              ...ALL_PERMISSIONS
            ])
          ]
        : previous.permissions.filter(
            (permission) =>
              !ALL_PERMISSIONS.includes(permission)
          )
    }));
  };

  // ==========================================
  // EDIT ROLE
  // ==========================================

  const handleEdit = (role) => {
    setEditingId(role._id);

    setFormData({
      roleName: role.roleName,
      description: role.description || "",
      permissions: [...(role.permissions || [])],
      status: role.status || "Active"
    });

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };

  // ==========================================
  // CANCEL EDIT
  // ==========================================

  const handleCancel = () => {
    setEditingId(null);

    setFormData({
      ...emptyForm,
      permissions: []
    });

    setError("");
    setMessage("");
  };

  // ==========================================
  // CREATE / UPDATE ROLE
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token = sessionStorage.getItem("iqms_token");

      const response = await fetch(
        editingId
          ? `${API_URL}/${editingId}`
          : API_URL,
        {
          method: editingId ? "PUT" : "POST",
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
          data.msg ||
          data.message ||
          "Failed to save role"
        );
      }

      setMessage(
        editingId
          ? "Role updated successfully"
          : "Role created successfully"
      );

      setEditingId(null);

      setFormData({
        ...emptyForm,
        permissions: []
      });

      await fetchRoles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // ADMIN ROLE PROTECTION
  // ==========================================

  const isAdminRole =
    Boolean(editingId) &&
    formData.roleName === "Admin";

  const allSelected = ALL_PERMISSIONS.every(
    (permission) =>
      formData.permissions.includes(permission)
  );

  // ==========================================
  // JSX
  // ==========================================

  return (
    <div className="roles-page">

      <div className="roles-header">
        <h1>Roles & Permissions</h1>

        <p>
          Manage application roles and their permissions.
        </p>
      </div>

      {/* ======================================
          ROLE FORM
      ====================================== */}

      <div className="roles-card">
        <h2>
          {editingId ? "Edit Role" : "Add Role"}
        </h2>

        {error && (
          <div className="roles-error">
            {error}
          </div>
        )}

        {message && (
          <div className="roles-success">
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <div className="roles-form-grid">

            <div className="roles-field">
              <label>Role Name *</label>

              <input
                type="text"
                name="roleName"
                value={formData.roleName}
                onChange={handleChange}
                readOnly={Boolean(editingId)}
                required
              />
            </div>

            <div className="roles-field">
              <label>Status</label>

              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                disabled={isAdminRole}
              >
                <option value="Active">
                  Active
                </option>

                <option value="Inactive">
                  Inactive
                </option>
              </select>
            </div>

            <div className="roles-field roles-wide">
              <label>Description</label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
              />
            </div>

          </div>

          {/* ======================================
              PERMISSIONS
          ====================================== */}

          <div className="roles-permissions-header">
            <h3>Assign Permissions</h3>

            {!isAdminRole && (
              <label className="roles-check-label">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) =>
                    handleSelectAll(e.target.checked)
                  }
                />
                Select All
              </label>
            )}
          </div>

          <div className="roles-permission-grid">
            {Object.entries(PERMISSION_GROUPS).map(
              ([group, permissions]) => (
                <div
                  className="roles-permission-group"
                  key={group}
                >
                  <h4>{group}</h4>

                  {permissions.map((permission) => (
                    <label
                      className="roles-check-label"
                      key={permission}
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(
                          permission
                        )}
                        disabled={isAdminRole}
                        onChange={() =>
                          handlePermissionChange(permission)
                        }
                      />

                      {permission}
                    </label>
                  ))}
                </div>
              )
            )}
          </div>

          {/* ======================================
              FORM ACTIONS
          ====================================== */}

          <div className="roles-form-actions">
            <button
              type="submit"
              disabled={saving}
              className="roles-save-btn"
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Role"
                  : "Save Role"}
            </button>

            {editingId && (
              <button
                type="button"
                className="roles-cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            )}
          </div>

        </form>
      </div>

      {/* ======================================
          ROLE LIST
      ====================================== */}

      <div className="roles-card">
        <h2>Role List</h2>

        {loading ? (
          <p>Loading roles...</p>
        ) : (
          <div className="roles-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Role Name</th>
                  <th>Description</th>
                  <th>Permissions</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {roles.length === 0 ? (
                  <tr>
                    <td colSpan="6">
                      No roles found
                    </td>
                  </tr>
                ) : (
                  roles.map((role) => (
                    <tr key={role._id}>
                      <td>{role.roleName}</td>

                      <td>
                        {role.description || "-"}
                      </td>

                      <td>
                        {role.permissions?.length || 0}
                      </td>

                      <td>
                        {role.isSystemRole
                          ? "System"
                          : "Custom"}
                      </td>

                      <td>{role.status}</td>

                      <td>
                        <button
                          type="button"
                          className="roles-edit-btn"
                          onClick={() => handleEdit(role)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};

export default Roles;