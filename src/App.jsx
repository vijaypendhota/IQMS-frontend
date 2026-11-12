import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import Users from "./pages/Administration/Users/Users";
import AddUser from "./pages/Administration/Users/AddUser";
import EditUser from "./pages/Administration/Users/EditUser";
import ResetPassword from "./pages/Administration/Users/ResetPassword";
import Roles from "./pages/Administration/Roles/Roles";
import Companies from "./pages/Organization/Companies/Companies";
import Plants from "./pages/Organization/Plants/Plants";
import Departments from "./pages/Organization/Departments/Departments";
import Items from "./pages/Quality/Items/Items";
import Characteristics from "./pages/Quality/Characteristics/Characteristics";
import Specifications from "./pages/Quality/Specifications/Specifications";
import Instruments from "./pages/Quality/Instruments/Instruments";
import CalibrationRecords from "./pages/Quality/Calibration/CalibrationRecords";
import QualityOrders from "./pages/Quality/QualityOrders/QualityOrders";
import ChangePassword from "./pages/Profile/ChangePassword";
import AppLayout from "./components/Layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import InspectionExecution from "./pages/Quality/Inspection/InspectionExecution";
import ItemSampling from "./pages/Quality/ItemSampling/ItemSampling";
import AqlSamplingPlans from "./pages/Quality/AqlSamplingPlans/AqlSamplingPlans";
import AqlTableMaster from "./pages/Quality/AqlTableMaster/AqlTableMaster";

const App = () => (
  <Routes>
    <Route path="/" element={<Login />} />
    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/users" element={<ProtectedRoute requiredPermission="user.view"><Users /></ProtectedRoute>} />
      <Route path="/users/add" element={<ProtectedRoute requiredPermission="user.create"><AddUser /></ProtectedRoute>} />
      <Route path="/users/edit/:id" element={<ProtectedRoute requiredPermission="user.update"><EditUser /></ProtectedRoute>} />
      <Route path="/users/reset-password/:id" element={<ProtectedRoute adminOnly={true}><ResetPassword /></ProtectedRoute>} />
      <Route path="/roles" element={<ProtectedRoute adminOnly={true}><Roles /></ProtectedRoute>} />
      <Route path="/companies" element={<ProtectedRoute requiredPermission="company.view"><Companies /></ProtectedRoute>} />
      <Route path="/plants" element={<ProtectedRoute requiredPermission="plant.view"><Plants /></ProtectedRoute>} />
      <Route path="/departments" element={<ProtectedRoute requiredPermission="department.view"><Departments /></ProtectedRoute>} />
      <Route path="/quality/items" element={<ProtectedRoute requiredPermission="item.view"><Items /></ProtectedRoute>} />
      <Route path="/quality/characteristics" element={<ProtectedRoute requiredPermission="qualityCharacteristic.view"><Characteristics /></ProtectedRoute>} />
      <Route path="/quality/specifications" element={<ProtectedRoute requiredPermission="itemSpecification.view"><Specifications /></ProtectedRoute>} />
      <Route path="/quality/instruments" element={<ProtectedRoute requiredPermission="testInstrument.view"><Instruments /></ProtectedRoute>} />
      <Route path="/quality/calibration" element={<ProtectedRoute requiredPermission="calibration.view"><CalibrationRecords /></ProtectedRoute>} />
      <Route path="/quality/orders" element={<ProtectedRoute requiredPermission="qualityOrder.view"><QualityOrders /></ProtectedRoute>} />
      
      <Route
  path="/quality/inspection/:id"
  element={
    <ProtectedRoute requiredPermission="inspection.view">
      <InspectionExecution />
    </ProtectedRoute>
  }

  />

  <Route
  path="/quality/item-sampling"
  element={
    <ProtectedRoute requiredPermission="itemSampling.view">
      <ItemSampling />
    </ProtectedRoute>
  }
/>

<Route
  path="/quality/aql-sampling-plans"
  element={
    <ProtectedRoute requiredPermission="aqlSamplingPlan.view">
      <AqlSamplingPlans />
    </ProtectedRoute>
  }
/>

<Route
  path="/quality/aql-table-master"
  element={<AqlTableMaster />}
/>

    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>
);

export default App;
