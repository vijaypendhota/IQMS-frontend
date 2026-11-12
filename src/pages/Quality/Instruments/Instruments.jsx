

import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import "./Instruments.css";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { hasPermission } from "../../../utils/permissions";

const API = "http://localhost:1700/api";

const emptyForm = {
  instrumentCode: "",
  instrumentName: "",
  instrumentType: "Dimensional",
  serialNumber: "",
  manufacturer: "",
  model: "",
  minimumRange: "",
  maximumRange: "",
  measurementUnit: "",
  resolution: "",
  accuracy: "",
  plantId: "",
  location: "",
  calibrationRequired: true,
  status: "Active"
};

const types = [
  "Dimensional",
  "Electrical",
  "Temperature",
  "Pressure",
  "Weight",
  "Surface",
  "Chemical",
  "Other"
];

const getId = (value) =>
  value && typeof value === "object"
    ? value._id || ""
    : value || "";

const formatValue = (value) =>
  value === null || value === undefined || value === ""
    ? "-"
    : String(value);

const Instruments = () => {
  const { user } = useCurrentUser();

  const canCreate = hasPermission(user, "testInstrument.create");
  const canUpdate = hasPermission(user, "testInstrument.update");

  const [instruments, setInstruments] = useState([]);
  const [plants, setPlants] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [statusItem, setStatusItem] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const menuRef = useRef(null);

  const request = useCallback(async (url, options = {}) => {
    const token = sessionStorage.getItem("iqms_token");

    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
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

  const loadInstruments = useCallback(async () => {
    const data = await request(`${API}/test-instruments`);
    setInstruments(data.instruments || []);
  }, [request]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const instrumentData = await request(
          `${API}/test-instruments`
        );

        if (!cancelled) {
          setInstruments(instrumentData.instruments || []);
        }

        // Plant list is optional. If the role cannot
        // view plants, instrument management still works.
        try {
          const plantData = await request(`${API}/plants`);

          if (!cancelled) {
            setPlants(plantData.plants || []);
          }
        } catch {
          if (!cancelled) setPlants([]);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [request]);

  useEffect(() => {
    const closeMenu = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpenMenuId(null);
      }
    };

    const escape = (event) => {
      if (event.key === "Escape") {
        setOpenMenuId(null);
        setViewItem(null);
        if (!saving) setStatusItem(null);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", escape);
    };
  }, [saving]);

  const getPlantName = (instrument) => {
    if (
      instrument.plantId &&
      typeof instrument.plantId === "object"
    ) {
      return instrument.plantId.plantName || "-";
    }

    const plant = plants.find(
      (entry) => entry._id === getId(instrument.plantId)
    );

    return plant?.plantName || "-";
  };

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setOpenMenuId(null);
    clearMessages();
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const handleAdd = () => {
    if (!canCreate) return;

    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
    setViewItem(null);
    setOpenMenuId(null);
    clearMessages();
  };

  const handleView = (instrument) => {
    setViewItem(instrument);
    setOpenMenuId(null);
  };

  const handleEdit = (instrument) => {
    if (!canUpdate) return;

    setForm({
      instrumentCode: instrument.instrumentCode || "",
      instrumentName: instrument.instrumentName || "",
      instrumentType: instrument.instrumentType || "Dimensional",
      serialNumber: instrument.serialNumber || "",
      manufacturer: instrument.manufacturer || "",
      model: instrument.model || "",
      minimumRange: instrument.minimumRange ?? "",
      maximumRange: instrument.maximumRange ?? "",
      measurementUnit: instrument.measurementUnit || "",
      resolution: instrument.resolution ?? "",
      accuracy: instrument.accuracy || "",
      plantId: getId(instrument.plantId),
      location: instrument.location || "",
      calibrationRequired:
        instrument.calibrationRequired !== false,
      status: instrument.status || "Active"
    });

    setEditingId(instrument._id);
    setShowForm(true);
    setViewItem(null);
    setOpenMenuId(null);
    clearMessages();
  };

  const buildPayload = (values) => ({
    ...values,
    plantId: values.plantId || null,
    minimumRange:
      values.minimumRange === ""
        ? null
        : Number(values.minimumRange),
    maximumRange:
      values.maximumRange === ""
        ? null
        : Number(values.maximumRange),
    resolution:
      values.resolution === ""
        ? null
        : Number(values.resolution)
  });

  const handleSave = async (event) => {
    event.preventDefault();

    if (editingId ? !canUpdate : !canCreate) return;

    setSaving(true);
    clearMessages();

    try {
      const url = editingId
        ? `${API}/test-instruments/${editingId}`
        : `${API}/test-instruments`;

      const data = await request(url, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(buildPayload(form))
      });

      const successMessage =
        data.msg || "Instrument saved successfully";

      resetForm();
      await loadInstruments();
      setMessage(successMessage);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusRequest = (instrument) => {
    if (!canUpdate) return;

    setStatusItem(instrument);
    setOpenMenuId(null);
    clearMessages();
  };

  const handleStatusConfirm = async () => {
    if (!statusItem || saving || !canUpdate) return;

    setSaving(true);
    clearMessages();

    const nextStatus =
      statusItem.status === "Active"
        ? "Inactive"
        : "Active";

    try {
      const payload = buildPayload({
        ...statusItem,
        plantId: getId(statusItem.plantId),
        status: nextStatus
      });

      const data = await request(
        `${API}/test-instruments/${statusItem._id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      );

      setStatusItem(null);
      await loadInstruments();

      setMessage(data.msg || "Status updated successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = instruments.filter((instrument) => {
    const text = [
      instrument.instrumentCode,
      instrument.instrumentName,
      instrument.instrumentType,
      instrument.serialNumber,
      instrument.manufacturer,
      instrument.status
    ]
      .join(" ")
      .toLowerCase();

    return text.includes(search.trim().toLowerCase());
  });

  return (
    <div className="instruments-page">
      <div className="instruments-header">
        <div>
          <h1>Test Instrument Master</h1>
          <p>
            Manage instruments used in quality inspections.
          </p>
        </div>

        {canCreate && !showForm && (
          <button
            type="button"
            className="instruments-primary-btn"
            onClick={handleAdd}
          >
            + Add Instrument
          </button>
        )}
      </div>

      {error && (
        <div className="instruments-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="instruments-success" role="status">
          {message}
        </div>
      )}

      {showForm && (
        <div className="instruments-card">
          <h2>
            {editingId
              ? "Edit Test Instrument"
              : "Add Test Instrument"}
          </h2>

          <form onSubmit={handleSave}>
            <div className="instruments-form-grid">
              <label>
                Instrument Code *
                <input
                  name="instrumentCode"
                  value={form.instrumentCode}
                  onChange={handleChange}
                  placeholder="INS-001"
                  required
                />
              </label>

              <label>
                Instrument Name *
                <input
                  name="instrumentName"
                  value={form.instrumentName}
                  onChange={handleChange}
                  placeholder="Digital Vernier Caliper"
                  required
                />
              </label>

              <label>
                Instrument Type *
                <select
                  name="instrumentType"
                  value={form.instrumentType}
                  onChange={handleChange}
                  required
                >
                  {types.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Serial Number *
                <input
                  name="serialNumber"
                  value={form.serialNumber}
                  onChange={handleChange}
                  placeholder="DVC-2026-001"
                  required
                />
              </label>

              <label>
                Manufacturer
                <input
                  name="manufacturer"
                  value={form.manufacturer}
                  onChange={handleChange}
                  placeholder="Mitutoyo"
                />
              </label>

              <label>
                Model
                <input
                  name="model"
                  value={form.model}
                  onChange={handleChange}
                  placeholder="500-196-30"
                />
              </label>

              <label>
                Minimum Range
                <input
                  type="number"
                  step="any"
                  name="minimumRange"
                  value={form.minimumRange}
                  onChange={handleChange}
                  placeholder="0"
                />
              </label>

              <label>
                Maximum Range
                <input
                  type="number"
                  step="any"
                  name="maximumRange"
                  value={form.maximumRange}
                  onChange={handleChange}
                  placeholder="150"
                />
              </label>

              <label>
                Measurement Unit
                <input
                  name="measurementUnit"
                  value={form.measurementUnit}
                  onChange={handleChange}
                  placeholder="mm"
                />
              </label>

              <label>
                Resolution
                <input
                  type="number"
                  step="any"
                  min="0"
                  name="resolution"
                  value={form.resolution}
                  onChange={handleChange}
                  placeholder="0.01"
                />
              </label>

              <label>
                Accuracy
                <input
                  name="accuracy"
                  value={form.accuracy}
                  onChange={handleChange}
                  placeholder="±0.02 mm"
                />
              </label>

              <label>
                Plant
                <select
                  name="plantId"
                  value={form.plantId}
                  onChange={handleChange}
                >
                  <option value="">No Plant Assigned</option>
                  {plants.map((plant) => (
                    <option key={plant._id} value={plant._id}>
                      {plant.plantCode} - {plant.plantName}
                    </option>
                  ))}
                  {form.plantId &&
                    !plants.some(
                      (plant) => plant._id === form.plantId
                    ) && (
                      <option value={form.plantId}>
                        Previously assigned plant
                      </option>
                    )}
                </select>
              </label>

              <label>
                Location
                <input
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Quality Lab"
                />
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

              <label className="instruments-checkbox-label">
                <input
                  type="checkbox"
                  name="calibrationRequired"
                  checked={form.calibrationRequired}
                  onChange={handleChange}
                />
                Calibration Required
              </label>
            </div>

            <div className="instruments-form-actions">
              <button
                type="button"
                className="instruments-cancel-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="instruments-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Instrument"
                    : "Save Instrument"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="instruments-card">
        <div className="instruments-toolbar">
          <h2>Instrument List</h2>
          <input
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search instruments..."
          />
        </div>

        <div className="instruments-table-scroll">
          <table className="instruments-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Code</th>
                <th>Instrument Name</th>
                <th>Type</th>
                <th>Serial Number</th>
                <th>Plant</th>
                <th>Calibration Required</th>
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
                    No instruments found
                  </td>
                </tr>
              ) : (
                filtered.map((instrument, index) => (
                  <tr key={instrument._id}>
                    <td>{index + 1}</td>
                    <td>{instrument.instrumentCode}</td>
                    <td>{instrument.instrumentName}</td>
                    <td>{instrument.instrumentType}</td>
                    <td>{instrument.serialNumber}</td>
                    <td>{getPlantName(instrument)}</td>
                    <td>
                      {instrument.calibrationRequired
                        ? "Yes"
                        : "No"}
                    </td>
                    <td>
                      <span
                        className={`instruments-status instruments-status-${instrument.status.toLowerCase()}`}
                      >
                        {instrument.status}
                      </span>
                    </td>
                    <td>
                      <div
                        className="instruments-menu-wrapper"
                        ref={
                          openMenuId === instrument._id
                            ? menuRef
                            : null
                        }
                      >
                        <button
                          type="button"
                          className="instruments-three-dot-btn"
                          aria-label={`Actions for ${instrument.instrumentCode}`}
                          aria-expanded={
                            openMenuId === instrument._id
                          }
                          onClick={() =>
                            setOpenMenuId((previous) =>
                              previous === instrument._id
                                ? null
                                : instrument._id
                            )
                          }
                        >
                          &#8942;
                        </button>

                        {openMenuId === instrument._id && (
                          <div className="instruments-dropdown">
                            <button
                              type="button"
                              onClick={() =>
                                handleView(instrument)
                              }
                            >
                              View Details
                            </button>

                            {canUpdate && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEdit(instrument)
                                  }
                                >
                                  Edit
                                </button>

                                <div className="instruments-menu-divider" />

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleStatusRequest(instrument)
                                  }
                                >
                                  {instrument.status === "Active"
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

      {viewItem && (
        <div
          className="instruments-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewItem(null);
            }
          }}
        >
          <div
            className="instruments-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instrument-details-title"
          >
            <div className="instruments-modal-header">
              <h2 id="instrument-details-title">
                Instrument Details
              </h2>
              <button
                type="button"
                className="instruments-close-btn"
                onClick={() => setViewItem(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="instruments-details-grid">
              {[
                ["Code", viewItem.instrumentCode],
                ["Name", viewItem.instrumentName],
                ["Type", viewItem.instrumentType],
                ["Serial Number", viewItem.serialNumber],
                ["Manufacturer", viewItem.manufacturer],
                ["Model", viewItem.model],
                ["Minimum Range", viewItem.minimumRange],
                ["Maximum Range", viewItem.maximumRange],
                ["Unit", viewItem.measurementUnit],
                ["Resolution", viewItem.resolution],
                ["Accuracy", viewItem.accuracy],
                ["Plant", getPlantName(viewItem)],
                ["Location", viewItem.location],
                [
                  "Calibration Required",
                  viewItem.calibrationRequired ? "Yes" : "No"
                ],
                ["Status", viewItem.status]
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{formatValue(value)}</strong>
                </div>
              ))}
            </div>

            <div className="instruments-modal-footer">
              <button
                type="button"
                className="instruments-cancel-btn"
                onClick={() => setViewItem(null)}
              >
                Close
              </button>

              {canUpdate && (
                <button
                  type="button"
                  className="instruments-primary-btn"
                  onClick={() => handleEdit(viewItem)}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {statusItem && (
        <div className="instruments-modal-overlay">
          <div
            className="instruments-modal instruments-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instrument-confirm-title"
          >
            <h2 id="instrument-confirm-title">
              {statusItem.status === "Active"
                ? "Deactivate Instrument?"
                : "Activate Instrument?"}
            </h2>

            <p>
              {statusItem.instrumentCode} —{" "}
              {statusItem.instrumentName}
            </p>

            <p>
              {statusItem.status === "Active"
                ? "This instrument will become Inactive."
                : "This instrument will become Active. Calibration eligibility will be checked separately when inspection assignment is implemented."}
            </p>

            <div className="instruments-modal-footer">
              <button
                type="button"
                className="instruments-cancel-btn"
                onClick={() => {
                  setStatusItem(null);
                  clearMessages();
                }}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  statusItem.status === "Active"
                    ? "instruments-danger-btn"
                    : "instruments-primary-btn"
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

export default Instruments;
