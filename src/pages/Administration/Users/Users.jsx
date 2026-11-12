
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "./Users.css";

import { useCurrentUser } from "../../../hooks/useCurrentUser";
import { hasPermission } from "../../../utils/permissions";

const Users = () => {
  const navigate = useNavigate();

  const { user: currentUser } = useCurrentUser();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canCreateUser = hasPermission(
    currentUser,
    "user.create"
  );

  const canUpdateUser = hasPermission(
    currentUser,
    "user.update"
  );

  const isAdmin = currentUser?.role === "Admin";

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");

        const token = sessionStorage.getItem("iqms_token");

        const response = await fetch(
          "http://localhost:1700/api/user/get-users",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`
            },
            signal: controller.signal
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.msg || "Failed to fetch users");
        }

        setUsers(data.getDetails || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchUsers();

    return () => controller.abort();
  }, []);

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <h1>User Management</h1>
          <p>Manage IQMS application users</p>
        </div>

        {canCreateUser && (
          <button onClick={() => navigate("/users/add")}>
            + Add User
          </button>
        )}
      </div>

      {loading && <p>Loading users...</p>}
      {error && <p className="users-error">{error}</p>}

      {!loading && !error && (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Username</th>
                <th>Email</th>
                <th>Created Date</th>
                <th>Role</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="7">No users found</td>
                </tr>
              ) : (
                users.map((tableUser, index) => (
                  <tr key={tableUser._id}>
                    <td>{index + 1}</td>
                    <td>{tableUser.username}</td>
                    <td>{tableUser.email}</td>
                    <td>
                      {tableUser.createdAt
                        ? new Date(
                            tableUser.createdAt
                          ).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>{tableUser.role || "-"}</td>
                    <td>{tableUser.status || "-"}</td>
                    <td>
                      <div className="user-action-buttons">
                        {canUpdateUser && (
                          <button
                            type="button"
                            className="edit-user-btn"
                            onClick={() =>
                              navigate(
                                `/users/edit/${tableUser._id}`
                              )
                            }
                          >
                            Edit
                          </button>
                        )}

                        {isAdmin &&
                          tableUser.role !== "Admin" &&
                          tableUser._id !== currentUser?.id && (
                            <button
                              type="button"
                              className="reset-user-btn"
                              onClick={() =>
                                navigate(
                                  `/users/reset-password/${tableUser._id}`
                                )
                              }
                            >
                              Reset Password
                            </button>
                          )}

                        {!canUpdateUser && !isAdmin && "-"}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Users;
