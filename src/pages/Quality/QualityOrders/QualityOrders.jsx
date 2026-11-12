
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./QualityOrders.css";

import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { hasPermission } from "../../../utils/permissions";

const BASE = "http://localhost:1700/api";
const API = `${BASE}/quality-orders`;

const emptyForm = {
  itemId: "",
  plantId: "",
  warehouseId: "",
  batchNumber: "",
  serialNumber: "",
  inspectionQuantity: "",
  sampleQuantity: "",
  itemSamplingId: "",
  aqlSamplingPlanId: "",
  assignedInspector: "",
  remarks: ""
};

const idOf = (value) =>
  typeof value === "object" && value !== null
    ? value._id || ""
    : value || "";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "-"
    : date.toLocaleString();
};

const calculateSampleQuantity = (rule, quantity) => {
  const total = Number(quantity);

  if (!rule || !Number.isSafeInteger(total) || total <= 0) {
    return "";
  }

  if (rule.samplingType === "AQL") return "";

  if (rule.samplingType === "Fixed") {
    const fixed = Number(rule.samplingValue);
    if (!Number.isSafeInteger(fixed) || fixed <= 0) return "";
    return Math.min(total, fixed);
  }

  if (rule.samplingType === "Percentage") {
    const percentage = Number(rule.samplingValue);
    if (
      !Number.isFinite(percentage) ||
      percentage <= 0 ||
      percentage > 100
    ) {
      return "";
    }

    return Math.min(
      total,
      Math.ceil((total * percentage) / 100)
    );
  }

  if (rule.samplingType === "Full Inspection") {
    return total;
  }

  return "";
};

const samplingLabel = (rule) => {
  if (!rule) return "-";

  let description = rule.samplingType || "";

  if (rule.samplingType === "Fixed") {
    description = `Fixed - ${rule.samplingValue} units`;
  }

  if (rule.samplingType === "Percentage") {
    description = `Percentage - ${rule.samplingValue}%`;
  }

  if (rule.samplingType === "Full Inspection") {
    description = "Full Inspection";
  }

  return `${rule.samplingCode || ""} - ${
    rule.samplingName || ""
  } (${description})`;
};

