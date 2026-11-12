
import React, { useEffect, useState } from "react";
import "./Companies.css";

const Companies = () => {
  const [companies, setCompanies] = useState([]);

  const [formData, setFormData] = useState({
    companyCode: "",
    companyName: "",
    description: "",
    country: "",
    status: "Active"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);


  const token = sessionStorage.getItem("iqms_token");

  
  const fetchCompanies = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:1700/api/companies",
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.msg || "Failed to fetch companies");
      }

          setCompanies(data.companies || []);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  

  // Automatically hide success message after 3 seconds
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);


  // CREATE OR UPDATE COMPANY
  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        editingId
          ? `http://localhost:1700/api/companies/${editingId}`
          : "http://localhost:1700/api/companies",
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.msg || "Failed to save company"
        );
      }

      setMessage(
        editingId
          ? "Company updated successfully"
          : "Company created successfully"
      );

      setEditingId(null);

      setFormData({
        companyCode: "",
        companyName: "",
        description: "",
        country: "",
        status: "Active"
      });

      await fetchCompanies();

    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };


  // EDIT COMPANY
  const handleEdit = (company) => {
    setEditingId(company._id);

    setFormData({
      companyCode: company.companyCode,
      companyName: company.companyName,
      description: company.description || "",
      country: company.country || "",
      status: company.status
    });

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  };


  // CANCEL EDIT
  const handleCancelEdit = () => {
    setEditingId(null);

    setFormData({
      companyCode: "",
      companyName: "",
      description: "",
      country: "",
      status: "Active"
    });

    setError("");
    setMessage("");
  };

  return (
    <div className="companies-page">
      <div className="companies-header">
        <h1>Company Management</h1>
        <p>Organization master data for IQMS and MES</p>
      </div>

      <div className="companies-form-card">
        <h2>Add Company</h2>

        <form onSubmit={handleSubmit}>
          <div className="companies-form-grid">
            <div>
              <label>Company Code</label>
              <input
                name="companyCode"
                value={formData.companyCode}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Company Name</label>
              <input
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Country</label>
              <input
                name="country"
                value={formData.country}
                onChange={handleChange}
              />
            </div>

            <div>
              <label>Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="companies-full-width">
              <label>Description</label>
              <input
                name="description"
                value={formData.description}
                onChange={handleChange}
              />
            </div>
          </div>

          
<button type="submit" disabled={saving}>
  {saving
    ? "Saving..."
    : editingId
      ? "Update Company"
      : "Save Company"}
</button>

{editingId && (
  <button
    type="button"
    className="companies-cancel-btn"
    onClick={handleCancelEdit}
  >
    Cancel
  </button>
)}

        </form>
      </div>

      {message && <p className="companies-success">{message}</p>}
      {error && <p className="companies-error">{error}</p>}

      <div className="companies-list-card">
        <h2>Company List</h2>

        {loading ? (
          <p>Loading companies...</p>
        ) : (
          
<div className="companies-table-wrap">
  <table>
    <thead>
      <tr>
        <th>Company Code</th>
        <th>Company Name</th>
        <th>Country</th>
        <th>Status</th>
        <th>Action</th>
      </tr>
    </thead>

    <tbody>
      {companies.length === 0 ? (
        <tr>
          <td colSpan="5">No companies found</td>
        </tr>
      ) : (
        companies.map((company) => (
          <tr key={company._id}>
            <td>{company.companyCode}</td>
            <td>{company.companyName}</td>
            <td>{company.country || "-"}</td>
            <td>{company.status}</td>

            <td>
              <button
                type="button"
                className="companies-edit-btn"
                onClick={() => handleEdit(company)}
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

        )}
      </div>
    </div>
  );
};

export default Companies;
