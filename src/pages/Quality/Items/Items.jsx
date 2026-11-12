
import React, { useCallback, useEffect, useRef, useState } from "react";
import "./Items.css";

import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { hasPermission } from "../../../utils/permissions";

const API = "http://localhost:1700/api/items";

const emptyForm = {
  itemCode: "",
  itemName: "",
  description: "",
  itemType: "Raw Material",
  category: "",
  uom: "PCS",
  trackingType: "None",
  plantId: "",
  status: "Active",
  sourceSystem: "IQMS",
  externalItemId: ""
};

const itemTypes = [
  "Raw Material",
  "Semi-Finished",
  "Finished Good",
  "Consumable",
  "Packaging"
];

const Items = () => {
  const { user } = useCurrentUser();

  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
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

  const canCreate = hasPermission(user, "item.create");
  const canUpdate = hasPermission(user, "item.update");

  const getToken = () =>
    sessionStorage.getItem("iqms_token");

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch(API, {
        headers: {
          Authorization: `Bearer ${getToken()}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Failed to load items");
      }

      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

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
        if (!saving) setStatusItem(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [saving]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleAdd = () => {
    if (!canCreate) return;

    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
    setOpenMenuId(null);
    setViewItem(null);
    setMessage("");
    setError("");
  };

  const handleView = (item) => {
    setViewItem(item);
    setOpenMenuId(null);
  };

  const handleEdit = (item) => {
    if (!canUpdate) return;

    setForm({
      itemCode: item.itemCode || "",
      itemName: item.itemName || "",
      description: item.description || "",
      itemType: item.itemType || "Raw Material",
      category: item.category || "",
      uom: item.uom || "PCS",
      trackingType: item.trackingType || "None",
      plantId:
        typeof item.plantId === "object"
          ? item.plantId?._id || ""
          : item.plantId || "",
      status: item.status || "Active",
      sourceSystem: item.sourceSystem || "IQMS",
      externalItemId: item.externalItemId || ""
    });

    setEditingId(item._id);
    setShowForm(true);
    setViewItem(null);
    setOpenMenuId(null);
    setMessage("");
    setError("");
  };

  const handleCancel = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (editingId ? !canUpdate : !canCreate) return;

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
          body: JSON.stringify({
            ...form,
            plantId: form.plantId || null
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Failed to save item");
      }

      setMessage(data.msg || "Item saved successfully");
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });

      await loadItems();
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
    setMessage("");
    setError("");
  };

  const handleStatusConfirm = async () => {
    if (!statusItem || !canUpdate || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    const nextStatus =
      statusItem.status === "Active"
        ? "Inactive"
        : "Active";

    try {
      // Existing PUT endpoint expects all required item fields.
      const payload = {
        itemCode: statusItem.itemCode,
        itemName: statusItem.itemName,
        description: statusItem.description || "",
        itemType: statusItem.itemType,
        category: statusItem.category,
        uom: statusItem.uom,
        trackingType: statusItem.trackingType || "None",
        plantId:
          typeof statusItem.plantId === "object"
            ? statusItem.plantId?._id || null
            : statusItem.plantId || null,
        status: nextStatus,
        sourceSystem: statusItem.sourceSystem || "IQMS",
        externalItemId: statusItem.externalItemId || ""
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
        throw new Error(data.msg || "Failed to change status");
      }

      setStatusItem(null);
      setMessage(
        `Item ${nextStatus.toLowerCase()} successfully`
      );

      await loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) =>
    [
      item.itemCode,
      item.itemName,
      item.category,
      item.itemType
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

  const displayPlant = (plantId) => {
    if (!plantId) return "Not assigned";

    if (typeof plantId === "object") {
      return (
        plantId.plantName ||
        plantId.name ||
        plantId.plantCode ||
        plantId._id ||
        "-"
      );
    }

    return plantId;
  };

  return (
    <div className="items-page">
      {/* HEADER */}
      <div className="items-header">
        <div>
          <h1>Item Master</h1>
          <p>
            Manage manufacturing items and their quality
            master data.
          </p>
        </div>

        {canCreate && !showForm && (
          <button
            type="button"
            className="items-primary-btn"
            onClick={handleAdd}
          >
            + Add Item
          </button>
        )}
      </div>

      {message && (
        <div className="items-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="items-error" role="alert">
          {error}
        </div>
      )}

      {/* ADD / EDIT FORM */}
      {showForm && (
        <div className="items-form-card">
          <h2>
            {editingId ? "Edit Item" : "Add Item"}
          </h2>

          <form onSubmit={handleSave}>
            <div className="items-form-grid">
              <label>
                Item Code *
                <input
                  name="itemCode"
                  value={form.itemCode}
                  onChange={handleChange}
                  placeholder="RM-AL-001"
                  required
                />
              </label>

              <label>
                Item Name *
                <input
                  name="itemName"
                  value={form.itemName}
                  onChange={handleChange}
                  placeholder="Aluminium Casting"
                  required
                />
              </label>

              <label>
                Item Type *
                <select
                  name="itemType"
                  value={form.itemType}
                  onChange={handleChange}
                >
                  {itemTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Category *
                <input
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="Casting"
                  required
                />
              </label>

              <label>
                Unit of Measure *
                <input
                  name="uom"
                  value={form.uom}
                  onChange={handleChange}
                  placeholder="PCS"
                  required
                />
              </label>

              <label>
                Tracking Type
                <select
                  name="trackingType"
                  value={form.trackingType}
                  onChange={handleChange}
                >
                  <option value="None">None</option>
                  <option value="Batch">Batch</option>
                  <option value="Serial">Serial</option>
                </select>
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <label>
                Source System
                <select
                  name="sourceSystem"
                  value={form.sourceSystem}
                  onChange={handleChange}
                >
                  <option value="IQMS">IQMS</option>
                  <option value="ERP">ERP</option>
                  <option value="MES">MES</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                Plant ID (Optional)
                <input
                  name="plantId"
                  value={form.plantId}
                  onChange={handleChange}
                  placeholder="MongoDB Plant ID"
                />
              </label>

              <label>
                External Item ID
                <input
                  name="externalItemId"
                  value={form.externalItemId}
                  onChange={handleChange}
                  placeholder="ERP reference"
                />
              </label>

              <label className="items-full-width">
                Description
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Item description"
                />
              </label>
            </div>

            <div className="items-form-actions">
              <button
                type="button"
                className="items-cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="items-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Item"
                    : "Save Item"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ITEM TABLE */}
      <div className="items-table-card">
        <div className="items-table-toolbar">
          <h2>Item List</h2>

          <input
            type="search"
            placeholder="Search items..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="items-table-scroll">
          <table className="items-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Item Code</th>
                <th>Item Name</th>
                <th>Type</th>
                <th>Category</th>
                <th>UOM</th>
                <th>Tracking</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>Loading items...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9}>No items found</td>
                </tr>
              ) : (
                filteredItems.map((item, index) => (
                  <tr key={item._id}>
                    <td>{index + 1}</td>
                    <td>{item.itemCode}</td>
                    <td>{item.itemName}</td>
                    <td>{item.itemType}</td>
                    <td>{item.category}</td>
                    <td>{item.uom}</td>
                    <td>{item.trackingType}</td>

                    <td>
                      <span
                        className={
                          item.status === "Active"
                            ? "items-status-active"
                            : "items-status-inactive"
                        }
                      >
                        {item.status}
                      </span>
                    </td>

                    {/* THREE-DOT ACTIONS */}
                    <td>
                      <div
                        className="items-menu-wrapper"
                        ref={
                          openMenuId === item._id
                            ? menuRef
                            : null
                        }
                      >
                        <button
                          type="button"
                          className="items-three-dot-btn"
                          aria-label={`Actions for ${item.itemCode}`}
                          aria-haspopup="menu"
                          aria-expanded={
                            openMenuId === item._id
                          }
                          onClick={() =>
                            setOpenMenuId((previous) =>
                              previous === item._id
                                ? null
                                : item._id
                            )
                          }
                        >
                          &#8942;
                        </button>

                        {openMenuId === item._id && (
                          <div
                            className="items-dropdown-menu"
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => handleView(item)}
                            >
                              <span>◉</span>
                              View Details
                            </button>

                            {canUpdate && (
                              <>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => handleEdit(item)}
                                >
                                  <span>✎</span>
                                  Edit
                                </button>

                                <div className="items-menu-divider" />

                                <button
                                  type="button"
                                  role="menuitem"
                                  className={
                                    item.status === "Active"
                                      ? "items-menu-danger"
                                      : "items-menu-success"
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

      {/* VIEW DETAILS POPUP */}
      {viewItem && (
        <div
          className="items-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewItem(null);
            }
          }}
        >
          <div
            className="items-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="items-view-title"
          >
            <div className="items-modal-header">
              <div>
                <h2 id="items-view-title">
                  Item Details
                </h2>
                <p>{viewItem.itemCode}</p>
              </div>

              <button
                type="button"
                className="items-modal-close"
                aria-label="Close details"
                onClick={() => setViewItem(null)}
              >
                ×
              </button>
            </div>

            <div className="items-details-grid">
              <div>
                <span>Item Code</span>
                <strong>{viewItem.itemCode}</strong>
              </div>

              <div>
                <span>Item Name</span>
                <strong>{viewItem.itemName}</strong>
              </div>

              <div>
                <span>Item Type</span>
                <strong>{viewItem.itemType}</strong>
              </div>

              <div>
                <span>Category</span>
                <strong>{viewItem.category}</strong>
              </div>

              <div>
                <span>Unit of Measure</span>
                <strong>{viewItem.uom}</strong>
              </div>

              <div>
                <span>Tracking Type</span>
                <strong>{viewItem.trackingType}</strong>
              </div>

              <div>
                <span>Plant</span>
                <strong>
                  {displayPlant(viewItem.plantId)}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong
                  className={
                    viewItem.status === "Active"
                      ? "items-status-active"
                      : "items-status-inactive"
                  }
                >
                  {viewItem.status}
                </strong>
              </div>

              <div>
                <span>Source System</span>
                <strong>{viewItem.sourceSystem}</strong>
              </div>

              <div>
                <span>External Item ID</span>
                <strong>
                  {viewItem.externalItemId || "-"}
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

              <div className="items-detail-full">
                <span>Description</span>
                <strong>
                  {viewItem.description || "-"}
                </strong>
              </div>
            </div>

            <div className="items-modal-footer">
              <button
                type="button"
                className="items-cancel-btn"
                onClick={() => setViewItem(null)}
              >
                Close
              </button>

              {canUpdate && (
                <button
                  type="button"
                  className="items-primary-btn"
                  onClick={() => handleEdit(viewItem)}
                >
                  Edit Item
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION POPUP */}
      {statusItem && (
        <div className="items-modal-overlay">
          <div
            className="items-modal items-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="items-confirm-title"
          >
            <h2 id="items-confirm-title">
              {statusItem.status === "Active"
                ? "Deactivate Item?"
                : "Activate Item?"}
            </h2>

            <p>
              Are you sure you want to{" "}
              {statusItem.status === "Active"
                ? "deactivate"
                : "activate"}{" "}
              <strong>
                {statusItem.itemCode} -{" "}
                {statusItem.itemName}
              </strong>
              ?
            </p>

            <p className="items-confirm-note">
              Deactivation preserves the item record
              and its history. Future inspection-plan
              selection should exclude inactive items.
            </p>

            <div className="items-modal-footer">
              <button
                type="button"
                className="items-cancel-btn"
                onClick={() => setStatusItem(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  statusItem.status === "Active"
                    ? "items-danger-btn"
                    : "items-primary-btn"
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

export default Items;
