

import { useCallback, useEffect, useState } from "react";
import "./AqlSamplingPlans.css";

import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { hasPermission } from "../../../utils/permissions";

const API = "http://localhost:1700/api/aql-sampling-plans";

const emptyForm = {
  planCode: "",
  planName: "",
  standard: "ISO 2859-1",
  inspectionSeverity: "Normal",
  inspectionLevel: "II",
  criticalPolicy: "Zero Acceptance",
  criticalAql: "",
  majorAql: "1.0",
  minorAql: "2.5",
  description: "",
  status: "Active"
};

const AqlSamplingPlans = () => {
  const { user } = useCurrentUser();

  const canCreate = hasPermission(
    user,
    "aqlSamplingPlan.create"
  );

  const canUpdate = hasPermission(
    user,
    "aqlSamplingPlan.update"
  );

  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewPlan, setViewPlan] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
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
        data.message || data.msg || "Request failed"
      );
    }

    return data;
  }, []);

  const loadPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await request(API);
      setPlans(data.plans || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "criticalPolicy" &&
      value === "Zero Acceptance"
        ? { criticalAql: "" }
        : {})
    }));
  };

  const handleAdd = () => {
    if (!canCreate) return;

    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const handleEdit = (plan) => {
    if (!canUpdate) return;

    setForm({
      planCode: plan.planCode || "",
      planName: plan.planName || "",
      standard: plan.standard || "ISO 2859-1",
      inspectionSeverity:
        plan.inspectionSeverity || "Normal",
      inspectionLevel: plan.inspectionLevel || "II",
      criticalPolicy:
        plan.criticalPolicy || "Zero Acceptance",
      criticalAql:
        plan.criticalAql == null
          ? ""
          : String(plan.criticalAql),
      majorAql: String(plan.majorAql ?? ""),
      minorAql: String(plan.minorAql ?? ""),
      description: plan.description || "",
      status: plan.status || "Active"
    });

    setEditingId(plan._id);
    setShowForm(true);
    setViewPlan(null);
    setError("");
    setMessage("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancel = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
    setError("");
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (saving || (editingId ? !canUpdate : !canCreate)) {
      return;
    }

    if (
      !form.planCode.trim() ||
      !form.planName.trim()
    ) {
      setError("Plan Code and Plan Name are required");
      return;
    }

    if (
      !Number.isFinite(Number(form.majorAql)) ||
      Number(form.majorAql) <= 0 ||
      !Number.isFinite(Number(form.minorAql)) ||
      Number(form.minorAql) <= 0
    ) {
      setError("Enter valid Major and Minor AQL values");
      return;
    }

    if (
      form.criticalPolicy === "AQL" &&
      (
        !form.criticalAql ||
        Number(form.criticalAql) <= 0
      )
    ) {
      setError("Enter a valid Critical AQL value");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...form,
        majorAql: Number(form.majorAql),
        minorAql: Number(form.minorAql),
        criticalAql:
          form.criticalPolicy === "AQL"
            ? Number(form.criticalAql)
            : null
      };

      if (editingId) {
        delete payload.planCode;
      }

      const data = await request(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload)
        }
      );

      setMessage(
        data.message || "AQL Sampling Plan saved successfully"
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });

      await loadPlans();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredPlans = plans.filter((plan) => {
    if (
      statusFilter !== "All" &&
      plan.status !== statusFilter
    ) {
      return false;
    }

    const query = search.toLowerCase();

    return [
      plan.planCode,
      plan.planName,
      plan.standard,
      plan.inspectionLevel,
      plan.inspectionSeverity
    ].some((value) =>
      String(value || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className="aql-page">
      <div className="aql-header">
        <div>
          <h1>AQL Sampling Plans</h1>
          <p>
            Configure AQL inspection plans, inspection
            levels and defect-category limits.
          </p>
        </div>

        {canCreate && !showForm && (
          <button
            type="button"
            className="aql-primary-btn"
            onClick={handleAdd}
          >
            + Add AQL Plan
          </button>
        )}
      </div>

      {message && (
        <div className="aql-success">{message}</div>
      )}

      {error && (
        <div className="aql-error">{error}</div>
      )}

      {showForm && (
        <div className="aql-card">
          <h2>
            {editingId
              ? "Edit AQL Sampling Plan"
              : "New AQL Sampling Plan"}
          </h2>

          <form onSubmit={handleSave}>
            <div className="aql-form-grid">
              <label>
                Plan Code *
                <input
                  name="planCode"
                  value={form.planCode}
                  onChange={handleChange}
                  readOnly={Boolean(editingId)}
                  required
                />
              </label>

              <label>
                Plan Name *
                <input
                  name="planName"
                  value={form.planName}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Standard *
                <select
                  name="standard"
                  value={form.standard}
                  onChange={handleChange}
                >
                  <option value="ISO 2859-1">
                    ISO 2859-1
                  </option>
                  <option value="ANSI/ASQ Z1.4">
                    ANSI/ASQ Z1.4
                  </option>
                </select>
              </label>

              <label>
                Inspection Severity *
                <select
                  name="inspectionSeverity"
                  value={form.inspectionSeverity}
                  onChange={handleChange}
                >
                  <option value="Normal">Normal</option>
                  <option value="Tightened">
                    Tightened
                  </option>
                  <option value="Reduced">Reduced</option>
                </select>
              </label>

              <label>
                Inspection Level *
                <select
                  name="inspectionLevel"
                  value={form.inspectionLevel}
                  onChange={handleChange}
                >
                  <option value="I">General I</option>
                  <option value="II">General II</option>
                  <option value="III">General III</option>
                  <option value="S-1">Special S-1</option>
                  <option value="S-2">Special S-2</option>
                  <option value="S-3">Special S-3</option>
                  <option value="S-4">Special S-4</option>
                </select>
              </label>

              <label>
                Critical Defect Policy *
                <select
                  name="criticalPolicy"
                  value={form.criticalPolicy}
                  onChange={handleChange}
                >
                  <option value="Zero Acceptance">
                    Zero Acceptance
                  </option>
                  <option value="AQL">AQL</option>
                </select>
              </label>

              {form.criticalPolicy === "AQL" && (
                <label>
                  Critical AQL *
                  <input
                    name="criticalAql"
                    type="number"
                    min="0.000001"
                    step="any"
                    value={form.criticalAql}
                    onChange={handleChange}
                    required
                  />
                </label>
              )}

              <label>
                Major AQL *
                <input
                  name="majorAql"
                  type="number"
                  min="0.000001"
                  step="any"
                  value={form.majorAql}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Minor AQL *
                <input
                  name="minorAql"
                  type="number"
                  min="0.000001"
                  step="any"
                  value={form.minorAql}
                  onChange={handleChange}
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
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <label className="aql-full-width">
                Description
                <textarea
                  name="description"
                  rows={3}
                  value={form.description}
                  onChange={handleChange}
                />
              </label>
            </div>

            <p className="aql-note">
              AQL sample-size and acceptance tables will
              be configured in the next development step.
              Saving this plan does not calculate sample
              sizes or approve inspection lots.
            </p>

            <div className="aql-actions">
              <button
                type="button"
                className="aql-secondary-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="aql-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Plan"
                    : "Save Plan"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="aql-card">
        <div className="aql-toolbar">
          <h2>AQL Sampling Plan List</h2>

          <div className="aql-filters">
            <input
              type="search"
              placeholder="Search AQL plans..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>

            <button
              type="button"
              className="aql-secondary-btn"
              onClick={loadPlans}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="aql-table-wrap">
          <table className="aql-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Plan Code</th>
                <th>Plan Name</th>
                <th>Standard</th>
                <th>Severity</th>
                <th>Level</th>
                <th>Critical</th>
                <th>Major</th>
                <th>Minor</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11}>Loading AQL plans...</td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={11}>
                    No AQL Sampling Plans found
                  </td>
                </tr>
              ) : (
                filteredPlans.map((plan, index) => (
                  <tr key={plan._id}>
                    <td>{index + 1}</td>
                    <td>{plan.planCode}</td>
                    <td>{plan.planName}</td>
                    <td>{plan.standard}</td>
                    <td>{plan.inspectionSeverity}</td>
                    <td>{plan.inspectionLevel}</td>
                    <td>
                      {plan.criticalPolicy ===
                      "Zero Acceptance"
                        ? "Zero Acceptance"
                        : plan.criticalAql}
                    </td>
                    <td>{plan.majorAql}</td>
                    <td>{plan.minorAql}</td>
                    <td>{plan.status}</td>
                    <td>
                      <div className="aql-row-actions">
                        <button
                          type="button"
                          onClick={() => setViewPlan(plan)}
                        >
                          View
                        </button>

                        {canUpdate && (
                          <button
                            type="button"
                            onClick={() => handleEdit(plan)}
                          >
                            Edit
                          </button>
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

      {viewPlan && (
        <div className="aql-overlay">
          <div
            className="aql-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aql-view-title"
          >
            <h2 id="aql-view-title">
              AQL Sampling Plan Details
            </h2>

            <div className="aql-detail-grid">
              {[
                ["Plan Code", viewPlan.planCode],
                ["Plan Name", viewPlan.planName],
                ["Standard", viewPlan.standard],
                ["Severity", viewPlan.inspectionSeverity],
                ["Inspection Level", viewPlan.inspectionLevel],
                ["Critical Policy", viewPlan.criticalPolicy],
                [
                  "Critical AQL",
                  viewPlan.criticalAql ?? "-"
                ],
                ["Major AQL", viewPlan.majorAql],
                ["Minor AQL", viewPlan.minorAql],
                ["Status", viewPlan.status],
                [
                  "Description",
                  viewPlan.description || "-"
                ]
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>

            <div className="aql-actions">
              <button
                type="button"
                className="aql-secondary-btn"
                onClick={() => setViewPlan(null)}
              >
                Close
              </button>

              {canUpdate && (
                <button
                  type="button"
                  className="aql-primary-btn"
                  onClick={() => handleEdit(viewPlan)}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AqlSamplingPlans;