const QualityOrders = () => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();

  const canViewItems = hasPermission(user, "item.view");
  const canViewSampling = hasPermission(user, "itemSampling.view");
  const canViewInspection = hasPermission(user, "inspection.view");
  const canCreate = hasPermission(user, "qualityOrder.create");
  const canUpdate = hasPermission(user, "qualityOrder.update");
  const canOpen = hasPermission(user, "qualityOrder.approve");
  const canStartInspection = hasPermission(user, "inspection.create");

  const canManageOptions = canCreate || canUpdate;

  const currentUserId = String(
    user?._id || user?.id || user?.userId || ""
  );

  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [samplingRules, setSamplingRules] = useState([]);
  const [aqlPlans, setAqlPlans] = useState([]);
  const [aqlResult, setAqlResult] = useState(null);
  const [aqlLoading, setAqlLoading] = useState(false);
  const [aqlError, setAqlError] = useState("");
  const [inspectors, setInspectors] = useState([]);
  const [plants, setPlants] = useState([]);
  const [activeSpecs, setActiveSpecs] = useState([]);

  const [specLoading, setSpecLoading] = useState(false);
  const [specError, setSpecError] = useState("");
  const [samplingError, setSamplingError] = useState("");

  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [viewOrder, setViewOrder] = useState(null);
  const [openOrder, setOpenOrder] = useState(null);
  const [startOrder, setStartOrder] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const menuRef = useRef(null);

  // ==============================================
  // API HELPER
  // ==============================================

  const request = useCallback(async (path, options = {}) => {
    const token = sessionStorage.getItem("iqms_token");

    const response = await fetch(path, {
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
      console.error("Quality Order API failed:", {
        url: path,
        status: response.status,
        data
      });

      throw new Error(
        data.message || data.msg || "API request failed"
      );
    }

    return data;
  }, []);

  // ==============================================
  // LOAD QUALITY ORDERS
  // ==============================================

  const loadOrders = useCallback(async () => {
    const data = await request(API);
    setOrders(data.qualityOrders || []);
  }, [request]);

  // ==============================================
  // LOAD ALL MASTER DATA
  // ==============================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    setSamplingError("");

    try {
      const [
        ordersResult,
        itemsResult,
        optionsResult,
        samplingResult
      ] = await Promise.allSettled([
        request(API),

        canViewItems
          ? request(`${BASE}/items`)
          : Promise.resolve(null),

        canManageOptions
          ? request(`${API}/options`)
          : Promise.resolve(null),

        canManageOptions && canViewSampling
          ? request(`${BASE}/item-samplings`)
          : Promise.resolve(null)
      ]);

      if (ordersResult.status === "fulfilled") {
        setOrders(ordersResult.value.qualityOrders || []);
      } else {
        setOrders([]);
      }

      if (
        itemsResult.status === "fulfilled" &&
        itemsResult.value
      ) {
        setItems(itemsResult.value.items || []);
      } else {
        setItems([]);
      }

      if (
        optionsResult.status === "fulfilled" &&
        optionsResult.value
      ) {
        setInspectors(optionsResult.value.inspectors || []);
        setPlants(optionsResult.value.plants || []);
      } else {
        setInspectors([]);
        setPlants([]);
      }

      // IMPORTANT: Load Item Sampling Master records
      if (
        samplingResult.status === "fulfilled" &&
        samplingResult.value
      ) {
        const data = samplingResult.value;

        const rules =
          data.itemSamplings ||
          data.samplings ||
          data.samplingRules ||
          data.data ||
          [];

        setSamplingRules(Array.isArray(rules) ? rules : []);
      } else {
        setSamplingRules([]);

        if (samplingResult.status === "rejected") {
          setSamplingError(samplingResult.reason.message);
        } else if (canManageOptions && !canViewSampling) {
          setSamplingError(
            "Your role does not have itemSampling.view permission."
          );
        }
      }

      const errors = [
        ordersResult,
        itemsResult,
        optionsResult
      ]
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason.message);

      if (errors.length > 0) {
        setError(errors.join(" | "));
      }
    } catch (err) {
      setError(
        err.message || "Failed to load Quality Orders"
      );
    } finally {
      setLoading(false);
    }
  }, [
    request,
    canViewItems,
    canViewSampling,
    canManageOptions
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!canManageOptions || !hasPermission(user, "aqlSamplingPlan.view")) {
      setAqlPlans([]);
      return;
    }
    let cancelled = false;
    request(`${BASE}/aql-sampling-plans`)
      .then((data) => {
        if (cancelled) return;
        const plans = data.plans || data.aqlSamplingPlans || data.data || [];
        setAqlPlans(Array.isArray(plans) ? plans : []);
      })
      .catch((err) => {
        if (!cancelled) setAqlError(`Cannot load AQL plans: ${err.message}`);
      });
    return () => { cancelled = true; };
  }, [request, canManageOptions, user]);

  // ==============================================
  // CLOSE MENUS AND MODALS
  // ==============================================

  useEffect(() => {
    const outside = (event) => {
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
        setViewOrder(null);

        if (!saving) {
          setOpenOrder(null);
          setStartOrder(null);
        }
      }
    };

    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);

    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [saving]);

  // ==============================================
  // SELECTED ITEM AND SAMPLING RULE
  // ==============================================

  const selectedItem = items.find(
    (item) => item._id === form.itemId
  );

  const trackingType = selectedItem?.trackingType || "None";
  const itemUom = selectedItem?.uom || "-";

  const selectedSampling = samplingRules.find(
    (rule) => rule._id === form.itemSamplingId
  );

  const isAql = selectedSampling?.samplingType === "AQL";

  useEffect(() => {
    if (!showForm || !isAql || !form.aqlSamplingPlanId ||
        !Number.isSafeInteger(Number(form.inspectionQuantity)) ||
        Number(form.inspectionQuantity) <= 0) {
      setAqlResult(null);
      setAqlError("");
      setAqlLoading(false);
      return;
    }
    let cancelled = false;
    setAqlLoading(true);
    setAqlResult(null);
    setAqlError("");
    request(`${BASE}/aql/calculate`, {
      method: "POST",
      body: JSON.stringify({
        planId: form.aqlSamplingPlanId,
        lotQuantity: Number(form.inspectionQuantity)
      })
    })
      .then((data) => { if (!cancelled) setAqlResult(data.calculation); })
      .catch((err) => { if (!cancelled) setAqlError(err.message); })
      .finally(() => { if (!cancelled) setAqlLoading(false); });
    return () => { cancelled = true; };
  }, [showForm, isAql, form.aqlSamplingPlanId, form.inspectionQuantity, request]);

  const isLegacyDraft = Boolean(
    editingId && !form.itemSamplingId
  );

  const calculatedSample = isAql
    ? (aqlResult?.sampleQuantity ?? "")
    : selectedSampling
    ? calculateSampleQuantity(
        selectedSampling,
        form.inspectionQuantity
      )
    : isLegacyDraft
      ? form.sampleQuantity
      : "";

  const activeSamplingRules = samplingRules.filter(
    (rule) =>
      rule.status === "Active" ||
      rule._id === form.itemSamplingId
  );

  // ==============================================
  // DISPLAY HELPERS
  // ==============================================

  const displayPlant = (value) => {
    const id = idOf(value);
    const plant = plants.find((entry) => entry._id === id);

    return (
      plant?.plantName ||
      plant?.name ||
      plant?.plantCode ||
      id ||
      "-"
    );
  };

  const displayInspector = (value) => {
    const id = idOf(value);
    const inspector = inspectors.find(
      (entry) => entry._id === id
    );

    return (
      inspector?.username ||
      inspector?.email ||
      id ||
      "-"
    );
  };

  const displayCharacteristic = (value) => {
    if (!value) return "-";

    if (typeof value === "object") {
      return (
        value.characteristicName ||
        value.name ||
        value.characteristicCode ||
        value._id ||
        "-"
      );
    }

    return value;
  };

  const displayCriteria = (spec) => {
    const values = (spec.acceptedValues || []).filter(Boolean);

    if (values.length) return values.join(", ");

    return `LSL: ${spec.lowerSpecLimit ?? "-"} / USL: ${
      spec.upperSpecLimit ?? "-"
    }`;
  };

  const displayItem = (order) => {
    const item = order.itemId;

    if (item && typeof item === "object") {
      return `${item.itemCode || ""} - ${
        item.itemName || ""
      }`.trim();
    }

    const found = items.find(
      (entry) => entry._id === item
    );

    return found
      ? `${found.itemCode} - ${found.itemName}`
      : item || "-";
  };

  const displayOrderSampling = (order) => {
    if (order.samplingSnapshot) {
      return samplingLabel(order.samplingSnapshot);
    }

    if (
      order.itemSamplingId &&
      typeof order.itemSamplingId === "object"
    ) {
      return samplingLabel(order.itemSamplingId);
    }

    const rule = samplingRules.find(
      (entry) =>
        entry._id === idOf(order.itemSamplingId)
    );

    return rule
      ? samplingLabel(rule)
      : order.itemSamplingId
        ? "Sampling rule not available"
        : "Legacy Manual Sampling";
  };

  // ==============================================
  // ACTIVE ITEM SPECIFICATIONS
  // ==============================================

  useEffect(() => {
    if (!showForm || !form.itemId) {
      setActiveSpecs([]);
      setSpecError("");
      return;
    }

    let cancelled = false;

    setSpecLoading(true);
    setSpecError("");

    request(`${API}/item-specifications/${form.itemId}`)
      .then((data) => {
        if (!cancelled) {
          setActiveSpecs(data.specifications || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setActiveSpecs([]);
          setSpecError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) setSpecLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.itemId, showForm, request]);

  // ==============================================
  // FORM CHANGE
  // ==============================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "itemId") {
      const item = items.find(
        (entry) => entry._id === value
      );

      setForm((previous) => ({
        ...previous,
        itemId: value,
        plantId: idOf(item?.plantId),
        batchNumber: "",
        serialNumber: "",
        inspectionQuantity:
          item?.trackingType === "Serial" ? "1" : "",
        sampleQuantity: ""
      }));

      return;
    }

    if (name === "itemSamplingId") {
      setForm((previous) => ({
        ...previous,
        itemSamplingId: value,
        aqlSamplingPlanId: "",
        sampleQuantity: ""
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  // ==============================================
  // ADD
  // ==============================================

  const handleAdd = () => {
    if (!canCreate) return;

    setForm({ ...emptyForm });
    setAqlResult(null);
    setAqlError("");
    setEditingId(null);
    setShowForm(true);
    setViewOrder(null);
    setOpenMenuId(null);
    setMessage("");
    setError("");
  };

  // ==============================================
  // EDIT DRAFT
  // ==============================================

  const handleEdit = (order) => {
    if (!canUpdate || order.status !== "Draft") return;

    setForm({
      itemId: idOf(order.itemId),
      plantId: idOf(order.plantId),
      warehouseId: order.warehouseId || "",
      batchNumber: order.batchNumber || "",
      serialNumber: order.serialNumber || "",
      inspectionQuantity: String(
        order.inspectionQuantity ?? ""
      ),
      sampleQuantity: String(
        order.sampleQuantity ?? ""
      ),
      itemSamplingId: idOf(order.itemSamplingId),
      aqlSamplingPlanId: idOf(order.aqlSamplingPlanId),
      assignedInspector: idOf(order.assignedInspector),
      remarks: order.remarks || ""
    });

    setAqlResult(null);
    setAqlError("");
    setEditingId(order._id);
    setShowForm(true);
    setViewOrder(null);
    setOpenMenuId(null);
    setMessage("");
    setError("");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ==============================================
  // CANCEL
  // ==============================================

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
  };

  // ==============================================
  // SAVE QUALITY ORDER
  // ==============================================

  const handleSave = async (event) => {
    event.preventDefault();

    if (
      saving ||
      (editingId ? !canUpdate : !canCreate)
    ) {
      return;
    }

    const inspectionQuantity = Number(
      form.inspectionQuantity
    );

    const sampleQuantity = Number(calculatedSample);

    if (!form.itemId) {
      setError("Please select an item.");
      return;
    }

    if (
      !Number.isSafeInteger(inspectionQuantity) ||
      inspectionQuantity <= 0
    ) {
      setError(
        "Total Quantity must be a positive whole number."
      );
      return;
    }

    if (!form.itemSamplingId && !isLegacyDraft) {
      setError("Please select an Item Sampling rule.");
      return;
    }

    if (
      form.itemSamplingId &&
      !selectedSampling
    ) {
      setError(
        "Selected Item Sampling rule is unavailable. Refresh the page."
      );
      return;
    }

    if (
      selectedSampling &&
      selectedSampling.status !== "Active"
    ) {
      setError("Select an Active Item Sampling rule.");
      return;
    }

    if (isAql && (!form.aqlSamplingPlanId || !aqlResult || aqlLoading)) {
      setError(aqlError || "Select an AQL plan and wait for a successful calculation.");
      return;
    }

    if (
      !Number.isSafeInteger(sampleQuantity) ||
      sampleQuantity <= 0 ||
      sampleQuantity > inspectionQuantity
    ) {
      setError(
        "Invalid calculated sample quantity. Check the sampling rule and total quantity."
      );
      return;
    }

    if (
      trackingType === "Batch" &&
      !form.batchNumber.trim()
    ) {
      setError(
        "Batch number is required for batch-tracked items."
      );
      return;
    }

    if (
      trackingType === "Serial" &&
      (
        !form.serialNumber.trim() ||
        inspectionQuantity !== 1 ||
        sampleQuantity !== 1
      )
    ) {
      setError(
        "Serial-tracked items require a serial number and both quantities equal to 1."
      );
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        ...form,
        plantId: form.plantId || null,
        assignedInspector: form.assignedInspector || null,

        batchNumber:
          trackingType === "Batch"
            ? form.batchNumber.trim()
            : "",

        serialNumber:
          trackingType === "Serial"
            ? form.serialNumber.trim()
            : "",

        inspectionQuantity,
        sampleQuantity,

        itemSamplingId:
          form.itemSamplingId || null,
        aqlSamplingPlanId: isAql ? form.aqlSamplingPlanId : null
      };

      if (!editingId) {
        payload.referenceType = "Manual";
        payload.sourceSystem = "IQMS";
      }

      const result = await request(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload)
        }
      );

      setMessage(
        result.message ||
        "Quality Order saved successfully"
      );

      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });

      await loadOrders();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ==============================================
  // OPEN QUALITY ORDER
  // ==============================================

  const handleOpen = async () => {
    if (!openOrder || !canOpen || saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await request(
        `${API}/${openOrder._id}/open`,
        { method: "PATCH" }
      );

      setOpenOrder(null);

      setMessage(
        result.message ||
        "Quality Order opened for inspection"
      );

      await loadOrders();
    } catch (err) {
      setError(err.message);
      setOpenOrder(null);
    } finally {
      setSaving(false);
    }
  };

  // ==============================================
  // INSPECTOR PERMISSIONS
  // ==============================================

  const isAssignedInspector = (order) => {
    const assignedId = idOf(order.assignedInspector);

    return (
      Boolean(currentUserId) &&
      String(assignedId) === currentUserId
    );
  };

  const canStartOrder = (order) => {
    return (
      canStartInspection &&
      user?.role === "QualityInspector" &&
      order.status === "Open" &&
      isAssignedInspector(order)
    );
  };

  // ==============================================
  // START INSPECTION
  // ==============================================

  const handleStartInspection = async () => {
    if (!startOrder || saving) return;

    if (!canStartOrder(startOrder)) {
      setError(
        "Only the assigned Quality Inspector can start this inspection."
      );
      setStartOrder(null);
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const result = await request(
        `${API}/${startOrder._id}/start-inspection`,
        { method: "PATCH" }
      );

      setStartOrder(null);

      setMessage(
        result.message ||
        "Inspection started successfully"
      );

      await loadOrders();
    } catch (err) {
      setError(
        err.message || "Failed to start inspection"
      );
      setStartOrder(null);
    } finally {
      setSaving(false);
    }
  };

  // ==============================================
  // FILTER ORDERS
  // ==============================================

  const filteredOrders = orders.filter((order) => {
    if (
      statusFilter !== "All" &&
      order.status !== statusFilter
    ) {
      return false;
    }

    const values = [
      order.qualityOrderNumber,
      displayItem(order),
      order.status,
      order.referenceType,
      order.batchNumber,
      order.serialNumber
    ];

    return values.some((value) =>
      String(value || "")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  // ==============================================
  // RENDER
  // ==============================================

  return (
    <div className="qo-page">
      <div className="qo-header">
        <div>
          <h1>Quality Orders</h1>
          <p>
            Create and manage inspection orders for
            manufacturing items.
          </p>
        </div>

        {canCreate && !showForm && (
          <button
            type="button"
            className="qo-primary-btn"
            onClick={handleAdd}
          >
            + Add Quality Order
          </button>
        )}
      </div>

      {message && (
        <div className="qo-success" role="status">
          {message}
        </div>
      )}

      {error && (
        <div className="qo-error" role="alert">
          {error}
        </div>
      )}

      {/* ======================================
          CREATE / EDIT FORM
      ====================================== */}

      {showForm && (
        <div className="qo-card">
          <h2>
            {editingId
              ? "Edit Draft Quality Order"
              : "Create Quality Order"}
          </h2>

          <form onSubmit={handleSave}>
            <div className="qo-form-grid">
              <label>
                Item *
                <select
                  name="itemId"
                  value={form.itemId}
                  onChange={handleChange}
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
                Plant
                <select
                  name="plantId"
                  value={form.plantId}
                  onChange={handleChange}
                  disabled={Boolean(selectedItem?.plantId)}
                >
                  <option value="">
                    Select Plant (optional)
                  </option>

                  {form.plantId &&
                    !plants.some(
                      (p) => p._id === form.plantId
                    ) && (
                      <option value={form.plantId}>
                        Assigned Plant ({form.plantId})
                      </option>
                    )}

                  {plants.map((plant) => (
                    <option
                      key={plant._id}
                      value={plant._id}
                    >
                      {plant.plantCode
                        ? `${plant.plantCode} - `
                        : ""}
                      {plant.plantName ||
                        plant.name ||
                        plant._id}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Warehouse Reference
                <input
                  name="warehouseId"
                  value={form.warehouseId}
                  onChange={handleChange}
                  placeholder="e.g. WH-01"
                />
              </label>

              <label>
                Tracking Type
                <input
                  value={
                    selectedItem
                      ? trackingType
                      : "Select an item"
                  }
                  readOnly
                />
              </label>

              <label>
                Unit of Measure (UOM)
                <input value={itemUom} readOnly />
              </label>

              <label>
                Reference Type
                <input value="Manual" readOnly />
              </label>

              <label>
                Source System
                <input value="IQMS" readOnly />
              </label>

              {trackingType === "Batch" && (
                <label>
                  Batch Number *
                  <input
                    name="batchNumber"
                    value={form.batchNumber}
                    onChange={handleChange}
                    required
                  />
                </label>
              )}

              {trackingType === "Serial" && (
                <label>
                  Serial Number *
                  <input
                    name="serialNumber"
                    value={form.serialNumber}
                    onChange={handleChange}
                    required
                  />
                </label>
              )}

              <label>
                Total Quantity *
                <input
                  name="inspectionQuantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.inspectionQuantity}
                  onChange={handleChange}
                  readOnly={trackingType === "Serial"}
                  required
                />
              </label>

              {/* NEW ITEM SAMPLING DROPDOWN */}

              <label>
                Item Sampling *
                <select
                  name="itemSamplingId"
                  value={form.itemSamplingId}
                  onChange={handleChange}
                  required={!isLegacyDraft}
                >
                  <option value="">
                    {isLegacyDraft
                      ? "Legacy Manual Sampling"
                      : "Select Item Sampling"}
                  </option>

                  {form.itemSamplingId &&
                    !samplingRules.some(
                      (rule) =>
                        rule._id === form.itemSamplingId
                    ) && (
                      <option value={form.itemSamplingId}>
                        Previously Selected Rule (Unavailable)
                      </option>
                    )}

                  {activeSamplingRules.map((rule) => (
                    <option
                      key={rule._id}
                      value={rule._id}
                      disabled={
                        rule.status !== "Active"
                      }
                    >
                      {samplingLabel(rule)}

                    </option>
                  ))}
                </select>
              </label>

              {isAql && (
                <label>
                  AQL Sampling Plan *
                  <select
                    name="aqlSamplingPlanId"
                    value={form.aqlSamplingPlanId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Select Active AQL Plan</option>
                    {aqlPlans
                      .filter((plan) => plan.status === "Active")
                      .map((plan) => (
                        <option key={plan._id} value={plan._id}>
                          {plan.planCode} - {plan.planName}
                        </option>
                      ))}
                  </select>
                </label>
              )}

              {/* AUTOMATIC SAMPLE QUANTITY */}

              <label>
                Sample Quantity (Auto Calculated) *
                <input
                  type="number"
                  value={calculatedSample}
                  readOnly={!isLegacyDraft}
                  onChange={
                    isLegacyDraft
                      ? (event) =>
                          setForm((previous) => ({
                            ...previous,
                            sampleQuantity: event.target.value
                          }))
                      : undefined
                  }
                  min="1"
                  step="1"
                  placeholder="Select a sampling rule and enter quantity"
                  required
                />
              </label>

              <label>
                Assigned Inspector (optional)
                <select
                  name="assignedInspector"
                  value={form.assignedInspector}
                  onChange={handleChange}
                >
                  <option value="">
                    Select Quality Inspector
                  </option>

                  {form.assignedInspector &&
                    !inspectors.some(
                      (u) =>
                        u._id === form.assignedInspector
                    ) && (
                      <option
                        value={form.assignedInspector}
                      >
                        Previously Assigned (
                        {form.assignedInspector})
                      </option>
                    )}

                  {inspectors.map((inspector) => (
                    <option
                      key={inspector._id}
                      value={inspector._id}
                    >
                      {inspector.username ||
                        inspector.email ||
                        inspector._id}
                    </option>
                  ))}
                </select>
              </label>

              {/* SAMPLING RULE INFORMATION */}

              <div className="qo-full-width">
                {samplingError && (
                  <p className="qo-inline-error">
                    Unable to load Item Sampling:{" "}
                    {samplingError}
                  </p>
                )}

                {isAql && aqlLoading && (
                  <p className="qo-help">Calculating AQL sample...</p>
                )}
                {isAql && aqlError && (
                  <p className="qo-inline-error">{aqlError}</p>
                )}
                {isAql && aqlResult && (
                  <div className="qo-help">
                    <strong>AQL Calculation:</strong>{" "}
                    {aqlResult.standard} ({aqlResult.standardEdition}),{" "}
                    {aqlResult.inspectionSeverity}, Code {aqlResult.codeLetter}, {" "}
                    Sample {aqlResult.sampleQuantity}
                    <ul>
                      {(aqlResult.rules || []).map((r) => (
                        <li key={r.category}>
                          {r.category}: Ac {r.acceptanceNumber} / Re {r.rejectionNumber}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedSampling && (
                  <p className="qo-help">
                    <strong>Selected Sampling Rule:</strong>{" "}
                    {samplingLabel(selectedSampling)}
                    {" | "}
                    <strong>Calculated Sample:</strong>{" "}
                    {calculatedSample === ""
                      ? "Not available"
                      : calculatedSample}
                  </p>
                )}

                {!selectedSampling &&
                  !isLegacyDraft &&
                  !samplingError && (
                    <p className="qo-help">
                      Select an Active Item Sampling rule.
                      The sample quantity will be calculated
                      automatically.
                    </p>
                  )}

                {isLegacyDraft && (
                  <p className="qo-help">
                    This is an older Draft Quality Order.
                    You may retain its manual sample
                    quantity or select a new sampling rule.
                  </p>
                )}
              </div>

              {/* ACTIVE SPECIFICATIONS */}

              <div className="qo-full-width qo-spec-panel">
                <h3>
                  Active Item Specifications (Read Only)
                </h3>

                {!form.itemId ? (
                  <p>
                    Select an item to view its specifications.
                  </p>
                ) : specLoading ? (
                  <p>Loading specifications...</p>
                ) : specError ? (
                  <p className="qo-inline-error">
                    {specError}
                  </p>
                ) : activeSpecs.length === 0 ? (
                  <p>
                    No Active specifications found.
                    The order cannot be opened until
                    specifications are activated.
                  </p>
                ) : (
                  <div className="qo-spec-table-wrap">
                    <table className="qo-table">
                      <thead>
                        <tr>
                          <th>Characteristic</th>
                          <th>Revision</th>
                          <th>Nominal</th>
                          <th>Acceptance Criteria</th>
                          <th>Instructions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {activeSpecs.map((spec) => (
                          <tr key={spec._id}>
                            <td>
                              {displayCharacteristic(
                                spec.characteristicId
                              )}
                            </td>
                            <td>{spec.revision}</td>
                            <td>
                              {spec.nominalValue ?? "-"}
                            </td>
                            <td>
                              {displayCriteria(spec)}
                            </td>
                            <td>
                              {spec.inspectionInstructions ||
                                "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <p>
                  Specifications are displayed from the
                  current Active revisions. A permanent
                  snapshot is saved when you open the order.
                </p>
              </div>

              <label className="qo-full-width">
                Remarks
                <textarea
                  name="remarks"
                  rows={3}
                  value={form.remarks}
                  onChange={handleChange}
                />
              </label>
            </div>

            <p className="qo-help">
              The system generates the Quality Order number
              automatically. UOM comes from Item Master.
              Sample Quantity is calculated from the selected
              Item Sampling rule.
            </p>

            <div className="qo-form-actions">
              <button
                type="button"
                className="qo-cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="qo-primary-btn"
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Quality Order"
                    : "Save Draft"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ======================================
          QUALITY ORDER LIST
      ====================================== */}

      <div className="qo-card">
        <div className="qo-toolbar">
          <h2>Quality Order List</h2>

          <div className="qo-filters">
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              aria-label="Filter by status"
            >
              {[
                "All",
                "Draft",
                "Open",
                "In Progress",
                "Completed",
                "Cancelled"
              ].map((status) => (
                <option key={status} value={status}>
                  {status === "All"
                    ? "All Statuses"
                    : status}
                </option>
              ))}
            </select>

            <input
              type="search"
              placeholder="Search Quality Orders..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <button
              type="button"
              className="qo-cancel-btn"
              onClick={loadData}
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="qo-table-scroll">
          <table className="qo-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Quality Order</th>
                <th>Item</th>
                <th>Reference</th>
                <th>Total Qty</th>
                <th>Sample Qty</th>
                <th>Status</th>
                <th>Outcome</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10}>
                    Loading Quality Orders...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    No Quality Orders found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order, index) => (
                  <tr key={order._id}>
                    <td>{index + 1}</td>
                    <td>
                      {order.qualityOrderNumber}
                    </td>
                    <td>{displayItem(order)}</td>
                    <td>
                      {order.referenceType || "Manual"}
                    </td>
                    <td>
                      {order.inspectionQuantity}{" "}
                      {order.uom}
                    </td>
                    <td>{order.sampleQuantity}</td>

                    <td>
                      <span
                        className={`qo-status qo-status-${String(
                          order.status
                        )
                          .toLowerCase()
                          .replace(/\s+/g, "-")}`}
                      >
                        {order.status}
                      </span>
                    </td>

                    <td>
                      {order.inspectionOutcome || "Pending"}
                    </td>

                    <td>
                      {formatDate(order.createdAt)}
                    </td>

                    <td>
                      <div
                        className="qo-menu-wrapper"
                        ref={
                          openMenuId === order._id
                            ? menuRef
                            : null
                        }
                      >
                        <button
                          type="button"
                          className="qo-three-dot-btn"
                          aria-label={`Actions for ${order.qualityOrderNumber}`}
                          aria-expanded={
                            openMenuId === order._id
                          }
                          aria-haspopup="menu"
                          onClick={() =>
                            setOpenMenuId((previous) =>
                              previous === order._id
                                ? null
                                : order._id
                            )
                          }
                        >
                          &#8942;
                        </button>

                        {openMenuId === order._id && (
                          <div
                            className="qo-dropdown-menu"
                            role="menu"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                setViewOrder(order);
                                setOpenMenuId(null);
                              }}
                            >
                              <span>◉</span> View Details
                            </button>

                            {order.status === "Draft" &&
                              canUpdate && (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() =>
                                    handleEdit(order)
                                  }
                                >
                                  <span>✎</span> Edit Draft
                                </button>
                              )}

                            {order.status === "Draft" &&
                              canOpen && (
                                <>
                                  <div className="qo-menu-divider" />

                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="qo-menu-success"
                                    onClick={() => {
                                      setOpenOrder(order);
                                      setOpenMenuId(null);
                                    }}
                                  >
                                    <span>✓</span>{" "}
                                    Open for Inspection
                                  </button>
                                </>
                              )}

                            {canStartOrder(order) && (
                              <>
                                <div className="qo-menu-divider" />

                                <button
                                  type="button"
                                  role="menuitem"
                                  className="qo-menu-success"
                                  onClick={() => {
                                    setStartOrder(order);
                                    setOpenMenuId(null);
                                  }}
                                >
                                  <span>▶</span>{" "}
                                  Start Inspection
                                </button>
                              </>
                            )}

                            {order.status === "In Progress" &&
                              canViewInspection &&
                              isAssignedInspector(order) && (
                                <>
                                  <div className="qo-menu-divider" />

                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="qo-menu-success"
                                    onClick={() => {
                                      setOpenMenuId(null);

                                      navigate(
                                        `/quality/inspection/${order._id}`
                                      );
                                    }}
                                  >
                                    <span>▤</span>{" "}
                                    Record Inspection Results
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

      {/* ======================================
          VIEW DETAILS
      ====================================== */}

      {viewOrder && (
        <div
          className="qo-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setViewOrder(null);
            }
          }}
        >
          <div
            className="qo-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qo-view-title"
          >
            <div className="qo-modal-header">
              <div>
                <h2 id="qo-view-title">
                  Quality Order Details
                </h2>
                <p>
                  {viewOrder.qualityOrderNumber}
                </p>
              </div>

              <button
                type="button"
                className="qo-modal-close"
                onClick={() => setViewOrder(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="qo-details-grid">
              {[
                [
                  "Quality Order",
                  viewOrder.qualityOrderNumber
                ],
                ["Item", displayItem(viewOrder)],
                [
                  "Reference Type",
                  viewOrder.referenceType
                ],
                ["Status", viewOrder.status],
                [
                  "Outcome",
                  viewOrder.inspectionOutcome
                ],
                [
                  "Plant",
                  displayPlant(viewOrder.plantId)
                ],
                [
                  "Warehouse",
                  viewOrder.warehouseId || "-"
                ],
                [
                  "Batch",
                  viewOrder.batchNumber || "-"
                ],
                [
                  "Serial",
                  viewOrder.serialNumber || "-"
                ],
                [
                  "Total Quantity",
                  `${viewOrder.inspectionQuantity} ${
                    viewOrder.uom || ""
                  }`
                ],
                [
                  "Item Sampling",
                  displayOrderSampling(viewOrder)
                ],
                [
                  "Sample Quantity",
                  viewOrder.sampleQuantity
                ],
                [
                  "Assigned Inspector",
                  displayInspector(
                    viewOrder.assignedInspector
                  )
                ],
                ["UOM", viewOrder.uom || "-"],
                [
                  "Created",
                  formatDate(viewOrder.createdAt)
                ],
                [
                  "Opened",
                  formatDate(viewOrder.openedAt)
                ]
              ].map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <strong>{value ?? "-"}</strong>
                </div>
              ))}

              <div className="qo-full-width">
                <span>Remarks</span>
                <strong>
                  {viewOrder.remarks || "-"}
                </strong>
              </div>
            </div>

            <div className="qo-specifications">
              <h3>Specification Snapshot</h3>

              {!viewOrder.specifications?.length ? (
                <p>
                  No snapshot yet. Active specifications
                  will be copied when this Draft order is
                  opened.
                </p>
              ) : (
                <div className="qo-table-scroll">
                  <table className="qo-table">
                    <thead>
                      <tr>
                        <th>Characteristic</th>
                        <th>Revision</th>
                        <th>Nominal</th>
                        <th>LSL</th>
                        <th>USL</th>
                        <th>Accepted Values</th>
                      </tr>
                    </thead>

                    <tbody>
                      {viewOrder.specifications.map(
                        (spec, index) => (
                          <tr
                            key={`${idOf(
                              spec.characteristicId
                            )}-${index}`}
                          >
                            <td>
                              {displayCharacteristic(
                                spec.characteristicId
                              )}
                            </td>
                            <td>{spec.revision}</td>
                            <td>
                              {spec.nominalValue ?? "-"}
                            </td>
                            <td>
                              {spec.lowerSpecLimit ?? "-"}
                            </td>
                            <td>
                              {spec.upperSpecLimit ?? "-"}
                            </td>
                            <td>
                              {spec.acceptedValues?.join(
                                ", "
                              ) || "-"}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="qo-modal-footer">
              <button
                type="button"
                className="qo-cancel-btn"
                onClick={() => setViewOrder(null)}
              >
                Close
              </button>

              {canUpdate &&
                viewOrder.status === "Draft" && (
                  <button
                    type="button"
                    className="qo-primary-btn"
                    onClick={() =>
                      handleEdit(viewOrder)
                    }
                  >
                    Edit Draft
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          OPEN CONFIRMATION
      ====================================== */}

      {openOrder && (
        <div className="qo-modal-overlay">
          <div
            className="qo-modal qo-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qo-open-title"
          >
            <h2 id="qo-open-title">
              Open Quality Order?
            </h2>

            <p>
              Open{" "}
              <strong>
                {openOrder.qualityOrderNumber}
              </strong>{" "}
              for inspection?
            </p>

            <p className="qo-confirm-note">
              The system will capture the currently
              Active Item Specifications. After opening,
              this Quality Order can no longer be edited
              as a Draft.
            </p>

            <div className="qo-modal-footer">
              <button
                type="button"
                className="qo-cancel-btn"
                onClick={() => setOpenOrder(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="qo-primary-btn"
                onClick={handleOpen}
                disabled={saving}
              >
                {saving
                  ? "Opening..."
                  : "Confirm Open"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================
          START INSPECTION CONFIRMATION
      ====================================== */}

      {startOrder && (
        <div className="qo-modal-overlay">
          <div
            className="qo-modal qo-confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="qo-start-title"
          >
            <h2 id="qo-start-title">
              Start Inspection?
            </h2>

            <p>
              Are you sure you want to start inspection
              for{" "}
              <strong>
                {startOrder.qualityOrderNumber}
              </strong>
              ?
            </p>

            <p className="qo-confirm-note">
              The Quality Order status will change
              from Open to In Progress. You can then
              record measurements in the Inspection
              Execution screen.
            </p>

            <div className="qo-modal-footer">
              <button
                type="button"
                className="qo-cancel-btn"
                onClick={() => setStartOrder(null)}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="button"
                className="qo-primary-btn"
                onClick={handleStartInspection}
                disabled={saving}
              >
                {saving
                  ? "Starting..."
                  : "Confirm Start Inspection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityOrders;
