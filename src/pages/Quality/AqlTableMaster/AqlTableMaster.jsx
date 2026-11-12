


import { useCallback, useEffect, useMemo, useState } from "react";
import "./AqlTableMaster.css";

const API_BASE = "http://localhost:1700/api/aql-tables";

const TYPES = [
  { value: "code-letters", label: "Code Letters" },
  { value: "acceptance-rules", label: "Acceptance Rules" }
];

const STANDARDS = ["ISO 2859-1", "ANSI/ASQ Z1.4"];
const LEVELS = ["I", "II", "III", "S-1", "S-2", "S-3", "S-4"];
const SEVERITIES = ["Normal", "Tightened", "Reduced"];
const STATUSES = ["Draft", "Approved", "Active", "Inactive"];

const createEmptyForm = (type) => ({
  standard: "ISO 2859-1",
  standardEdition: "1999",
  inspectionLevel: "II",
  inspectionSeverity: "Normal",
  lotSizeMin: "",
  lotSizeMax: "",
  codeLetter: "",
  aqlValue: "",
  sampleSize: "",
  acceptanceNumber: "",
  rejectionNumber: "",
  sourceReference: ""
});

const isTestData = (record) =>
  /fictional|test data|demo|sample only/i.test(
    record?.sourceReference || ""
  );

