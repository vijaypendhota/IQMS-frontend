
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import "./Specifications.css";

import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { hasPermission } from "../../../utils/permissions";

const BASE = "http://localhost:1700/api";

const URLS = {
  items: `${BASE}/items`,
  characteristics: `${BASE}/quality-characteristics`,
  specifications: `${BASE}/item-specifications`
};

const emptyForm = {
  itemId: "",
  characteristicId: "",
  revision: 1,
  nominalValue: "",
  lowerSpecLimit: "",
  upperSpecLimit: "",
  acceptedValuesText: "",
  inspectionInstructions: "",
  status: "Draft"
};

const getId = (value) => {
  if (!value) return "";
  return typeof value === "object"
    ? String(value._id || "")
    : String(value);
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString();
};

const Specifications = () => {
  const { user } = useCurrentUser();

  const [items, setItems] = useState([]);
  const [characteristics, setCharacteristics] = useState([]);
  const [specifications, setSpecifications] = useState([]);

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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canCreate = hasPermission(
    user,
    "itemSpecification.create"
  );

  const canUpdate = hasPermission(
    user,
    "itemSpecification.update"
  );

  const getToken = () =>
    sessionStorage.getItem("iqms_token");

  const apiRequest = useCallback(async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
        ...(options.headers || {})
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.msg || `Request failed (${response.status})`
      );
    }

    return data;
  }, []);

  const loadSpecifications = useCallback(async () => {
    const data = await apiRequest(URLS.specifications);
    setSpecifications(data.specifications || []);
  }, [apiRequest]);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        const [itemData, characteristicData, specData] =
          await Promise.all([
            apiRequest(URLS.items),
            apiRequest(URLS.characteristics),
            apiRequest(URLS.specifications)
          ]);

        if (cancelled) return;

        setItems(itemData.items || []);
        setCharacteristics(
          characteristicData.characteristics || []
        );
        setSpecifications(specData.specifications || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [apiRequest]);

  useEffect(() => {
    const outsideClick = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpenMenuId(null);
      }
    };

    const escapeKey = (event) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
        setViewItem(null);
        if (!saving) setStatusItem(null);
      }
    };

    document.addEventListener("mousedown", outsideClick);
    document.addEventListener("keydown", escapeKey);

    return () => {
      document.removeEventListener("mousedown", outsideClick);
      document.removeEventListener("keydown", escapeKey);
    };
  }, [saving]);

  const selectedCharacteristic = characteristics.find(
    (item) => item._id === form.characteristicId
  );

  const selectedType =
    selectedCharacteristic?.characteristicType || "";

  const findItem = (id) =>
    items.find((item) => item._id === id);

  const findCharacteristic = (id) =>
    characteristics.find((item) => item._id === id);

  const getItemName = (spec) => {
    if (spec.itemId && typeof spec.itemId === "object") {
      return `${spec.itemId.itemCode} - ${spec.itemId.itemName}`;
    }

    const item = findItem(getId(spec.itemId));

    return item
      ? `${item.itemCode} - ${item.itemName}`
      : getId(spec.itemId) || "-";
  };

  const getCharacteristicName = (spec) => {
    if (
      spec.characteristicId &&
      typeof spec.characteristicId === "object"
    ) {
      return `${spec.characteristicId.characteristicCode} - ${spec.characteristicId.characteristicName}`;
    }

    const characteristic = findCharacteristic(
      getId(spec.characteristicId)
    );

    return characteristic
      ? `${characteristic.characteristicCode} - ${characteristic.characteristicName}`
      : getId(spec.characteristicId) || "-";
  };

  const getCharacteristicType = (spec) => {
    if (
      spec.characteristicId &&
      typeof spec.characteristicId === "object"
    ) {
      return spec.characteristicId.characteristicType;
    }

    return findCharacteristic(
      getId(spec.characteristicId)
    )?.characteristicType || "";
  };

  const getUnit = (spec) => {
    if (
      spec.characteristicId &&
      typeof spec.characteristicId === "object"
    ) {
      return spec.characteristicId.measurementUnit || "";
    }

    return findCharacteristic(
      getId(spec.characteristicId)
    )?.measurementUnit || "";
  };

  const resetForm = () => {
  setForm({ ...emptyForm });
  setEditingId(null);
  setShowForm(false);

  // Clear previous messages
  setError("");
  setMessage("");

  // Close any open action menu
  setOpenMenuId(null);
};

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "characteristicId"
        ? {
            nominalValue: "",
            lowerSpecLimit: "",
            upperSpecLimit: "",
            acceptedValuesText: ""
          }
        : {})
    }));
  };

  const handleAdd = () => {
    if (!canCreate) return;

    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
    setViewItem(null);
    setOpenMenuId(null);
    setError("");
    setMessage("");
  };

  const handleView = (spec) => {
    setViewItem(spec);
    setOpenMenuId(null);
  };

  // EDIT IS NOW AVAILABLE FOR ALL STATUSES
  const handleEdit = (spec) => {
    if (!canUpdate) return;

    setForm({
      itemId: getId(spec.itemId),
      characteristicId: getId(spec.characteristicId),
      revision: spec.revision,
      nominalValue: spec.nominalValue ?? "",
      lowerSpecLimit: spec.lowerSpecLimit ?? "",
      upperSpecLimit: spec.upperSpecLimit ?? "",
      acceptedValuesText: (
        spec.acceptedValues || []
      ).join(", "),
      inspectionInstructions:
        spec.inspectionInstructions || "",
      status: spec.status
    });

    setEditingId(spec._id);
    setShowForm(true);
    setViewItem(null);
    setOpenMenuId(null);
    setError("");
    setMessage("");
  };

  // NEW REVISION REMAINS A SEPARATE ACTION
  const handleNewRevision = (spec) => {
    if (!canCreate) return;

    const matching = specifications.filter(
      (entry) =>
        getId(entry.itemId) === getId(spec.itemId) &&
        getId(entry.characteristicId) ===
          getId(spec.characteristicId)
    );

    const maxRevision = Math.max(
      0,
      ...matching.map(
        (entry) => Number(entry.revision) || 0
      )
    );

    setForm({
      itemId: getId(spec.itemId),
      characteristicId: getId(spec.characteristicId),
      revision: maxRevision + 1,
      nominalValue: spec.nominalValue ?? "",
      lowerSpecLimit: spec.lowerSpecLimit ?? "",
      upperSpecLimit: spec.upperSpecLimit ?? "",
      acceptedValuesText: (
        spec.acceptedValues || []
      ).join(", "),
      inspectionInstructions:
        spec.inspectionInstructions || "",
      status: "Draft"
    });

    setEditingId(null);
    setShowForm(true);
    setViewItem(null);
    setOpenMenuId(null);
    setError("");
    setMessage("");
  };

  const buildPayload = (values) => ({
    itemId: values.itemId,
    characteristicId: values.characteristicId,
    revision: Number(values.revision),
    nominalValue:
      values.nominalValue === ""
        ? null
        : Number(values.nominalValue),
    lowerSpecLimit:
      values.lowerSpecLimit === ""
        ? null
        : Number(values.lowerSpecLimit),
    upperSpecLimit:
      values.upperSpecLimit === ""
        ? null
        : Number(values.upperSpecLimit),
    acceptedValues: values.acceptedValuesText
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
    inspectionInstructions:
      values.inspectionInstructions.trim(),
    status: values.status
  });

  const handleSave = async (event) => {
    event.preventDefault();

    if (editingId ? !canUpdate : !canCreate) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = buildPayload(form);

      const data = await apiRequest(
        editingId
          ? `${URLS.specifications}/${editingId}`
          : URLS.specifications,
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload)
        }
      );

      resetForm();

      setMessage(
        data.msg || "Specification saved successfully"
      );

      await loadSpecifications();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusRequest = (spec) => {
    if (!canUpdate) return;

    setStatusItem(spec);
    setOpenMenuId(null);
    setError("");
    setMessage("");
  };

  const handleStatusConfirm = async () => {
    if (!statusItem || !canUpdate || saving) return;

    const nextStatus =
      statusItem.status === "Active"
        ? "Inactive"
        : "Active";

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        itemId: getId(statusItem.itemId),
        characteristicId: getId(
          statusItem.characteristicId
        ),
        revision: statusItem.revision,
        nominalValue: statusItem.nominalValue,
        lowerSpecLimit: statusItem.lowerSpecLimit,
        upperSpecLimit: statusItem.upperSpecLimit,
        acceptedValues: statusItem.acceptedValues || [],
        inspectionInstructions:
          statusItem.inspectionInstructions || "",
        status: nextStatus
      };

      const data = await apiRequest(
        `${URLS.specifications}/${statusItem._id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      );

      setStatusItem(null);

      setMessage(
        data.msg || "Status updated successfully"
      );

      await loadSpecifications();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = specifications.filter((spec) => {
    const value = [
      getItemName(spec),
      getCharacteristicName(spec),
      spec.revision,
      spec.status
    ]
      .join(" ")
      .toLowerCase();

    return value.includes(search.toLowerCase());
  });

  return (
    <div className="spec-page">
      <div className="spec-header">
        <div>
          <h1>Item Specifications</h1>
          <p>
            Manage item-specific quality requirements
            and specification revisions.
          </p>
        </div>

        {canCreate && !showForm && (
          <button
            type="button"
            className="spec-primary-btn"
            onClick={handleAdd}
          >
            + Add Specification
          </button>
        )}
      </div>

      {message && (
        <div className="spec-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="spec-error" role="alert">
          {error}
        </div>
      )}

      {showForm && (
        <div className="spec-card">
          <h2>
            {editingId
              ? "Edit Item Specification"
              : "Add Item Specification"}
          </h2>

          {editingId && (
            <div className="spec-type-info">
              You are editing Revision {form.revision}.
              Updating will keep the same revision number.
              Use New Revision to create a separate version.
            </div>
          )}

          <form onSubmit={handleSave}>
            <div className="spec-form-grid">
              <label>
                Item *
                <select
                  name="itemId"
                  value={form.itemId}
                  onChange={handleChange}
                  disabled={Boolean(editingId)}
                  required
                >
                  <option value="">Select Item</option>
                  {items
                    .filter(
                      (item) =>
                        item.status === "Active" ||
                        item._id === form.itemId
                    )
                    .map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                      >
                        {item.itemCode} - {item.itemName}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Quality Characteristic *
                <select
                  name="characteristicId"
                  value={form.characteristicId}
                  onChange={handleChange}
                  disabled={Boolean(editingId)}
                  required
                >
                  <option value="">
                    Select Characteristic
                  </option>

                  {characteristics
                    .filter(
                      (item) =>
                        item.status === "Active" ||
                        item._id === form.characteristicId
                    )
                    .map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                      >
                        {item.characteristicCode} -{" "}
                        {item.characteristicName}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Revision *
                <input
                  type="number"
                  name="revision"
                  min="1"
                  step="1"
                  value={form.revision}
                  onChange={handleChange}
                  disabled={Boolean(editingId)}
                  required
                />
              </label>

              <label>
                Status
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              {selectedType && (
                <div className="spec-type-info">
                  <strong>Characteristic Type:</strong>{" "}
                  {selectedType}
                  {selectedType === "Numeric" &&
                    ` (${selectedCharacteristic?.measurementUnit || ""})`}
                </div>
              )}

              {selectedType === "Numeric" && (
                <>
                  <label>
                    Nominal Value
                    <input
                      type="number"
                      step="any"
                      name="nominalValue"
                      value={form.nominalValue}
                      onChange={handleChange}
                      placeholder="50.00"
                    />
                  </label>

                  <label>
                    Lower Specification Limit (LSL) *
                    <input
                      type="number"
                      step="any"
                      name="lowerSpecLimit"
                      value={form.lowerSpecLimit}
                      onChange={handleChange}
                      placeholder="49.80"
                      required
                    />
                  </label>

                  <label>
                    Upper Specification Limit (USL) *
                    <input
                      type="number"
                      step="any"
                      name="upperSpecLimit"
                      value={form.upperSpecLimit}
                      onChange={handleChange}
                      placeholder="50.20"
                      required
                    />
                  </label>
                </>
              )}

              {selectedType === "Attribute" && (
                <label className="spec-full-width">
                  Accepted Values *
                  <input
                    name="acceptedValuesText"
                    value={form.acceptedValuesText}
                    onChange={handleChange}
                    placeholder="No Cracks, Pass, Accept"
                    required
                  />
                  <small>
                    Separate multiple values with commas.
                  </small>
                </label>
              )}

              <label className="spec-full-width">
                Inspection Instructions
                <textarea
                  name="inspectionInstructions"
                  value={form.inspectionInstructions}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Inspection instructions"
                />
              </label>
            </div>

            <div className="spec-form-actions">
              <button
                type="button"
                className="spec-cancel-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="spec-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Specification"
                    : "Save Specification"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="spec-card">
        <div className="spec-toolbar">
          <h2>Specification List</h2>

          <input
            type="search"
            placeholder="Search specifications..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="spec-table-scroll">
          <table className="spec-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Item</th>
                <th>Characteristic</th>
                <th>Type</th>
                <th>Revision</th>
                <th>Acceptance Criteria</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    No specifications found
                  </td>
                </tr>
              ) : (
                filtered.map((spec, index) => {
                  const numeric =
                    getCharacteristicType(spec) === "Numeric";

                  const criteria = numeric
                    ? `${spec.lowerSpecLimit} to ${spec.upperSpecLimit} ${getUnit(spec)}`
                    : (spec.acceptedValues || []).join(", ");

                  return (
                    <tr key={spec._id}>
                      <td>{index + 1}</td>
                      <td>{getItemName(spec)}</td>
                      <td>
                        {getCharacteristicName(spec)}
                      </td>
                      <td>
                        {getCharacteristicType(spec)}
                      </td>
                      <td>{spec.revision}</td>
                      <td>{criteria}</td>
                      <td>
                        <span
                          className={`spec-status spec-status-${spec.status.toLowerCase()}`}
                        >
                          {spec.status}
                        </span>
                      </td>

                      <td>
                        <div
                          className="spec-menu-wrapper"
                          ref={
                            openMenuId === spec._id
                              ? menuRef
                              : null
                          }
                        >
                          <button
                            type="button"
                            className="spec-three-dot-btn"
                            aria-label={`Actions for revision ${spec.revision}`}
                            aria-haspopup="menu"
                            aria-expanded={
                              openMenuId === spec._id
                            }
                            onClick={() =>
                              setOpenMenuId((previous) =>
                                previous === spec._id
                                  ? null
                                  : spec._id
                              )
                            }
                          >
                            &#8942;
                          </button>

                          {openMenuId === spec._id && (
                            <div
                              className="spec-dropdown"
                              role="menu"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() =>
                                  handleView(spec)
                                }
                              >
                                <span>◉</span>
                                View Details
                              </button>

                              {canUpdate && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() =>
                                    handleEdit(spec)
                                  }
                                >
                                  <span>✎</span>
                                  Edit
                                </button>
                              )}

                              {canCreate && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() =>
                                    handleNewRevision(spec)
                                  }
                                >
                                  <span>＋</span>
                                  New Revision
                                </button>
                              )}

                              {canUpdate && (
                                <>
                                  <div className="spec-menu-divider" />

                                  <button
                                    type="button"
                                    role="menuitem"
                                    className={
                                      spec.status === "Active"
                                        ? "spec-menu-danger"
                                        : "spec-menu-success"
                                    }
                                    onClick={() =>
                                      handleStatusRequest(spec)
                                    }
                                  >
                                    <span>
                                      {spec.status === "Active"
                                        ? "⊘"
                                        : "✓"}
                                    </span>

                                    {spec.status === "Active"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW DETAILS */}
      {viewItem && (
        <div
          className="spec-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewItem(null);
            }
          }}
        >
          <div
            className="spec-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spec-view-title"
          >
            <div className="spec-modal-header">
              <div>
                <h2 id="spec-view-title">
                  Specification Details
                </h2>
                <p>Revision {viewItem.revision}</p>
              </div>

              <button
                type="button"
                className="spec-modal-close"
                aria-label="Close"
                onClick={() => setViewItem(null)}
              >
                ×
              </button>
            </div>

            <div className="spec-details-grid">
              <div>
                <span>Item</span>
                <strong>{getItemName(viewItem)}</strong>
              </div>

              <div>
                <span>Characteristic</span>
                <strong>
                  {getCharacteristicName(viewItem)}
                </strong>
              </div>

              <div>
                <span>Type</span>
                <strong>
                  {getCharacteristicType(viewItem)}
                </strong>
              </div>

              <div>
                <span>Revision</span>
                <strong>{viewItem.revision}</strong>
              </div>

              <div>
                <span>Status</span>
                <strong>{viewItem.status}</strong>
              </div>

              <div>
                <span>Measurement Unit</span>
                <strong>{getUnit(viewItem) || "-"}</strong>
              </div>

              {getCharacteristicType(viewItem) ===
              "Numeric" ? (
                <>
                  <div>
                    <span>Nominal Value</span>
                    <strong>
                      {viewItem.nominalValue ?? "-"}
                    </strong>
                  </div>

                  <div>
                    <span>LSL</span>
                    <strong>
                      {viewItem.lowerSpecLimit ?? "-"}
                    </strong>
                  </div>

                  <div>
                    <span>USL</span>
                    <strong>
                      {viewItem.upperSpecLimit ?? "-"}
                    </strong>
                  </div>
                </>
              ) : (
                <div className="spec-detail-full">
                  <span>Accepted Values</span>
                  <strong>
                    {(viewItem.acceptedValues || []).join(", ") ||
                      "-"}
                  </strong>
                </div>
              )}

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

              <div className="spec-detail-full">
                <span>Inspection Instructions</span>
                <strong>
                  {viewItem.inspectionInstructions || "-"}
                </strong>
              </div>
            </div>

            <div className="spec-modal-footer">
              <button
                type="button"
                className="spec-cancel-btn"
                onClick={() => setViewItem(null)}
              >
                Close
              </button>

              {canUpdate && (
                <button
                  type="button"
                  className="spec-primary-btn"
                  onClick={() => handleEdit(viewItem)}
                >
                  Edit
                </button>
              )}

              {canCreate && (
                <button
                  type="button"
                  className="spec-primary-btn"
                  onClick={() =>
                    handleNewRevision(viewItem)
                  }
                >
                  New Revision
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STATUS CONFIRMATION */}
      {statusItem && (
        <div className="spec-modal-overlay">
          <div
            className="spec-modal spec-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="spec-confirm-title"
          >
            <h2 id="spec-confirm-title">
              {statusItem.status === "Active"
                ? "Deactivate Specification?"
                : "Activate Specification?"}
            </h2>

            <p>
              {getItemName(statusItem)}
              <br />
              {getCharacteristicName(statusItem)}
              <br />
              <strong>
                Revision {statusItem.revision}
              </strong>
            </p>

            <p>
              {statusItem.status === "Active"
                ? "The specification will become Inactive."
                : "The specification will become Active. Another Active revision for the same item and characteristic is not allowed."}
            </p>

            <div className="spec-modal-footer">
              <button
                type="button"
                className="spec-cancel-btn"
                onClick={() => setStatusItem(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  statusItem.status === "Active"
                    ? "spec-danger-btn"
                    : "spec-primary-btn"
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

export default Specifications;
