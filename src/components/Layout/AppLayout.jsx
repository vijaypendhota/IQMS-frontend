

import React from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

import "./AppLayout.css";

const AppLayout = () => {
  return (
    <div className="iqms-layout">

      <Sidebar />

      <div className="iqms-main">

        <Topbar />

        <main className="iqms-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
};

export default AppLayout;
