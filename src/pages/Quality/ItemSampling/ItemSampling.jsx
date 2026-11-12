
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import "./ItemSampling.css";

const API = "http://localhost:1700/api/item-samplings";

const EMPTY_FORM = {
  samplingCode: "",
  samplingName: "",
  samplingType: "Fixed",
  samplingValue: "",
  description: "",
  status: "Active"
};

const ItemSampling = () => {
  const [samplings, setSamplings] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [totalQuantity, setTotalQuantity] = useState("100");
  const [preview, setPreview] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const request = useCallback(async (url, options = {}) => {
    const token = sessionStorage.getItem("iqms_token");

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body
          ? { "Content-Type": "application/json" }
          : {}),
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.msg ||
        "Request failed"
      );
    }

    return data;
  }, []);

  const loadSamplings = useCallback(async () => {
    setLoading(true);

    try {
      const data = await request(API);
      setSamplings(data.samplings || []);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadSamplings();
  }, [loadSamplings]);

  const filteredSamplings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return samplings.filter((sampling) => {
      const matchesSearch =
        sampling.samplingCode
          .toLowerCase()
          .includes(query) ||
        sampling.samplingName
          .toLowerCase()
          .includes(query) ||
        sampling.samplingType
          .toLowerCase()
          .includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        sampling.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [samplings, search, statusFilter]);

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));

    setPreview(null);
  };

  const handleTypeChange = (value) => {
    setForm((previous) => ({
      ...previous,
      samplingType: value,
      samplingValue:
        value === "Fixed" ||
        value === "Percentage"
          ? ""
          : null
    }));

    setPreview(null);
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(true);
    setError("");
    setMessage("");
    setPreview(null);
  };

  const handleEdit = (sampling) => {
    setEditingId(sampling._id);

    setForm({
      samplingCode: sampling.samplingCode,
      samplingName: sampling.samplingName,
      samplingType: sampling.samplingType,
      samplingValue:
        sampling.samplingValue ?? "",
      description: sampling.description || "",
      status: sampling.status
    });

    setShowForm(true);
    setError("");
    setMessage("");
    setPreview(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setShowForm(false);
    setPreview(null);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        samplingCode: form.samplingCode,
        samplingName: form.samplingName,
        samplingType: form.samplingType,
        samplingValue: form.samplingValue,
        description: form.description,
        status: form.status
      };

      if (editingId) {
        delete payload.samplingCode;
      }

      const url = editingId
        ? `${API}/${editingId}`
        : API;

      const method = editingId ? "PUT" : "POST";

      const data = await request(url, {
        method,
        body: JSON.stringify(payload)
      });

      setMessage(
        data.message ||
        "Item Sampling saved successfully"
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...EMPTY_FORM });
      setPreview(null);

      await loadSamplings();

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    setError("");
    setMessage("");
    setPreview(null);

    const quantity = Number(totalQuantity);

    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0
    ) {
      setError(
        "Total quantity must be a positive whole number"
      );
      return;
    }

    if (form.samplingType === "AQL") {
      setError(
        "AQL calculation will be available in Step 17B"
      );
      return;
    }

    let calculated = 0;

    if (form.samplingType === "Fixed") {
      const value = Number(form.samplingValue);

      if (
        !Number.isSafeInteger(value) ||
        value <= 0
      ) {
        setError(
          "Enter a valid fixed sample quantity"
        );
        return;
      }

      calculated = Math.min(quantity, value);
    }

    if (form.samplingType === "Percentage") {
      const value = Number(form.samplingValue);

      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        value > 100
      ) {
        setError(
          "Percentage must be greater than 0 and at most 100"
        );
        return;
      }

      calculated = Math.min(
        quantity,
        Math.ceil(quantity * value / 100)
      );
    }

    if (form.samplingType === "Full Inspection") {
      calculated = quantity;
    }

    setPreview({
      totalQuantity: quantity,
      sampleQuantity: calculated
    });
  };

  return (
    <div className="item-sampling-page">
      <div className="item-sampling-header">
        <div>
          <h1>Item Sampling Master</h1>
          <p>
            Configure reusable sampling rules
            for quality inspections.
          </p>
        </div>

        <button
          className="sampling-primary"
          onClick={handleAdd}
        >
          + Add Item Sampling
        </button>
      </div>

      {error && (
        <div className="sampling-error">
          {error}
        </div>
      )}

      {message && (
        <div className="sampling-success">
          {message}
        </div>
      )}

      {showForm && (
        <div className="sampling-card">
          <h2>
            {editingId
              ? "Edit Item Sampling"
              : "New Item Sampling"}
          </h2>

          <form onSubmit={handleSave}>
            <div className="sampling-form-grid">
              <label>
                Sampling Code *
                <input
                  value={form.samplingCode}
                  disabled={Boolean(editingId)}
                  onChange={(e) =>
                    updateField(
                      "samplingCode",
                      e.target.value
                    )
                  }
                  placeholder="SAMP-001"
                  required
                />
              </label>

              <label>
                Sampling Name *
                <input
                  value={form.samplingName}
                  onChange={(e) =>
                    updateField(
                      "samplingName",
                      e.target.value
                    )
                  }
                  placeholder="Standard Shaft Inspection"
                  required
                />
              </label>

              <label>
                Sampling Type *
                <select
                  value={form.samplingType}
                  onChange={(e) =>
                    handleTypeChange(e.target.value)
                  }
                >
                  <option value="Fixed">
                    Fixed
                  </option>

                  <option value="Percentage">
                    Percentage
                  </option>

                  <option value="Full Inspection">
                    Full Inspection
                  </option>

                  <option value="AQL">
                    AQL
                  </option>
                </select>
              </label>

              {(
                form.samplingType === "Fixed" ||
                form.samplingType === "Percentage"
              ) && (
                <label>
                  {form.samplingType === "Fixed"
                    ? "Fixed Sample Quantity *"
                    : "Sampling Percentage (%) *"}

                  <input
                    type="number"
                    min="0"
                    step={
                      form.samplingType === "Fixed"
                        ? "1"
                        : "any"
                    }
                    value={form.samplingValue}
                    onChange={(e) =>
                      updateField(
                        "samplingValue",
                        e.target.value
                      )
                    }
                    required
                  />
                </label>
              )}

              <label>
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    updateField(
                      "status",
                      e.target.value
                    )
                  }
                >
                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </label>

              <label className="sampling-full-width">
                Description
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={(e) =>
                    updateField(
                      "description",
                      e.target.value
                    )
                  }
                  placeholder="Enter sampling instructions"
                />
              </label>
            </div>

            <div className="sampling-preview">
              <h3>Sample Quantity Preview</h3>

              <div className="sampling-preview-controls">
                <label>
                  Total Quantity
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={totalQuantity}
                    onChange={(e) =>
                      setTotalQuantity(e.target.value)
                    }
                  />
                </label>

                <button
                  type="button"
                  className="sampling-secondary"
                  onClick={handlePreview}
                >
                  Calculate
                </button>
              </div>

              {preview && (
                <div className="sampling-preview-result">
                  Total Quantity:{" "}
                  <strong>
                    {preview.totalQuantity}
                  </strong>

                  <span>
                    Sample Quantity:{" "}
                    <strong>
                      {preview.sampleQuantity}
                    </strong>
                  </span>
                </div>
              )}

              {form.samplingType === "AQL" && (
                <p className="sampling-note">
                  AQL sample quantity will be calculated
                  after configuring an AQL sampling plan.
                </p>
              )}
            </div>

            <div className="sampling-actions">
              <button
                type="button"
                className="sampling-secondary"
                onClick={handleCancel}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="sampling-primary"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update"
                    : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="sampling-card">
        <div className="sampling-list-header">
          <h2>Item Sampling List</h2>

          <div className="sampling-filters">
            <input
              placeholder="Search sampling..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
            >
              <option value="All">
                All Statuses
              </option>

              <option value="Active">
                Active
              </option>

              <option value="Inactive">
                Inactive
              </option>
            </select>
          </div>
        </div>

        <div className="sampling-table-wrapper">
          <table className="sampling-table">
            <thead>
              <tr>
                <th>Sampling Code</th>
                <th>Sampling Name</th>
                <th>Sampling Type</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6">
                    Loading...
                  </td>
                </tr>
              ) : filteredSamplings.length === 0 ? (
                <tr>
                  <td colSpan="6">
                    No Item Sampling records found.
                  </td>
                </tr>
              ) : (
                filteredSamplings.map((sampling) => (
                  <tr key={sampling._id}>
                    <td>
                      <strong>
                        {sampling.samplingCode}
                      </strong>
                    </td>

                    <td>
                      {sampling.samplingName}
                    </td>

                    <td>
                      {sampling.samplingType}
                    </td>

                    <td>
                      {sampling.samplingType === "Fixed"
                        ? `${sampling.samplingValue} units`
                        : sampling.samplingType === "Percentage"
                          ? `${sampling.samplingValue}%`
                          : "-"}
                    </td>

                    <td>
                      <span
                        className={
                          sampling.status === "Active"
                            ? "sampling-status-active"
                            : "sampling-status-inactive"
                        }
                      >
                        {sampling.status}
                      </span>
                    </td>

                    <td>
                      <button
                        className="sampling-edit-button"
                        onClick={() =>
                          handleEdit(sampling)
                        }
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
      </div>
    </div>
  );
};

export default ItemSampling;