const AqlTableMaster = () => {
  const [type, setType] = useState("code-letters");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [editionFilter, setEditionFilter] = useState("All");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createEmptyForm("code-letters"));
  const [viewRecord, setViewRecord] = useState(null);

  const getToken = () => sessionStorage.getItem("iqms_token");

  const apiRequest = async (path, options = {}) => {
    const token = getToken();

    if (!token) {
      throw new Error("Session expired. Please log in again.");
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.message || `Request failed (${response.status})`
      );
    }

    return data;
  };

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = sessionStorage.getItem("iqms_token");

      if (!token) {
        throw new Error("Session expired. Please log in again.");
      }

      const response = await fetch(`${API_BASE}/${type}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Unable to load AQL records");
      }

      setRecords(Array.isArray(data.records) ? data.records : []);
    } catch (err) {
      setError(err.message);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const changeType = (nextType) => {
    setType(nextType);
    setShowForm(false);
    setEditingId(null);
    setViewRecord(null);
    setSearch("");
    setStatusFilter("All");
    setEditionFilter("All");
    setForm(createEmptyForm(nextType));
    setMessage("");
    setError("");
  };

  const updateField = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value
    }));
  };

  const openAdd = () => {
    setForm(createEmptyForm(type));
    setEditingId(null);
    setViewRecord(null);
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const openEdit = (record) => {
    if (record.status !== "Draft") {
      setError("Only Draft records can be edited.");
      return;
    }

    setForm({
      ...createEmptyForm(type),
      ...record
    });

    setEditingId(record._id);
    setViewRecord(null);
    setShowForm(true);
    setError("");
    setMessage("");
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(createEmptyForm(type));
  };

  const validateForm = () => {
    if (!STANDARDS.includes(form.standard)) {
      return "Select a valid standard.";
    }

    if (!/^\d{4}$/.test(String(form.standardEdition))) {
      return "Edition must be a four-digit year.";
    }

    if (!/^[A-Za-z]$/.test(String(form.codeLetter).trim())) {
      return "Code letter must contain one letter.";
    }

    if (!String(form.sourceReference).trim()) {
      return "Source reference is required.";
    }

    if (type === "code-letters") {
      const min = Number(form.lotSizeMin);
      const max = Number(form.lotSizeMax);

      if (
        !Number.isSafeInteger(min) ||
        !Number.isSafeInteger(max) ||
        min < 1 ||
        max < min
      ) {
        return "Enter a valid lot size range.";
      }
    } else {
      const aql = Number(form.aqlValue);
      const sample = Number(form.sampleSize);
      const ac = Number(form.acceptanceNumber);
      const re = Number(form.rejectionNumber);

      if (
        form.aqlValue === "" ||
        !Number.isFinite(aql) ||
        aql <= 0
      ) {
        return "AQL must be greater than zero.";
      }

      if (
        form.sampleSize === "" ||
        form.acceptanceNumber === "" ||
        form.rejectionNumber === "" ||
        !Number.isSafeInteger(sample) ||
        !Number.isSafeInteger(ac) ||
        !Number.isSafeInteger(re) ||
        sample < 1 ||
        ac < 0 ||
        re <= ac ||
        ac >= sample
      ) {
        return "Enter valid sample size and Ac/Re numbers.";
      }
    }

    return "";
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const common = {
      standard: form.standard,
      standardEdition: String(form.standardEdition).trim(),
      codeLetter: String(form.codeLetter).trim().toUpperCase(),
      sourceReference: String(form.sourceReference).trim()
    };

    const payload =
      type === "code-letters"
        ? {
            ...common,
            inspectionLevel: form.inspectionLevel,
            lotSizeMin: Number(form.lotSizeMin),
            lotSizeMax: Number(form.lotSizeMax)
          }
        : {
            ...common,
            inspectionSeverity: form.inspectionSeverity,
            aqlValue: Number(form.aqlValue),
            sampleSize: Number(form.sampleSize),
            acceptanceNumber: Number(form.acceptanceNumber),
            rejectionNumber: Number(form.rejectionNumber)
          };

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const isEditing = Boolean(editingId);
      const path = isEditing
        ? `/${type}/${editingId}`
        : `/${type}`;

      const data = await apiRequest(path, {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });

      setMessage(data.message || "Record saved successfully.");
      cancelForm();
      await loadRecords();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (record, action) => {
    if (action === "approve" && isTestData(record)) {
      setError(
        "Fictional test data cannot be approved. " +
        "Use a separately verified source record."
      );
      return;
    }

    const labels = {
      approve: "approve",
      activate: "activate",
      deactivate: "deactivate"
    };

    const confirmed = window.confirm(
      `Are you sure you want to ${labels[action]} ` +
      `code ${record.codeLetter}?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const data = await apiRequest(
        `/${type}/${record._id}/${action}`,
        { method: "POST" }
      );

      setMessage(data.message || "Status updated successfully.");
      setViewRecord(null);
      await loadRecords();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const editions = useMemo(
    () => [
      "All",
      ...new Set(
        records.map((record) => record.standardEdition || "Unspecified")
      )
    ],
    [records]
  );

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return records.filter((record) => {
      if (
        statusFilter !== "All" &&
        record.status !== statusFilter
      ) {
        return false;
      }

      if (
        editionFilter !== "All" &&
        (record.standardEdition || "Unspecified") !== editionFilter
      ) {
        return false;
      }

      if (!query) return true;

      return [
        record.standard,
        record.standardEdition,
        record.inspectionLevel,
        record.inspectionSeverity,
        record.codeLetter,
        record.aqlValue,
        record.sourceReference,
        record.status
      ]
        .filter((value) => value !== null && value !== undefined)
        .some((value) =>
          String(value).toLowerCase().includes(query)
        );
    });
  }, [records, search, statusFilter, editionFilter]);

  const summary = useMemo(
    () => ({
      total: records.length,
      draft: records.filter((r) => r.status === "Draft").length,
      approved: records.filter((r) => r.status === "Approved").length,
      active: records.filter((r) => r.status === "Active").length
    }),
    [records]
  );

  const renderActions = (record) => (
    <div className="aqltm-actions">
      <button
        type="button"
        className="aqltm-btn aqltm-btn-light"
        onClick={() => setViewRecord(record)}
      >
        View
      </button>

      {record.status === "Draft" && (
        <>
          <button
            type="button"
            className="aqltm-btn aqltm-btn-light"
            onClick={() => openEdit(record)}
            disabled={saving}
          >
            Edit
          </button>

          <button
            type="button"
            className="aqltm-btn aqltm-btn-primary"
            onClick={() => handleAction(record, "approve")}
            disabled={saving || isTestData(record)}
            title={
              isTestData(record)
                ? "Fictional test data cannot be approved"
                : "Approve verified record"
            }
          >
            Approve
          </button>
        </>
      )}

      {record.status === "Approved" && (
        <button
          type="button"
          className="aqltm-btn aqltm-btn-success"
          onClick={() => handleAction(record, "activate")}
          disabled={saving}
        >
          Activate
        </button>
      )}

      {record.status === "Active" && (
        <button
          type="button"
          className="aqltm-btn aqltm-btn-danger"
          onClick={() => handleAction(record, "deactivate")}
          disabled={saving}
        >
          Deactivate
        </button>
      )}
    </div>
  );

  return (
    <div className="aqltm-page">
      <div className="aqltm-header">
        <div>
          <h2>AQL Table Master</h2>
          <p>
            Manage code letters and acceptance rules for
            configurable inspection sampling.
          </p>
        </div>

        <div className="aqltm-header-actions">
          <button
            type="button"
            className="aqltm-btn aqltm-btn-light"
            onClick={loadRecords}
            disabled={loading}
          >
            Refresh
          </button>

          <button
            type="button"
            className="aqltm-btn aqltm-btn-primary"
            onClick={openAdd}
          >
            + Add Record
          </button>
        </div>
      </div>

      <div className="aqltm-notice">
        Only authorized, verified reference data should be
        approved for operational use. Demo records must
        remain in Draft status.
      </div>

      {error && (
        <div className="aqltm-alert aqltm-alert-error">
          {error}
        </div>
      )}

      {message && (
        <div className="aqltm-alert aqltm-alert-success">
          {message}
        </div>
      )}

      <div className="aqltm-summary">
        {[
          ["Total", summary.total],
          ["Draft", summary.draft],
          ["Approved", summary.approved],
          ["Active", summary.active]
        ].map(([label, value]) => (
          <div className="aqltm-summary-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <div className="aqltm-tabs">
        {TYPES.map((tab) => (
          <button
            type="button"
            key={tab.value}
            className={
              type === tab.value
                ? "aqltm-tab aqltm-tab-active"
                : "aqltm-tab"
            }
            onClick={() => changeType(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="aqltm-toolbar">
        <input
          type="search"
          placeholder="Search records..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
        >
          <option value="All">All Statuses</option>
          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          value={editionFilter}
          onChange={(event) =>
            setEditionFilter(event.target.value)
          }
        >
          {editions.map((edition) => (
            <option key={edition} value={edition}>
              {edition === "All" ? "All Editions" : edition}
            </option>
          ))}
        </select>
      </div>

      <div className="aqltm-table-wrap">
        <table className="aqltm-table">
          <thead>
            {type === "code-letters" ? (
              <tr>
                <th>Standard</th>
                <th>Edition</th>
                <th>Level</th>
                <th>Lot Range</th>
                <th>Code</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            ) : (
              <tr>
                <th>Standard</th>
                <th>Edition</th>
                <th>Severity</th>
                <th>Code</th>
                <th>AQL</th>
                <th>Sample</th>
                <th>Ac / Re</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            )}
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={type === "code-letters" ? 7 : 9}
                  className="aqltm-empty"
                >
                  Loading records...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={type === "code-letters" ? 7 : 9}
                  className="aqltm-empty"
                >
                  No matching AQL records found.
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) =>
                type === "code-letters" ? (
                  <tr key={record._id}>
                    <td>{record.standard}</td>
                    <td>{record.standardEdition || "—"}</td>
                    <td>{record.inspectionLevel}</td>
                    <td>
                      {record.lotSizeMin} – {record.lotSizeMax}
                    </td>
                    <td>
                      <strong>{record.codeLetter}</strong>
                    </td>
                    <td>
                      <span
                        className={`aqltm-status aqltm-status-${record.status?.toLowerCase()}`}
                      >
                        {record.status || "Legacy"}
                      </span>
                    </td>
                    <td>{renderActions(record)}</td>
                  </tr>
                ) : (
                  <tr key={record._id}>
                    <td>{record.standard}</td>
                    <td>{record.standardEdition || "—"}</td>
                    <td>{record.inspectionSeverity}</td>
                    <td>
                      <strong>{record.codeLetter}</strong>
                    </td>
                    <td>{record.aqlValue}</td>
                    <td>{record.sampleSize}</td>
                    <td>
                      {record.acceptanceNumber} /{" "}
                      {record.rejectionNumber}
                    </td>
                    <td>
                      <span
                        className={`aqltm-status aqltm-status-${record.status?.toLowerCase()}`}
                      >
                        {record.status || "Legacy"}
                      </span>
                    </td>
                    <td>{renderActions(record)}</td>
                  </tr>
                )
              )
            )}
          </tbody>
        </table>
      </div>

      <p className="aqltm-footer">
        Showing {filteredRecords.length} of {records.length} records
      </p>

      {showForm && (
        <div className="aqltm-overlay">
          <div className="aqltm-modal">
            <div className="aqltm-modal-header">
              <h3>
                {editingId ? "Edit" : "Add"}{" "}
                {type === "code-letters"
                  ? "Code Letter"
                  : "Acceptance Rule"}
              </h3>
              <button
                type="button"
                className="aqltm-close"
                onClick={cancelForm}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="aqltm-form-grid">
                <label>
                  Standard
                  <select
                    value={form.standard}
                    onChange={(event) =>
                      updateField("standard", event.target.value)
                    }
                  >
                    {STANDARDS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Edition
                  <input
                    value={form.standardEdition}
                    onChange={(event) =>
                      updateField(
                        "standardEdition",
                        event.target.value
                      )
                    }
                    required
                  />
                </label>

                {type === "code-letters" ? (
                  <>
                    <label>
                      Inspection Level
                      <select
                        value={form.inspectionLevel}
                        onChange={(event) =>
                          updateField(
                            "inspectionLevel",
                            event.target.value
                          )
                        }
                      >
                        {LEVELS.map((level) => (
                          <option key={level}>{level}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Lot Size Minimum
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.lotSizeMin}
                        onChange={(event) =>
                          updateField(
                            "lotSizeMin",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>

                    <label>
                      Lot Size Maximum
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.lotSizeMax}
                        onChange={(event) =>
                          updateField(
                            "lotSizeMax",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>
                  </>
                ) : (
                  <>
                    <label>
                      Inspection Severity
                      <select
                        value={form.inspectionSeverity}
                        onChange={(event) =>
                          updateField(
                            "inspectionSeverity",
                            event.target.value
                          )
                        }
                      >
                        {SEVERITIES.map((severity) => (
                          <option key={severity}>
                            {severity}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      AQL Value
                      <input
                        type="number"
                        min="0.000001"
                        step="any"
                        value={form.aqlValue}
                        onChange={(event) =>
                          updateField(
                            "aqlValue",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>

                    <label>
                      Sample Size
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.sampleSize}
                        onChange={(event) =>
                          updateField(
                            "sampleSize",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>

                    <label>
                      Acceptance Number (Ac)
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.acceptanceNumber}
                        onChange={(event) =>
                          updateField(
                            "acceptanceNumber",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>

                    <label>
                      Rejection Number (Re)
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={form.rejectionNumber}
                        onChange={(event) =>
                          updateField(
                            "rejectionNumber",
                            event.target.value
                          )
                        }
                        required
                      />
                    </label>
                  </>
                )}

                <label>
                  Code Letter
                  <input
                    maxLength="1"
                    value={form.codeLetter}
                    onChange={(event) =>
                      updateField(
                        "codeLetter",
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="e.g. X"
                    required
                  />
                </label>

                <label className="aqltm-full">
                  Source Reference
                  <input
                    value={form.sourceReference}
                    onChange={(event) =>
                      updateField(
                        "sourceReference",
                        event.target.value
                      )
                    }
                    placeholder="Authorized source or FICTIONAL TEST DATA"
                    required
                  />
                </label>
              </div>

              <div className="aqltm-modal-actions">
                <button
                  type="button"
                  className="aqltm-btn aqltm-btn-light"
                  onClick={cancelForm}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="aqltm-btn aqltm-btn-primary"
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
        </div>
      )}

      {viewRecord && (
        <div className="aqltm-overlay">
          <div className="aqltm-modal aqltm-details-modal">
            <div className="aqltm-modal-header">
              <h3>AQL Record Details</h3>
              <button
                type="button"
                className="aqltm-close"
                onClick={() => setViewRecord(null)}
              >
                ×
              </button>
            </div>

            <div className="aqltm-details">
              {[
                ["Standard", viewRecord.standard],
                ["Edition", viewRecord.standardEdition],
                ["Inspection Level", viewRecord.inspectionLevel],
                ["Severity", viewRecord.inspectionSeverity],
                ["Lot Minimum", viewRecord.lotSizeMin],
                ["Lot Maximum", viewRecord.lotSizeMax],
                ["Code Letter", viewRecord.codeLetter],
                ["AQL", viewRecord.aqlValue],
                ["Sample Size", viewRecord.sampleSize],
                ["Acceptance Number", viewRecord.acceptanceNumber],
                ["Rejection Number", viewRecord.rejectionNumber],
                ["Source", viewRecord.sourceReference],
                ["Status", viewRecord.status],
                ["Verified", viewRecord.verified ? "Yes" : "No"],
                [
                  "Approved At",
                  viewRecord.approvedAt
                    ? new Date(viewRecord.approvedAt).toLocaleString()
                    : "—"
                ],
                [
                  "Activated At",
                  viewRecord.activatedAt
                    ? new Date(viewRecord.activatedAt).toLocaleString()
                    : "—"
                ]
              ]
                .filter(([, value]) =>
                  value !== null && value !== undefined
                )
                .map(([label, value]) => (
                  <div className="aqltm-detail-row" key={label}>
                    <span>{label}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))}
            </div>

            <div className="aqltm-modal-actions">
              <button
                type="button"
                className="aqltm-btn aqltm-btn-light"
                onClick={() => setViewRecord(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AqlTableMaster;
