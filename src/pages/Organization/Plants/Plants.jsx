
import React, { useEffect, useState } from "react";
import "./Plants.css";

const Plants = () => {
  const [plants, setPlants] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    plantCode: "",
    plantName: "",
    companyId: "",
    location: "",
    plantType: "Manufacturing",
    status: "Active"
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const token = sessionStorage.getItem("iqms_token");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");

      const headers = {
        Authorization: `Bearer ${token}`
      };

      const [plantResponse, companyResponse] = await Promise.all([
        fetch("http://localhost:1700/api/plants", { headers }),
        fetch("http://localhost:1700/api/companies", { headers })
      ]);

      const plantData = await plantResponse.json();
      const companyData = await companyResponse.json();

      if (!plantResponse.ok) {
        throw new Error(plantData.msg || "Failed to load plants");
      }

      if (!companyResponse.ok) {
        throw new Error(companyData.msg || "Failed to load companies");
      }

      setPlants(plantData.plants || []);
      setCompanies(companyData.companies || []);

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

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
  editingId
    ? `http://localhost:1700/api/plants/${editingId}`
    : "http://localhost:1700/api/plants",
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
    data.msg || "Failed to save plant"
  );
}

// Success message for Create or Update
setMessage(
  editingId
    ? "Plant updated successfully"
    : "Plant created successfully"
);

// Exit Edit mode
setEditingId(null);

// Clear form
setFormData({
  plantCode: "",
  plantName: "",
  companyId: "",
  location: "",
  plantType: "Manufacturing",
  status: "Active"
});

// Refresh Plant List
await fetchData();

} catch (err) {
  setError(err.message);
} finally {
  setSaving(false);
}
};


  const handleEdit = (plant) => {
  setEditingId(plant._id);

  setFormData({
    plantCode: plant.plantCode,
    plantName: plant.plantName,
    companyId: plant.companyId?._id || plant.companyId,
    location: plant.location || "",
    plantType: plant.plantType || "",
    status: plant.status
  });

  setError("");
  setMessage("");

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

const handleCancelEdit = () => {
  setEditingId(null);

  setFormData({
    plantCode: "",
    plantName: "",
    companyId: "",
    location: "",
    plantType: "",
    status: "Active"
  });

  setError("");
  setMessage("");
};

  return (
    <div className="plants-page">
      <div className="plants-header">
        <h1>Plant Management</h1>
        <p>Manage manufacturing facilities across companies</p>
      </div>

      <div className="plants-card">
        <h2>{editingId ? "Edit Plant" : "Add Plant"}</h2>

        <form onSubmit={handleSubmit}>
          <div className="plants-form-grid">
            <div>
              <label>Company</label>
              <select
                name="companyId"
                value={formData.companyId}
                onChange={handleChange}
                 disabled={Boolean(editingId)}
                required
              >
                <option value="">Select Company</option>

                {companies
                  .filter((company) => company.status === "Active")
                  .map((company) => (
                    <option key={company._id} value={company._id}>
                      {company.companyCode} - {company.companyName}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label>Plant Code</label>
              <input
                name="plantCode"
                value={formData.plantCode}
                onChange={handleChange}
                 readOnly={Boolean(editingId)}
                placeholder="APX-VSP-01"
                required
              />
            </div>

            <div>
              <label>Plant Name</label>
              <input
                name="plantName"
                value={formData.plantName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Location</label>
              <input
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label>Plant Type</label>
              <select
                name="plantType"
                value={formData.plantType}
                onChange={handleChange}
              >
                <option value="Manufacturing">Manufacturing</option>
                <option value="Assembly">Assembly</option>
                <option value="Processing">Processing</option>
                <option value="Warehouse">Warehouse</option>
                <option value="Service">Service</option>
              </select>
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
          </div>

          
<button type="submit" disabled={saving}>
  {saving
    ? "Saving..."
    : editingId
      ? "Update Plant"
      : "Save Plant"}
</button>

{editingId && (
  <button
    type="button"
    className="plants-cancel-btn"
    onClick={handleCancelEdit}
  >
    Cancel
  </button>
)}

        </form>
      </div>

      {message && <p className="plants-success">{message}</p>}
      {error && <p className="plants-error">{error}</p>}

      <div className="plants-card">
        <h2>Plant List</h2>

        {loading ? (
          <p>Loading plants...</p>
        ) : (
          <div className="plants-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Plant Code</th>
                  <th>Plant Name</th>
                  <th>Company</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {plants.length === 0 ? (
                  <tr>
                    <td colSpan="7">No plants found</td>
                  </tr>
                ) : (
                  plants.map((plant) => (
                    <tr key={plant._id}>
                      <td>{plant.plantCode}</td>
                      <td>{plant.plantName}</td>
                      <td>
                        {plant.companyId?.companyName || "-"}
                      </td>
                      <td>{plant.location}</td>
                      <td>{plant.plantType}</td>
                      <td>{plant.status}</td>
                      <td>
  <button
    type="button"
    className="plants-edit-btn"
    onClick={() => handleEdit(plant)}
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

export default Plants;
