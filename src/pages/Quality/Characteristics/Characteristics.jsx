
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import "./Characteristics.css";

import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { hasPermission } from "../../../utils/permissions";

const API = "http://localhost:1700/api/quality-characteristics";

const initialForm = {
  characteristicCode: "",
  characteristicName: "",
  description: "",
  characteristicType: "Numeric",
  category: "Dimensional",
  measurementUnit: "mm",
  measurementMethod: "",
  status: "Active"
};

const categories = [
  "Dimensional",
  "Mechanical",
  "Chemical",
  "Physical",
  "Visual",
  "Functional",
  "Other"
];

const Characteristics = () => {
  const { user } = useCurrentUser();

  const [characteristics, setCharacteristics] = useState([]);
  const [form, setForm] = useState({ ...initialForm });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [viewItem, setViewItem] = useState(null);
  const [statusItem, setStatusItem] = useState(null);

  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canCreate = hasPermission(
    user,
    "qualityCharacteristic.create"
  );

  const canUpdate = hasPermission(
    user,
    "qualityCharacteristic.update"
  );

  const getToken = () =>
    sessionStorage.getItem("iqms_token");

  const loadCharacteristics = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(API, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.msg || "Failed to fetch characteristics"
        );
      }

      setCharacteristics(data.characteristics || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCharacteristics();
  }, [loadCharacteristics]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpenMenuId(null);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
        setViewItem(null);
        setStatusItem(null);
      }
    };

    document.addEventListener(
      "mousedown",
      handleOutsideClick
    );

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );

      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => {
      const updated = {
        ...previous,
        [name]: value
      };

      if (name === "characteristicType") {
        updated.measurementUnit =
          value === "Numeric"
            ? previous.measurementUnit || "mm"
            : "";
      }

      return updated;
    });
  };

  const handleAdd = () => {
    setForm({ ...initialForm });
    setEditingId(null);
    setShowForm(true);
    setViewItem(null);
    setOpenMenuId(null);
    setError("");
    setMessage("");
  };

  const handleView = (item) => {
    setViewItem(item);
    setOpenMenuId(null);
  };

  const handleEdit = (item) => {
    if (!canUpdate) return;

    setForm({
      characteristicCode:
        item.characteristicCode || "",
      characteristicName:
        item.characteristicName || "",
      description: item.description || "",
      characteristicType:
        item.characteristicType || "Numeric",
      category: item.category || "Other",
      measurementUnit:
        item.measurementUnit || "",
      measurementMethod:
        item.measurementMethod || "",
      status: item.status || "Active"
    });

    setEditingId(item._id);
    setShowForm(true);
    setViewItem(null);
    setOpenMenuId(null);
    setError("");
    setMessage("");
  };

  const handleCancel = () => {
    setForm({ ...initialForm });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (editingId && !canUpdate) return;
    if (!editingId && !canCreate) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(form)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.msg || "Failed to save characteristic"
        );
      }

      setMessage(
        data.msg || "Characteristic saved successfully"
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...initialForm });

      await loadCharacteristics();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusRequest = (item) => {
    if (!canUpdate) return;

    setStatusItem(item);
    setOpenMenuId(null);
    setError("");
    setMessage("");
  };

  const handleStatusConfirm = async () => {
    if (!statusItem || !canUpdate) return;

    setSaving(true);
    setError("");

    const nextStatus =
      statusItem.status === "Active"
        ? "Inactive"
        : "Active";

    try {
      // Existing PUT endpoint expects the full record
      const payload = {
        characteristicCode:
          statusItem.characteristicCode,
        characteristicName:
          statusItem.characteristicName,
        description: statusItem.description || "",
        characteristicType:
          statusItem.characteristicType,
        category: statusItem.category,
        measurementUnit:
          statusItem.measurementUnit || "",
        measurementMethod:
          statusItem.measurementMethod || "",
        status: nextStatus
      };

      const response = await fetch(
        `${API}/${statusItem._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.msg || "Failed to update status"
        );
      }

      setMessage(
        `Characteristic ${nextStatus.toLowerCase()} successfully`
      );

      setStatusItem(null);

      await loadCharacteristics();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleMenu = (id) => {
    setOpenMenuId((previous) =>
      previous === id ? null : id
    );
  };

  const filtered = characteristics.filter((item) =>
    [
      item.characteristicCode,
      item.characteristicName,
      item.category,
      item.characteristicType
    ].some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    )
  );

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "-"
      : date.toLocaleString();
  };

  return (
    <div className="characteristics-page">
      {/* PAGE HEADER */}
      <div className="characteristics-header">
        <div>
          <h1>Quality Characteristics</h1>
          <p>
            Manage reusable inspection characteristics
            for manufacturing quality.
          </p>
        </div>

        {canCreate && !showForm && (
          <button
            type="button"
            className="qc-primary-btn"
            onClick={handleAdd}
          >
            + Add Characteristic
          </button>
        )}
      </div>

      {/* MESSAGES */}
      {message && (
        <div className="qc-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="qc-error" role="alert">
          {error}
        </div>
      )}

      {/* ADD / EDIT FORM */}
      {showForm && (
        <div className="qc-card">
          <h2>
            {editingId
              ? "Edit Characteristic"
              : "Add Characteristic"}
          </h2>

          <form onSubmit={handleSave}>
            <div className="qc-form-grid">
              <label>
                Characteristic Code *
                <input
                  name="characteristicCode"
                  value={form.characteristicCode}
                  onChange={handleChange}
                  placeholder="QC-001"
                  required
                />
              </label>

              <label>
                Characteristic Name *
                <input
                  name="characteristicName"
                  value={form.characteristicName}
                  onChange={handleChange}
                  placeholder="Outer Diameter"
                  required
                />
              </label>

              <label>
                Characteristic Type *
                <select
                  name="characteristicType"
                  value={form.characteristicType}
                  onChange={handleChange}
                >
                  <option value="Numeric">
                    Numeric
                  </option>
                  <option value="Attribute">
                    Attribute
                  </option>
                </select>
              </label>

              <label>
                Category *
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  {categories.map((category) => (
                    <option
                      key={category}
                      value={category}
                    >
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              {form.characteristicType === "Numeric" && (
                <label>
                  Measurement Unit *
                  <input
                    name="measurementUnit"
                    value={form.measurementUnit}
                    onChange={handleChange}
                    placeholder="mm"
                    required
                  />
                </label>
              )}

              <label>
                Measurement Method
                <input
                  name="measurementMethod"
                  value={form.measurementMethod}
                  onChange={handleChange}
                  placeholder="Digital Vernier Caliper"
                />
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Active">
                    Active
                  </option>
                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </label>

              <label className="qc-full-width">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Describe the characteristic"
                />
              </label>
            </div>

            <div className="qc-actions">
              <button
                type="button"
                className="qc-cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="qc-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Characteristic"
                    : "Save Characteristic"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CHARACTERISTICS TABLE */}
      <div className="qc-card">
        <div className="qc-toolbar">
          <h2>Characteristic List</h2>

          <input
            type="search"
            placeholder="Search characteristics..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="qc-table-scroll">
          <table className="qc-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Code</th>
                <th>Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>Unit</th>
                <th>Method</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    No characteristics found
                  </td>
                </tr>
              ) : (
                filtered.map((item, index) => (
                  <tr key={item._id}>
                    <td>{index + 1}</td>
                    <td>{item.characteristicCode}</td>
                    <td>{item.characteristicName}</td>
                    <td>{item.characteristicType}</td>
                    <td>{item.category}</td>
                    <td>
                      {item.measurementUnit || "-"}
                    </td>
                    <td>
                      {item.measurementMethod || "-"}
                    </td>
                    <td>
                      <span
                        className={
                          item.status === "Active"
                            ? "qc-active"
                            : "qc-inactive"
                        }
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* THREE DOT MENU */}
                    <td>
                      <div
                        className="qc-menu-wrapper"
                        ref={
                          openMenuId === item._id
                            ? menuRef
                            : null
                        }
                      >
                        <button
                          type="button"
                          className="qc-three-dot-btn"
                          aria-label={
                            `Actions for ${item.characteristicCode}`
                          }
                          aria-haspopup="menu"
                          aria-expanded={
                            openMenuId === item._id
                          }
                          onClick={() =>
                            toggleMenu(item._id)
                          }
                        >
                          &#8942;
                        </button>

                        {openMenuId === item._id && (
                          <div
                            className="qc-dropdown-menu"
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() =>
                                handleView(item)
                              }
                            >
                              <span>◉</span>
                              View Details
                            </button>

                            {canUpdate && (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() =>
                                    handleEdit(item)
                                  }
                                >
                                  <span>✎</span>
                                  Edit
                                </button>

                                <div className="qc-menu-divider" />

                                <button
                                  type="button"
                                  role="menuitem"
                                  className={
                                    item.status === "Active"
                                      ? "qc-menu-danger"
                                      : "qc-menu-success"
                                  }
                                  onClick={() =>
                                    handleStatusRequest(item)
                                  }
                                >
                                  <span>
                                    {item.status === "Active"
                                      ? "⊘"
                                      : "✓"}
                                  </span>

                                  {item.status === "Active"
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS MODAL */}
      {viewItem && (
        <div
          className="qc-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewItem(null);
            }
          }}
        >
          <div
            className="qc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qc-view-title"
          >
            <div className="qc-modal-header">
              <div>
                <h2 id="qc-view-title">
                  Characteristic Details
                </h2>
                <p>
                  {viewItem.characteristicCode}
                </p>
              </div>

              <button
                type="button"
                className="qc-modal-close"
                aria-label="Close details"
                onClick={() => setViewItem(null)}
              >
                ×
              </button>
            </div>

            <div className="qc-details-grid">
              <div>
                <span>Characteristic Code</span>
                <strong>
                  {viewItem.characteristicCode}
                </strong>
              </div>

              <div>
                <span>Characteristic Name</span>
                <strong>
                  {viewItem.characteristicName}
                </strong>
              </div>

              <div>
                <span>Type</span>
                <strong>
                  {viewItem.characteristicType}
                </strong>
              </div>

              <div>
                <span>Category</span>
                <strong>
                  {viewItem.category}
                </strong>
              </div>

              <div>
                <span>Measurement Unit</span>
                <strong>
                  {viewItem.measurementUnit || "-"}
                </strong>
              </div>

              <div>
                <span>Measurement Method</span>
                <strong>
                  {viewItem.measurementMethod || "-"}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong
                  className={
                    viewItem.status === "Active"
                      ? "qc-active"
                      : "qc-inactive"
                  }
                >
                  {viewItem.status}
                </strong>
              </div>

              <div>
                <span>Created At</span>
                <strong>
                  {formatDate(viewItem.createdAt)}
                </strong>
              </div>

              <div>
                <span>Last Updated</span>
                <strong>
                  {formatDate(viewItem.updatedAt)}
                </strong>
              </div>

              <div className="qc-detail-full">
                <span>Description</span>
                <strong>
                  {viewItem.description || "-"}
                </strong>
              </div>
            </div>

            <div className="qc-modal-footer">
              <button
                type="button"
                className="qc-cancel-btn"
                onClick={() => setViewItem(null)}
              >
                Close
              </button>

              {canUpdate && (
                <button
                  type="button"
                  className="qc-primary-btn"
                  onClick={() => handleEdit(viewItem)}
                >
                  Edit Characteristic
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ACTIVATE / DEACTIVATE CONFIRMATION */}
      {statusItem && (
        <div className="qc-modal-overlay">
          <div
            className="qc-modal qc-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qc-confirm-title"
          >
            <h2 id="qc-confirm-title">
              {statusItem.status === "Active"
                ? "Deactivate Characteristic?"
                : "Activate Characteristic?"}
            </h2>

            <p>
              Are you sure you want to{" "}
              {statusItem.status === "Active"
                ? "deactivate"
                : "activate"}{" "}
              <strong>
                {statusItem.characteristicCode} -{" "}
                {statusItem.characteristicName}
              </strong>
              ?
            </p>

            <p className="qc-confirm-note">
              Deactivation preserves existing records.
              Future inspection-plan selection should
              exclude inactive characteristics.
            </p>

            <div className="qc-modal-footer">
              <button
                type="button"
                className="qc-cancel-btn"
                onClick={() => setStatusItem(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  statusItem.status === "Active"
                    ? "qc-danger-btn"
                    : "qc-primary-btn"
                }
                onClick={handleStatusConfirm}
                disabled={saving}
              >
                {saving
                  ? "Updating..."
                  : statusItem.status === "Active"
                    ? "Deactivate"
                    : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Characteristics;
