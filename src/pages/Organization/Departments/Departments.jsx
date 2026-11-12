import React, { useEffect, useState } from "react";
import "./Departments.css";

const API = "http://localhost:1700/api";

const emptyForm = () => ({
  departmentCode: "",
  departmentName: "",
  plantId: "",
  departmentType: "Quality",
  status: "Active",
});

const getId = (value) =>
  value && typeof value === "object" ? String(value._id || "") : String(value || "");

const readJson = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Unexpected response from server (${response.status}).`);
  }
};

const Departments = () => {
  const [companies, setCompanies] = useState([]);
  const [plants, setPlants] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [companyId, setCompanyId] = useState("");
  const [formData, setFormData] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);

  const getToken = () => {
    const token = sessionStorage.getItem("iqms_token");
    if (!token) throw new Error("Login session not found. Please log in again.");
    return token;
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const token = getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const responses = await Promise.all([
        fetch(`${API}/companies`, { headers }),
        fetch(`${API}/plants`, { headers }),
        fetch(`${API}/departments`, { headers }),
      ]);
      const results = await Promise.all(responses.map(readJson));
      responses.forEach((response, index) => {
        if (!response.ok) {
          throw new Error(results[index].message || results[index].msg || `Failed to load data (${response.status})`);
        }
      });
      setCompanies(results[0].companies || []);
      setPlants(results[1].plants || []);
      setDepartments(results[2].departments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const handleCompanyChange = (e) => {
    setCompanyId(e.target.value);
    setFormData((prev) => ({ ...prev, plantId: "" }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const filteredPlants = plants.filter(
    (plant) => getId(plant.companyId) === companyId &&
      (plant.status === "Active" || (editingId && getId(plant._id) === formData.plantId))
  );

  const resetForm = () => {
    setEditingId(null);
    setCompanyId("");
    setFormData(emptyForm());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const token = getToken();
      if (!companyId || !formData.plantId) {
        throw new Error("Please select a company and plant.");
      }
      const isEditing = Boolean(editingId);
      const response = await fetch(
        isEditing ? `${API}/departments/${editingId}` : `${API}/departments`,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            departmentCode: formData.departmentCode.trim(),
            departmentName: formData.departmentName.trim(),
            plantId: formData.plantId,
            departmentType: formData.departmentType,
            status: formData.status,
          }),
        }
      );
      const data = await readJson(response);
      if (!response.ok) {
        throw new Error(data.message || data.msg || `Failed to save department (${response.status})`);
      }
      resetForm();
      await fetchData();
      setMessage(isEditing ? "Department updated successfully" : "Department created successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (department) => {
    const selectedPlantId = getId(department.plantId);
    const selectedPlant = plants.find((plant) => getId(plant._id) === selectedPlantId);
    const selectedCompanyId = getId(
      selectedPlant?.companyId || department.plantId?.companyId
    );

    setEditingId(department._id);
    setCompanyId(selectedCompanyId);
    setFormData({
      departmentCode: department.departmentCode || "",
      departmentName: department.departmentName || "",
      plantId: selectedPlantId,
      departmentType: department.departmentType || "Quality",
      status: department.status || "Active",
    });
    setError("");
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    resetForm();
    setError("");
    setMessage("");
  };

  const getPlant = (department) =>
    plants.find((plant) => getId(plant._id) === getId(department.plantId));

  const getCompanyName = (department) => {
    const plant = getPlant(department);
    const companyRef = plant?.companyId || department.plantId?.companyId;
    if (companyRef && typeof companyRef === "object" && companyRef.companyName) {
      return companyRef.companyName;
    }
    return companies.find((company) => getId(company._id) === getId(companyRef))?.companyName || "-";
  };

  return (
    <div className="departments-page">
      <div className="departments-header">
        <h1>Department Management</h1>
        <p>Manage departments across companies and plants</p>
      </div>

      <div className="departments-card">
        <h2>{editingId ? "Edit Department" : "Add Department"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="departments-form-grid">
            <div>
              <label htmlFor="department-company">Company</label>
              <select id="department-company" value={companyId} onChange={handleCompanyChange} disabled={Boolean(editingId) || saving} required>
                <option value="">Select Company</option>
                {companies.filter((company) => company.status === "Active" || getId(company._id) === companyId).map((company) => (
                  <option key={company._id} value={company._id}>
                    {company.companyCode} - {company.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="department-plant">Plant</label>
              <select id="department-plant" name="plantId" value={formData.plantId} onChange={handleChange} disabled={Boolean(editingId) || saving || !companyId} required>
                <option value="">Select Plant</option>
                {filteredPlants.map((plant) => (
                  <option key={plant._id} value={plant._id}>
                    {plant.plantCode} - {plant.plantName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="department-code">Department Code</label>
              <input id="department-code" name="departmentCode" value={formData.departmentCode} onChange={handleChange} readOnly={Boolean(editingId)} disabled={saving} placeholder="QA" required />
            </div>

            <div>
              <label htmlFor="department-name">Department Name</label>
              <input id="department-name" name="departmentName" value={formData.departmentName} onChange={handleChange} disabled={saving} placeholder="Quality Assurance" required />
            </div>

            <div>
              <label htmlFor="department-type">Department Type</label>
              <select id="department-type" name="departmentType" value={formData.departmentType} onChange={handleChange} disabled={saving}>
                {["Quality", "Production", "Maintenance", "Inventory", "Engineering", "Administration", "Other"].map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="department-status">Status</label>
              <select id="department-status" name="status" value={formData.status} onChange={handleChange} disabled={saving}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="departments-form-actions">
            <button type="submit" disabled={saving}>
              {saving ? (editingId ? "Updating..." : "Saving...") : (editingId ? "Update Department" : "Save Department")}
            </button>
            {editingId && (
              <button type="button" className="departments-cancel-btn" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {message && <p className="departments-success" role="status">{message}</p>}
      {error && <p className="departments-error" role="alert">{error}</p>}

      <div className="departments-card">
        <h2>Department List</h2>
        {loading ? (
          <p>Loading departments...</p>
        ) : (
          <div className="departments-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Code</th><th>Department</th><th>Type</th><th>Plant</th><th>Company</th><th>Status</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr><td colSpan={7}>No departments found</td></tr>
                ) : (
                  departments.map((department) => (
                    <tr key={department._id}>
                      <td>{department.departmentCode}</td>
                      <td>{department.departmentName}</td>
                      <td>{department.departmentType}</td>
                      <td>{getPlant(department)?.plantCode || department.plantId?.plantCode || "-"}</td>
                      <td>{getCompanyName(department)}</td>
                      <td>{department.status}</td>
                      <td>
                        <button type="button" className="departments-edit-btn" onClick={() => handleEdit(department)} disabled={saving}>Edit</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Departments;
