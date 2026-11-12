
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import "./Sidebar.css";

import { useCurrentUser } from "../../hooks/useCurrentUser";
import { hasPermission } from "../../utils/permissions";

const Sidebar = () => {
  const [organizationOpen, setOrganizationOpen] = useState(true);
  const [administrationOpen, setAdministrationOpen] = useState(true);
  const [qualityOpen, setQualityOpen] = useState(true);

  const { user, loading } = useCurrentUser();

  // ==========================================
  // PERMISSION CHECKS
  // ==========================================

  const canViewUsers = hasPermission(user, "user.view");

  const canViewCompanies = hasPermission(user, "company.view");

  const canViewPlants = hasPermission(user, "plant.view");

  const canViewDepartments = hasPermission(
    user,
    "department.view"
  );

  const canViewItems = hasPermission(user, "item.view");

  const canViewCharacteristics = hasPermission(
    user,
    "qualityCharacteristic.view"
  );

  const canViewSpecifications = hasPermission(
    user,
    "itemSpecification.view"
  );

  const canViewItemSampling = hasPermission(
    user,
    "itemSampling.view"
  );

  // NEW: AQL SAMPLING PLAN PERMISSION
  const canViewAqlSamplingPlans = hasPermission(
    user,
    "aqlSamplingPlan.view"
  );

  // AQL Table Master uses the same view permission
  // as AQL Sampling Plans in the current backend.
  const canViewAqlTableMaster = canViewAqlSamplingPlans;

  const canViewInstruments = hasPermission(
    user,
    "testInstrument.view"
  );

  const canViewCalibration = hasPermission(
    user,
    "calibration.view"
  );

  const canViewQualityOrders = hasPermission(
    user,
    "qualityOrder.view"
  );

  const isAdmin = user?.role === "Admin";

  // ==========================================
  // SIDEBAR GROUP VISIBILITY
  // ==========================================

  const showAdministration =
    canViewUsers || isAdmin;

  const showOrganization =
    canViewCompanies ||
    canViewPlants ||
    canViewDepartments;

  const showQuality =
    canViewItems ||
    canViewCharacteristics ||
    canViewSpecifications ||
    canViewItemSampling ||
    canViewAqlSamplingPlans ||
    canViewAqlTableMaster ||
    canViewInstruments ||
    canViewCalibration ||
    canViewQualityOrders;

  return (
    <aside className="iqms-sidebar">

      {/* ======================================
          SIDEBAR BRAND
      ====================================== */}

      <div className="sidebar-brand">
        <h2>IQMS</h2>
        <p>Industrial Manufacturing Platform</p>
      </div>

      <nav className="sidebar-nav">

        {/* ======================================
            DASHBOARD
        ====================================== */}

        <NavLink
          to="/dashboard"
          className="sidebar-link"
        >
          Dashboard
        </NavLink>

        {/* ======================================
            ADMINISTRATION
        ====================================== */}

        {!loading && showAdministration && (
          <>
            <button
              type="button"
              className="sidebar-group-button"
              aria-expanded={administrationOpen}
              onClick={() =>
                setAdministrationOpen(
                  (previous) => !previous
                )
              }
            >
              Administration

              <span>
                {administrationOpen ? "−" : "+"}
              </span>
            </button>

            {administrationOpen && (
              <div className="sidebar-submenu">

                {canViewUsers && (
                  <NavLink
                    to="/users"
                    className="sidebar-link"
                  >
                    User Management
                  </NavLink>
                )}

                {isAdmin && (
                  <NavLink
                    to="/roles"
                    className="sidebar-link"
                  >
                    Roles &amp; Permissions
                  </NavLink>
                )}

              </div>
            )}
          </>
        )}

        {/* ======================================
            ORGANIZATION
        ====================================== */}

        {!loading && showOrganization && (
          <>
            <button
              type="button"
              className="sidebar-group-button"
              aria-expanded={organizationOpen}
              onClick={() =>
                setOrganizationOpen(
                  (previous) => !previous
                )
              }
            >
              Organization

              <span>
                {organizationOpen ? "−" : "+"}
              </span>
            </button>

            {organizationOpen && (
              <div className="sidebar-submenu">

                {canViewCompanies && (
                  <NavLink
                    to="/companies"
                    className="sidebar-link"
                  >
                    Companies
                  </NavLink>
                )}

                {canViewPlants && (
                  <NavLink
                    to="/plants"
                    className="sidebar-link"
                  >
                    Plants
                  </NavLink>
                )}

                {canViewDepartments && (
                  <NavLink
                    to="/departments"
                    className="sidebar-link"
                  >
                    Departments
                  </NavLink>
                )}

              </div>
            )}
          </>
        )}

        {/* ======================================
            QUALITY MANAGEMENT
        ====================================== */}

        {!loading && showQuality && (
          <>
            <button
              type="button"
              className="sidebar-group-button"
              aria-expanded={qualityOpen}
              onClick={() =>
                setQualityOpen(
                  (previous) => !previous
                )
              }
            >
              Quality Management

              <span>
                {qualityOpen ? "−" : "+"}
              </span>
            </button>

            {qualityOpen && (
              <div className="sidebar-submenu">

                {/* ITEM MASTER */}

                {canViewItems && (
                  <NavLink
                    to="/quality/items"
                    className="sidebar-link"
                  >
                    Item Master
                  </NavLink>
                )}

                {/* QUALITY CHARACTERISTICS */}

                {canViewCharacteristics && (
                  <NavLink
                    to="/quality/characteristics"
                    className="sidebar-link"
                  >
                    Quality Characteristics
                  </NavLink>
                )}

                {/* ITEM SPECIFICATIONS */}

                {canViewSpecifications && (
                  <NavLink
                    to="/quality/specifications"
                    className="sidebar-link"
                  >
                    Item Specifications
                  </NavLink>
                )}

                {/* ITEM SAMPLING MASTER */}

                {canViewItemSampling && (
                  <NavLink
                    to="/quality/item-sampling"
                    className="sidebar-link"
                  >
                    Item Sampling
                  </NavLink>
                )}

                {/* ==================================
                    AQL SAMPLING PLANS - NEW
                ================================== */}

                {canViewAqlSamplingPlans && (
                  <NavLink
                    to="/quality/aql-sampling-plans"
                    className="sidebar-link"
                  >
                    AQL Sampling Plans
                  </NavLink>
                )}

                {/* ==================================
                    AQL TABLE MASTER - NEW
                ================================== */}

                {canViewAqlTableMaster && (
                  <NavLink
                    to="/quality/aql-table-master"
                    className="sidebar-link"
                  >
                    AQL Table Master
                  </NavLink>
                )}

                {/* TEST INSTRUMENT MASTER */}

                {canViewInstruments && (
                  <NavLink
                    to="/quality/instruments"
                    className="sidebar-link"
                  >
                    Test Instrument Master
                  </NavLink>
                )}

                {/* CALIBRATION RECORDS */}

                {canViewCalibration && (
                  <NavLink
                    to="/quality/calibration"
                    className="sidebar-link"
                  >
                    Calibration Records
                  </NavLink>
                )}

                {/* QUALITY ORDERS */}

                {canViewQualityOrders && (
                  <NavLink
                    to="/quality/orders"
                    className="sidebar-link"
                  >
                    Quality Orders
                  </NavLink>
                )}

              </div>
            )}
          </>
        )}

        {/* ======================================
            FUTURE MODULES
        ====================================== */}

        <div className="sidebar-section-title">
          Future Modules
        </div>

        <div className="sidebar-disabled">
          Manufacturing Execution (MES)
        </div>

        <div className="sidebar-disabled">
          Production
        </div>

        <div className="sidebar-disabled">
          Inventory
        </div>

        <div className="sidebar-disabled">
          Asset Management
        </div>

      </nav>
    </aside>
  );
};

export default Sidebar;
