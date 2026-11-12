import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./InspectionExecution.css";

const API = "http://localhost:1700/api/inspections";
const QO_API = "http://localhost:1700/api/quality-orders";
const getId = (value) => String(value?._id || value || "");
const formatDate = (date) => date ? new Date(date).toLocaleString() : "-";

const InspectionExecution = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [setup, setSetup] = useState(null);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(null);
  const [sampleNumber, setSampleNumber] = useState(1);
  const [values, setValues] = useState({});
  const [instruments, setInstruments] = useState({});
  const [remarks, setRemarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [completing, setCompleting] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const request = useCallback(async (url, options = {}) => {
    const token = sessionStorage.getItem("iqms_token");
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("Inspection API failed:", url, response.status, data);
      throw new Error(data.message || data.msg || "Request failed");
    }
    return data;
  }, []);

  const loadResults = useCallback(async () => {
    const data = await request(`${API}/${id}/results`);
    setResults(data.results || []);
    setProgress(data.progress || null);
  }, [id, request]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [setupData, resultsData] = await Promise.all([
          request(`${API}/${id}/setup`),
          request(`${API}/${id}/results`)
        ]);
        if (!active) return;
        setSetup(setupData);
        setResults(resultsData.results || []);
        setProgress(resultsData.progress || null);
      } catch (err) {
        if (active) setError(err.message);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [id, request]);

  const currentResults = useMemo(() =>
    results.filter(r => r.sampleNumber === Number(sampleNumber)),
    [results, sampleNumber]
  );

  const findSaved = (characteristicId) => currentResults.find(
    r => getId(r.characteristicId) === String(characteristicId)
  );

  const getValue = (spec) => {
    const key = String(spec.characteristicId);
    if (Object.prototype.hasOwnProperty.call(values, key)) return values[key];
    const saved = findSaved(key);
    if (!saved) return "";
    return spec.characteristicType === "Numeric"
      ? String(saved.numericValue ?? "") : saved.attributeValue || "";
  };

  const getInstrument = (spec) => {
    const key = String(spec.characteristicId);
    return Object.prototype.hasOwnProperty.call(instruments, key)
      ? instruments[key] : getId(findSaved(key)?.instrumentId);
  };

  const getRemarks = (spec) => {
    const key = String(spec.characteristicId);
    return Object.prototype.hasOwnProperty.call(remarks, key)
      ? remarks[key] : findSaved(key)?.remarks || "";
  };

  const changeSample = (number) => {
    setSampleNumber(Number(number));
    setValues({});
    setInstruments({});
    setRemarks({});
    setError("");
    setMessage("");
  };

  const saveResult = async (spec) => {
    const key = String(spec.characteristicId);
    const value = getValue(spec);
    const saved = findSaved(key);
    if (value === "") { setError("Enter an inspection result"); return; }
    if (saved && !getRemarks(spec).trim()) {
      setError("Enter a correction reason in Remarks"); return;
    }
    setSavingId(key);
    setError("");
    setMessage("");
    try {
      const body = {
        sampleNumber: Number(sampleNumber),
        characteristicId: key,
        instrumentId: getInstrument(spec) || null,
        remarks: getRemarks(spec)
      };
      if (spec.characteristicType === "Numeric") body.numericValue = value;
      else body.attributeValue = value;
      const data = await request(`${API}/${id}/results`, {
        method: "POST", body: JSON.stringify(body)
      });
      await loadResults();
      setMessage(data.msg || data.message || "Result saved");
      setValues(previous => { const next = { ...previous }; delete next[key]; return next; });
      setInstruments(previous => { const next = { ...previous }; delete next[key]; return next; });
      setRemarks(previous => { const next = { ...previous }; delete next[key]; return next; });
    } catch (err) { setError(err.message); }
    finally { setSavingId(""); }
  };

  const specifications = setup?.specifications || [];
  const order = setup?.qualityOrder;
  const instrumentsList = setup?.instruments || [];
  const expected = order ? Number(order.sampleQuantity) * specifications.length : 0;
  const recorded = results.length;
  const passed = results.filter(r => r.result === "Pass").length;
  const failed = results.filter(r => r.result === "Fail").length;
  const ready = expected > 0 && recorded === expected;
  const sampleCount = Number(order?.sampleQuantity) || 0;
  const summaryRows = useMemo(() => results.filter(r => filter === "All" || r.result === filter)
    .slice().sort((a, b) => a.sampleNumber - b.sampleNumber ||
      String(a.characteristicName).localeCompare(String(b.characteristicName))), [results, filter]);

  const completeInspection = async () => {
    setCompleting(true);
    setError("");
    setMessage("");
    try {
      const data = await request(`${QO_API}/${id}/complete`, { method: "PATCH" });
      setConfirmComplete(false);
      setMessage(data.message || "Inspection completed");
      // The existing setup API only allows In Progress orders; return to the list.
      navigate("/quality/orders", { state: { inspectionCompleted: true } });
    } catch (err) {
      setError(err.message);
      setConfirmComplete(false);
    } finally { setCompleting(false); }
  };

  if (loading) return <div className="inspection-page">Loading inspection...</div>;
  if (!setup) return (
    <div className="inspection-page">
      <button className="inspection-secondary" onClick={() => navigate("/quality/orders")}>Back to Quality Orders</button>
      <p className="inspection-error">{error || "Inspection not available"}</p>
    </div>
  );

  return (
    <div className="inspection-page">
      <div className="inspection-header">
        <div><h1>Inspection Execution</h1><p>{order.qualityOrderNumber} — Sample-wise inspection</p></div>
        <button className="inspection-secondary" onClick={() => navigate("/quality/orders")}>Back to Quality Orders</button>
      </div>
      {error && <div className="inspection-error">{error}</div>}
      {message && <div className="inspection-success">{message}</div>}

      <div className="inspection-card">
        <h2>Quality Order Information</h2>
        <div className="inspection-info-grid">
          <div><span>Quality Order</span><strong>{order.qualityOrderNumber}</strong></div>
          <div><span>Status</span><strong>{order.status}</strong></div>
          <div><span>Total Quantity</span><strong>{order.inspectionQuantity} {order.uom}</strong></div>
          <div><span>Sample Quantity</span><strong>{order.sampleQuantity}</strong></div>
          <div><span>Batch Number</span><strong>{order.batchNumber || "-"}</strong></div>
          <div><span>Serial Number</span><strong>{order.serialNumber || "-"}</strong></div>
        </div>
      </div>

      <div className="inspection-card">
        <div className="inspection-toolbar">
          <div><h2>Inspection Measurements</h2><p>Select a sample and record each characteristic.</p></div>
          <label>Sample Number
            <select value={sampleNumber} onChange={e => changeSample(e.target.value)}>
              {Array.from({ length: sampleCount }, (_, index) => (
                <option key={index + 1} value={index + 1}>Sample {index + 1}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="inspection-progress">
          <strong>Recorded: {progress?.recorded ?? recorded} / {progress?.expected ?? expected}</strong>
          <span>Passed: {progress?.passed ?? passed} | Failed: {progress?.failed ?? failed}</span>
        </div>
        <div className="inspection-table-scroll">
          <table className="inspection-table">
            <thead><tr><th>Characteristic</th><th>Specification</th><th>Actual Value</th><th>Test Instrument</th><th>Remarks</th><th>Result</th><th>Action</th></tr></thead>
            <tbody>
              {specifications.map(spec => {
                const key = String(spec.characteristicId);
                const saved = findSaved(key);
                const limitText = spec.characteristicType === "Numeric"
                  ? `${spec.lowerSpecLimit ?? "—"} to ${spec.upperSpecLimit ?? "—"} ${spec.measurementUnit || ""}`
                  : (spec.acceptedValues || []).join(", ");
                return (
                  <tr key={key}>
                    <td><strong>{spec.characteristicName}</strong><small>{spec.characteristicCode}</small></td>
                    <td>{limitText}</td>
                    <td>{spec.characteristicType === "Numeric" ? (
                      <input type="number" step="any" value={getValue(spec)} onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))} />
                    ) : (
                      <input type="text" list={`accepted-${key}`} value={getValue(spec)} placeholder="Observed value" onChange={e => setValues(p => ({ ...p, [key]: e.target.value }))} />
                    )}
                    {spec.characteristicType === "Attribute" && (
                      <datalist id={`accepted-${key}`}>
                        {(spec.acceptedValues || []).map(v => <option key={v} value={v} />)}
                      </datalist>
                    )}
                    </td>
                    <td><select value={getInstrument(spec)} onChange={e => setInstruments(p => ({ ...p, [key]: e.target.value }))}>
                      <option value="">No instrument</option>
                      {instrumentsList.map(inst => <option key={inst._id} value={inst._id}>{inst.instrumentCode} - {inst.instrumentName}</option>)}
                    </select></td>
                    <td><input value={getRemarks(spec)} placeholder={saved ? "Correction reason required" : "Optional remarks"} onChange={e => setRemarks(p => ({ ...p, [key]: e.target.value }))} /></td>
                    <td><span className={saved ? (saved.result === "Pass" ? "inspection-pass" : "inspection-fail") : "inspection-pending"}>{saved?.result || "Pending"}</span></td>
                    <td><button className="inspection-primary" disabled={Boolean(savingId)} onClick={() => saveResult(spec)}>{savingId === key ? "Saving..." : saved ? "Correct" : "Save"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="inspection-sample-nav">
          <button className="inspection-secondary" disabled={sampleNumber <= 1} onClick={() => changeSample(sampleNumber - 1)}>Previous Sample</button>
          <span>Sample {sampleNumber} of {sampleCount}</span>
          <button className="inspection-secondary" disabled={sampleNumber >= sampleCount} onClick={() => changeSample(sampleNumber + 1)}>Next Sample</button>
        </div>
      </div>

      <div className="inspection-card">
        <div className="inspection-toolbar">
          <div><h2>Inspection Results Summary</h2><p>All recorded sample results in one table.</p></div>
          <label>Filter Results
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="All">All Results</option><option value="Pass">Pass Only</option><option value="Fail">Fail Only</option>
            </select>
          </label>
        </div>
        <div className="inspection-summary-cards">
          <div><span>Recorded</span><strong>{recorded} / {expected}</strong></div>
          <div><span>Passed</span><strong className="inspection-pass">{passed}</strong></div>
          <div><span>Failed</span><strong className="inspection-fail">{failed}</strong></div>
        </div>
        <div className="inspection-table-scroll">
          <table className="inspection-table">
            <thead><tr><th>Sample</th><th>Characteristic</th><th>Specification</th><th>Actual</th><th>Instrument</th><th>Result</th><th>Inspector</th><th>Recorded At</th><th>Remarks</th></tr></thead>
            <tbody>
              {summaryRows.length === 0 ? <tr><td colSpan="9">No results match the selected filter.</td></tr> : summaryRows.map(result => {
                const spec = specifications.find(s => String(s.characteristicId) === getId(result.characteristicId));
                const instrument = instrumentsList.find(i => String(i._id) === getId(result.instrumentId));
                const specText = result.characteristicType === "Numeric"
                  ? `${result.lowerSpecLimit ?? spec?.lowerSpecLimit ?? "—"} to ${result.upperSpecLimit ?? spec?.upperSpecLimit ?? "—"} ${result.measurementUnit || spec?.measurementUnit || ""}`
                  : (result.acceptedValues || spec?.acceptedValues || []).join(", ");
                return (
                  <tr key={result._id}>
                    <td>{result.sampleNumber}</td>
                    <td>{result.characteristicName}</td>
                    <td>{specText}</td>
                    <td>{result.characteristicType === "Numeric" ? `${result.numericValue} ${result.measurementUnit || ""}` : result.attributeValue}</td>
                    <td>{instrument ? `${instrument.instrumentCode} - ${instrument.instrumentName}` : (result.instrumentId ? "Instrument ID: " + getId(result.instrumentId) : "-")}</td>
                    <td><strong className={result.result === "Pass" ? "inspection-pass" : "inspection-fail"}>{result.result}</strong></td>
                    <td>{getId(result.inspectedBy) || "-"}</td>
                    <td>{formatDate(result.inspectedAt)}</td>
                    <td>{result.remarks || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="inspection-completion">
          <p>{ready ? `All ${expected} required results have been recorded. Predicted outcome: ${failed ? "Fail" : "Pass"}.` : `Complete the remaining ${Math.max(0, expected - recorded)} results before finalizing.`}</p>
          <button className="inspection-primary" disabled={!ready || Boolean(savingId) || completing} onClick={() => setConfirmComplete(true)}>Complete Inspection</button>
        </div>
      </div>

      {confirmComplete && (
        <div className="inspection-modal-overlay" role="presentation">
          <div className="inspection-modal" role="dialog" aria-modal="true" aria-labelledby="inspection-confirm-title">
            <h2 id="inspection-confirm-title">Complete Inspection?</h2>
            <p>All {expected} results are recorded. The final outcome will be <strong>{failed ? "Fail" : "Pass"}</strong>.</p>
            <p>Once completed, the Quality Order will be locked for further result entry or corrections.</p>
            <div className="inspection-modal-actions">
              <button className="inspection-secondary" disabled={completing} onClick={() => setConfirmComplete(false)}>Cancel</button>
              <button className="inspection-primary" disabled={completing} onClick={completeInspection}>{completing ? "Completing..." : "Confirm Completion"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionExecution;
