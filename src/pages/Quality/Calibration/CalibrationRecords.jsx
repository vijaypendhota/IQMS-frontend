
import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import "./CalibrationRecords.css";

import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { hasPermission } from "../../../utils/permissions";

const BASE = "http://localhost:1700/api";

const emptyForm = {
  instrumentId: "",
  calibrationType: "Internal",
  calibrationLocation: "",
  calibrationDate: "",
  calibrationTime: "",
  calibrationReason: "Scheduled",
  nextDueDate: "",
  result: "Pass",
  certificateNumber: "",
  calibrationAgency: "",
  performedBy: "",
  remarks: ""
};

const getId = (value) =>
  value && typeof value === "object"
    ? value._id || ""
    : value || "";

const dateOnly = (value) =>
  value ? String(value).slice(0, 10) : "";

const CalibrationRecords = () => {
  const { user } = useCurrentUser();

  const canCreate = hasPermission(user, "calibration.create");
  const canUpdate = hasPermission(user, "calibration.update");
  const canApprove = hasPermission(user, "calibration.approve");

  const [records, setRecords] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [statuses, setStatuses] = useState({});

  const [form, setForm] = useState({ ...emptyForm });
  const [certificateFile, setCertificateFile] = useState(null);
  const [existingCertificate, setExistingCertificate] =
    useState(null);

  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewRecord, setViewRecord] = useState(null);
  const [reviewRecord, setReviewRecord] = useState(null);
  const [reviewDecision, setReviewDecision] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const menuRef = useRef(null);
  const fileInputRef = useRef(null);

  const request = useCallback(async (url, options = {}) => {
    const token = sessionStorage.getItem("iqms_token");

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(
          options.body instanceof FormData
            ? {}
            : { "Content-Type": "application/json" }
        ),
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

  const loadData = useCallback(async () => {
    const [recordData, instrumentData] = await Promise.all([
      request(`${BASE}/calibration-records`),
      request(`${BASE}/test-instruments`)
    ]);

    const nextRecords = recordData.records || [];
    const nextInstruments = instrumentData.instruments || [];

    setRecords(nextRecords);
    setInstruments(nextInstruments);

    const results = await Promise.allSettled(
      nextInstruments.map((instrument) =>
        request(
          `${BASE}/calibration-records/status/${instrument._id}`
        )
      )
    );

    const nextStatuses = {};

    results.forEach((result, index) => {
      nextStatuses[nextInstruments[index]._id] =
        result.status === "fulfilled"
          ? result.value
          : { calibrationStatus: "Unavailable" };
    });

    setStatuses(nextStatuses);
  }, [request]);

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);

      try {
        await loadData();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [loadData]);

  useEffect(() => {
    const outsideClick = (event) => {
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
        setViewRecord(null);
        if (!saving) setReviewRecord(null);
      }
    };

    document.addEventListener("mousedown", outsideClick);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("mousedown", outsideClick);
      document.removeEventListener("keydown", escape);
    };
  }, [saving]);

  const clearMessages = () => {
    setError("");
    setMessage("");
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setCertificateFile(null);
    setExistingCertificate(null);
    setEditingId(null);
    setShowForm(false);
    setOpenMenuId(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    clearMessages();
  };

  const instrumentLabel = (record) => {
    const id = getId(record.instrumentId);

    const instrument =
      instruments.find((item) => item._id === id) ||
      (
        typeof record.instrumentId === "object"
          ? record.instrumentId
          : null
      );

    return instrument
      ? `${instrument.instrumentCode} - ${instrument.instrumentName}`
      : "Unknown instrument";
  };

  const getCalibrationStatus = (record) =>
    statuses[getId(record.instrumentId)]
      ?.calibrationStatus || "Unavailable";

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "calibrationType" && value === "Internal"
        ? { calibrationAgency: "" }
        : {})
    }));
  };

  const handleAdd = () => {
    if (!canCreate) return;

    resetForm();
    setShowForm(true);
  };

  const handleEdit = (record) => {
    if (!canUpdate || record.approvalStatus !== "Draft") {
      return;
    }

    setForm({
      instrumentId: getId(record.instrumentId),
      calibrationType:
        record.calibrationType || "Internal",
      calibrationLocation:
        record.calibrationLocation || "",
      calibrationDate: dateOnly(record.calibrationDate),
      calibrationTime: record.calibrationTime || "",
      calibrationReason: record.calibrationReason || "Scheduled",
      nextDueDate: dateOnly(record.nextDueDate),
      result: record.result || "Pass",
      certificateNumber:
        record.certificateNumber || "",
      calibrationAgency:
        record.calibrationAgency || "",
      performedBy: record.performedBy || "",
      remarks: record.remarks || ""
    });

    setExistingCertificate(record.certificate || null);
    setCertificateFile(null);
    setEditingId(record._id);
    setShowForm(true);
    setViewRecord(null);
    setOpenMenuId(null);
    clearMessages();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (!file) {
      setCertificateFile(null);
      return;
    }

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png"
    ];

    if (
      !allowed.includes(file.type) ||
      file.size > 10 * 1024 * 1024
    ) {
      setError(
        "Choose a PDF, JPG or PNG file up to 10 MB"
      );

      event.target.value = "";
      setCertificateFile(null);
      return;
    }

    setError("");
    setCertificateFile(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (editingId ? !canUpdate : !canCreate) return;

    setSaving(true);
    clearMessages();

    try {
      const body = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value ?? "");
      });

      if (certificateFile) {
        body.append("certificate", certificateFile);
      }

      const data = await request(
        editingId
          ? `${BASE}/calibration-records/${editingId}`
          : `${BASE}/calibration-records`,
        {
          method: editingId ? "PUT" : "POST",
          body
        }
      );

      const success = data.msg || "Calibration saved";

      resetForm();
      await loadData();
      setMessage(success);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openReview = (record, decision) => {
    if (!canApprove) return;

    setReviewRecord(record);
    setReviewDecision(decision);
    setRejectionReason("");
    setOpenMenuId(null);
    clearMessages();
  };

  const handleReview = async () => {
    if (!reviewRecord || saving || !canApprove) return;

    setSaving(true);
    clearMessages();

    try {
      const data = await request(
        `${BASE}/calibration-records/${reviewRecord._id}/review`,
        {
          method: "PATCH",
          body: JSON.stringify({
            decision: reviewDecision,
            rejectionReason
          })
        }
      );

      setReviewRecord(null);
      setRejectionReason("");

      await loadData();
      setMessage(data.msg || "Review completed");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCertificate = async (record, download) => {
    setError("");

    try {
      const token = sessionStorage.getItem("iqms_token");

      const response = await fetch(
        `${BASE}/calibration-records/${record._id}/certificate${download ? "?download=true" : ""}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(
          () => ({})
        );

        throw new Error(
          data.msg || "Unable to access certificate"
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;

      if (download) {
        link.download =
          record.certificate?.originalName ||
          "calibration-certificate";
      } else {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
      }

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Allow the browser time to open/download the blob.
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = records.filter((record) =>
    [
      instrumentLabel(record),
      record.calibrationType,
      record.calibrationTime,
      record.calibrationReason,
      record.calibrationLocation,
      record.certificateNumber,
      record.calibrationAgency,
      record.performedBy,
      record.result,
      record.approvalStatus
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  return (
    <div className="cal-page">
      <div className="cal-header">
        <div>
          <h1>Calibration Records</h1>
          <p>
            Manage calibration history, certificates,
            and approval.
          </p>
        </div>

        {canCreate && !showForm && (
          <button
            type="button"
            className="cal-primary-btn"
            onClick={handleAdd}
          >
            + Add Calibration
          </button>
        )}
      </div>

      {error && (
        <div className="cal-error" role="alert">
          {error}
        </div>
      )}

      {message && (
        <div className="cal-success" role="status">
          {message}
        </div>
      )}

      {showForm && (
        <div className="cal-card">
          <h2>
            {editingId
              ? "Edit Calibration Record"
              : "Add Calibration Record"}
          </h2>

          <form onSubmit={handleSave}>
            <div className="cal-form-grid">
              <label>
                Instrument *
                <select
                  name="instrumentId"
                  value={form.instrumentId}
                  onChange={handleChange}
                  disabled={Boolean(editingId)}
                  required
                >
                  <option value="">Select Instrument</option>

                  {instruments
                    .filter(
                      (item) =>
                        (
                          item.status === "Active" &&
                          item.calibrationRequired
                        ) ||
                        item._id === form.instrumentId
                    )
                    .map((item) => (
                      <option
                        key={item._id}
                        value={item._id}
                      >
                        {item.instrumentCode} -{" "}
                        {item.instrumentName}
                      </option>
                    ))}
                </select>
              </label>

              <label>
                Calibration Type *
                <select
                  name="calibrationType"
                  value={form.calibrationType}
                  onChange={handleChange}
                >
                  <option value="Internal">Internal</option>
                  <option value="External">External</option>
                </select>
              </label>

              <label>
                Calibration Location *
                <input
                  name="calibrationLocation"
                  value={form.calibrationLocation}
                  onChange={handleChange}
                  placeholder={
                    form.calibrationType === "Internal"
                      ? "Quality Lab"
                      : "External Calibration Laboratory"
                  }
                  required
                />
              </label>

              {form.calibrationType === "External" && (
                <label>
                  Calibration Agency *
                  <input
                    name="calibrationAgency"
                    value={form.calibrationAgency}
                    onChange={handleChange}
                    placeholder="ABC Calibration Laboratory"
                    required
                  />
                </label>
              )}

              <label>
                Calibration Result *
                <select
                  name="result"
                  value={form.result}
                  onChange={handleChange}
                >
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </select>
              </label>

              <label>
                Calibration Date *
                <input
                  type="date"
                  name="calibrationDate"
                  value={form.calibrationDate}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Calibration Time *
                <input
                  type="time"
                  name="calibrationTime"
                  value={form.calibrationTime}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Calibration Reason *
                <select
                  name="calibrationReason"
                  value={form.calibrationReason}
                  onChange={handleChange}
                  required
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Recalibration After Failure">
                    Recalibration After Failure
                  </option>
                  <option value="After Repair">After Repair</option>
                  <option value="After Adjustment">After Adjustment</option>
                  <option value="Verification">Verification</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label>
                Next Calibration Due *
                <input
                  type="date"
                  name="nextDueDate"
                  value={form.nextDueDate}
                  onChange={handleChange}
                  min={form.calibrationDate || undefined}
                  required
                />
              </label>

              <label>
                Certificate Number
                <input
                  name="certificateNumber"
                  value={form.certificateNumber}
                  onChange={handleChange}
                  placeholder="CAL-2026-001"
                />
              </label>

              <label>
                Performed By *
                <input
                  name="performedBy"
                  value={form.performedBy}
                  onChange={handleChange}
                  placeholder="Technician name"
                  required
                />
              </label>

              <label className="cal-full">
                Remarks
                <textarea
                  name="remarks"
                  rows={3}
                  value={form.remarks}
                  onChange={handleChange}
                  placeholder="Calibration observations"
                />
              </label>

              <label className="cal-full">
                Calibration Certificate / Report
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                />

                <small>
                  PDF, JPG or PNG. Maximum 10 MB.
                  Required before approval.
                </small>

                {existingCertificate?.storedName && (
                  <span className="cal-file-note">
                    Current file:{" "}
                    {existingCertificate.originalName}
                    <br />
                    Selecting a new file will replace it
                    when you update the Draft.
                  </span>
                )}

                {certificateFile && (
                  <span className="cal-file-note">
                    Selected: {certificateFile.name}
                  </span>
                )}
              </label>
            </div>

            <div className="cal-actions">
              <button
                type="button"
                className="cal-secondary-btn"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="cal-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Calibration"
                    : "Save Calibration"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="cal-card">
        <div className="cal-toolbar">
          <h2>Calibration History</h2>

          <input
            type="search"
            placeholder="Search calibration records..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <div className="cal-table-scroll">
          <table className="cal-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Instrument</th>
                <th>Type</th>
                <th>Calibration Date</th>
                <th>Time</th>
                <th>Reason</th>
                <th>Due Date</th>
                <th>Result</th>
                <th>Certificate</th>
                <th>Approval</th>
                <th>Current Validity</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12}>Loading...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    No calibration records found
                  </td>
                </tr>
              ) : (
                filtered.map((record, index) => (
                  <tr key={record._id}>
                    <td>{index + 1}</td>
                    <td>{instrumentLabel(record)}</td>
                    <td>
                      {record.calibrationType || "Internal"}
                    </td>
                    <td>
                      {dateOnly(record.calibrationDate)}
                    </td>
                    <td>{record.calibrationTime || "Not recorded"}</td>
                    <td>{record.calibrationReason || "Not recorded"}</td>
                    <td>
                      {dateOnly(record.nextDueDate)}
                    </td>
                    <td>{record.result}</td>
                    <td>
                      {record.certificate?.storedName
                        ? "Attached"
                        : "Missing"}
                    </td>
                    <td>
                      <span
                        className={`cal-status cal-status-${record.approvalStatus.toLowerCase()}`}
                      >
                        {record.approvalStatus}
                      </span>
                    </td>
                    <td>
                      {getCalibrationStatus(record)}
                    </td>
                    <td>
                      <div
                        className="cal-menu-wrapper"
                        ref={
                          openMenuId === record._id
                            ? menuRef
                            : null
                        }
                      >
                        <button
                          type="button"
                          className="cal-menu-button"
                          aria-label="Calibration actions"
                          aria-expanded={
                            openMenuId === record._id
                          }
                          onClick={() =>
                            setOpenMenuId((previous) =>
                              previous === record._id
                                ? null
                                : record._id
                            )
                          }
                        >
                          &#8942;
                        </button>

                        {openMenuId === record._id && (
                          <div className="cal-dropdown">
                            <button
                              type="button"
                              onClick={() => {
                                setViewRecord(record);
                                setOpenMenuId(null);
                              }}
                            >
                              View Details
                            </button>

                            {record.certificate?.storedName && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleCertificate(
                                      record,
                                      false
                                    );
                                  }}
                                >
                                  View Certificate
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleCertificate(
                                      record,
                                      true
                                    );
                                  }}
                                >
                                  Download Certificate
                                </button>
                              </>
                            )}

                            {canUpdate &&
                              record.approvalStatus ===
                                "Draft" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleEdit(record)
                                  }
                                >
                                  Edit
                                </button>
                              )}

                            {canApprove &&
                              record.approvalStatus ===
                                "Draft" && (
                                <>
                                  <div className="cal-divider" />

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openReview(
                                        record,
                                        "Approved"
                                      )
                                    }
                                  >
                                    Approve
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      openReview(
                                        record,
                                        "Rejected"
                                      )
                                    }
                                  >
                                    Reject
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

      {viewRecord && (
        <div className="cal-overlay">
          <div
            className="cal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cal-details-title"
          >
            <h2 id="cal-details-title">
              Calibration Details
            </h2>

            <div className="cal-details">
              {[
                ["Instrument", instrumentLabel(viewRecord)],
                [
                  "Calibration Type",
                  viewRecord.calibrationType || "Internal"
                ],
                [
                  "Location",
                  viewRecord.calibrationLocation
                ],
                [
                  "Calibration Date",
                  dateOnly(viewRecord.calibrationDate)
                ],
                [
                  "Calibration Time",
                  viewRecord.calibrationTime || "Not recorded"
                ],
                [
                  "Calibration Reason",
                  viewRecord.calibrationReason || "Not recorded"
                ],
                [
                  "Next Due Date",
                  dateOnly(viewRecord.nextDueDate)
                ],
                ["Result", viewRecord.result],
                ["Approval", viewRecord.approvalStatus],
                [
                  "Certificate Number",
                  viewRecord.certificateNumber
                ],
                [
                  "Agency",
                  viewRecord.calibrationAgency
                ],
                [
                  "Performed By",
                  viewRecord.performedBy
                ],
                ["Remarks", viewRecord.remarks],
                [
                  "Attached File",
                  viewRecord.certificate?.originalName
                ],
                [
                  "Rejection Reason",
                  viewRecord.rejectionReason
                ]
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value || "-"}</strong>
                </div>
              ))}
            </div>

            <div className="cal-actions">
              <button
                type="button"
                className="cal-secondary-btn"
                onClick={() => {
                  setViewRecord(null);
                  clearMessages();
                }}
              >
                Close
              </button>

              {viewRecord.certificate?.storedName && (
                <>
                  <button
                    type="button"
                    className="cal-secondary-btn"
                    onClick={() =>
                      handleCertificate(
                        viewRecord,
                        false
                      )
                    }
                  >
                    View Certificate
                  </button>

                  <button
                    type="button"
                    className="cal-secondary-btn"
                    onClick={() =>
                      handleCertificate(
                        viewRecord,
                        true
                      )
                    }
                  >
                    Download
                  </button>
                </>
              )}

              {canUpdate &&
                viewRecord.approvalStatus === "Draft" && (
                  <button
                    type="button"
                    className="cal-primary-btn"
                    onClick={() => handleEdit(viewRecord)}
                  >
                    Edit
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {reviewRecord && (
        <div className="cal-overlay">
          <div
            className="cal-modal cal-confirm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cal-review-title"
          >
            <h2 id="cal-review-title">
              {reviewDecision === "Approved"
                ? "Approve Calibration?"
                : "Reject Calibration?"}
            </h2>

            <p>{instrumentLabel(reviewRecord)}</p>

            <p>
              Calibration Result:{" "}
              <strong>{reviewRecord.result}</strong>
            </p>

            {reviewDecision === "Approved" &&
              !reviewRecord.certificate?.storedName && (
                <div className="cal-error">
                  Supporting document is missing.
                  Edit this Draft and upload a certificate
                  or internal calibration report first.
                </div>
              )}

            {reviewDecision === "Rejected" && (
              <label className="cal-review-label">
                Rejection Reason *
                <textarea
                  rows={3}
                  value={rejectionReason}
                  onChange={(event) =>
                    setRejectionReason(event.target.value)
                  }
                  placeholder="Enter rejection reason"
                />
              </label>
            )}

            <div className="cal-actions">
              <button
                type="button"
                className="cal-secondary-btn"
                onClick={() => {
                  setReviewRecord(null);
                  setRejectionReason("");
                  clearMessages();
                }}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  reviewDecision === "Rejected"
                    ? "cal-danger-btn"
                    : "cal-primary-btn"
                }
                disabled={
                  saving ||
                  (
                    reviewDecision === "Rejected" &&
                    !rejectionReason.trim()
                  ) ||
                  (
                    reviewDecision === "Approved" &&
                    !reviewRecord.certificate?.storedName
                  )
                }
                onClick={handleReview}
              >
                {saving
                  ? "Processing..."
                  : reviewDecision === "Approved"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalibrationRecords;
