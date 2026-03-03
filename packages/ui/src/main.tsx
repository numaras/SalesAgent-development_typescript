import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import LoginPage from "./pages/LoginPage";
import SelectTenantPage from "./pages/SelectTenantPage";
import TenantDashboard from "./pages/TenantDashboard";
import ProductsListPage from "./pages/ProductsListPage";
import ProductAddPage from "./pages/ProductAddPage";
import ProductEditPage from "./pages/ProductEditPage";
import CreativesReviewPage from "./pages/CreativesReviewPage";
import CreativesListPage from "./pages/CreativesListPage";
import WorkflowsListPage from "./pages/WorkflowsListPage";
import WorkflowReviewPage from "./pages/WorkflowReviewPage";
import AuthorizedPropertiesPage from "./pages/AuthorizedPropertiesPage";
import InventoryProfilesPage from "./pages/InventoryProfilesPage";
import InventoryProfileEditPage from "./pages/InventoryProfileEditPage";
import PrincipalsPage from "./pages/PrincipalsPage";
import UsersPage from "./pages/UsersPage";
import TenantSettingsPage from "./pages/TenantSettingsPage";
import GamConfigPage from "./pages/GamConfigPage";
import GamReportingPage from "./pages/GamReportingPage";
import SignupPage from "./pages/SignupPage";
import CreativeAgentsPage from "./pages/CreativeAgentsPage";
import CreativesAddPage from "./pages/CreativesAddPage";
import MediaBuyDetailPage from "./pages/MediaBuyDetailPage";
import MediaBuysListPage from "./pages/MediaBuysListPage";

const cockpitTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#00d4ff", light: "#5ee7ff", dark: "#0099bb" },
    secondary: { main: "#7c3aed", light: "#a855f7", dark: "#5b21b6" },
    background: { default: "#080c18", paper: "#0d1526" },
    text: { primary: "#dce8f5", secondary: "#7da0c0" },
    success: { main: "#00e5a0" },
    warning: { main: "#f59e0b" },
    error: { main: "#ff4560" },
    divider: "rgba(0, 212, 255, 0.12)",
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: "-0.02em" },
    h2: { fontWeight: 700, letterSpacing: "-0.01em" },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600, letterSpacing: "0.03em" },
    overline: { letterSpacing: "0.12em", fontWeight: 600 },
  },
  shape: { borderRadius: 6 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage: `
            linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
        },
        /* ── Native form element resets ── */
        "input, textarea, select": {
          backgroundColor: "#0d1526 !important",
          color: "#c8d8f0 !important",
          border: "1px solid rgba(0, 212, 255, 0.2) !important",
          borderRadius: "4px !important",
          padding: "6px 10px !important",
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif !important',
          fontSize: "0.875rem !important",
          outline: "none !important",
          boxSizing: "border-box" as const,
          transition: "border-color 0.2s ease !important",
          appearance: "none" as const,
          WebkitAppearance: "none" as const,
        },
        "input:focus, textarea:focus, select:focus": {
          borderColor: "#00d4ff !important",
          boxShadow: "0 0 0 2px rgba(0, 212, 255, 0.12) !important",
        },
        "input::placeholder, textarea::placeholder": {
          color: "rgba(107, 138, 176, 0.6) !important",
        },
        "input[type='checkbox']": {
          width: 16,
          height: 16,
          padding: "0 !important",
          accentColor: "#00d4ff",
          cursor: "pointer",
        },
        "select option": {
          backgroundColor: "#0d1526 !important",
          color: "#c8d8f0 !important",
        },
        /* ── Native button reset ── */
        "button:not([class*='Mui'])": {
          backgroundColor: "rgba(0, 212, 255, 0.1) !important",
          color: "#00d4ff !important",
          border: "1px solid rgba(0, 212, 255, 0.3) !important",
          borderRadius: "4px !important",
          padding: "6px 16px !important",
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif !important',
          fontSize: "0.875rem !important",
          fontWeight: "600 !important",
          cursor: "pointer !important",
          transition: "all 0.15s ease !important",
          letterSpacing: "0.02em !important",
        },
        "button:not([class*='Mui']):hover": {
          backgroundColor: "rgba(0, 212, 255, 0.18) !important",
          borderColor: "#00d4ff !important",
          boxShadow: "0 0 10px rgba(0, 212, 255, 0.2) !important",
        },
        "button:not([class*='Mui']):disabled": {
          opacity: "0.45 !important",
          cursor: "not-allowed !important",
        },
        /* ── Fieldset / legend ── */
        fieldset: {
          borderColor: "rgba(0, 212, 255, 0.2) !important",
          borderRadius: "6px !important",
        },
        legend: {
          color: "#6b8ab0 !important",
          fontSize: "0.8rem !important",
          fontWeight: "600 !important",
          letterSpacing: "0.05em !important",
        },
        /* ── Table in pages that haven't migrated ── */
        "table:not([class*='Mui'])": {
          borderCollapse: "collapse",
          width: "100%",
          fontSize: "0.875rem",
          color: "#c8d8f0",
        },
        "table:not([class*='Mui']) th": {
          color: "#4a7a9b",
          fontWeight: 600,
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          borderBottom: "1px solid rgba(0, 212, 255, 0.12)",
          padding: "8px 6px",
          textAlign: "left",
        },
        "table:not([class*='Mui']) td": {
          padding: "8px 6px",
          borderBottom: "1px solid rgba(0, 212, 255, 0.06)",
        },
        "table:not([class*='Mui']) tr:hover td": {
          backgroundColor: "rgba(0, 212, 255, 0.04)",
        },
        /* ── Scrollbar ── */
        "::-webkit-scrollbar": { width: 6, height: 6 },
        "::-webkit-scrollbar-track": { background: "transparent" },
        "::-webkit-scrollbar-thumb": {
          background: "rgba(0, 212, 255, 0.2)",
          borderRadius: 3,
        },
        "::-webkit-scrollbar-thumb:hover": {
          background: "rgba(0, 212, 255, 0.4)",
        },
        /* ── Anchors outside MUI ── */
        "a:not([class*='Mui'])": {
          color: "#00d4ff",
          textDecoration: "none",
        },
        "a:not([class*='Mui']):hover": {
          textDecoration: "underline",
          textUnderlineOffset: 3,
        },
        /* ── Headings for un-migrated pages ── */
        "h1, h2, h3, h4, h5, h6": {
          color: "#e2e8f0",
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        p: { color: "#8fa8c0" },
        code: {
          background: "rgba(0, 212, 255, 0.08)",
          border: "1px solid rgba(0, 212, 255, 0.15)",
          borderRadius: 3,
          padding: "1px 5px",
          fontSize: "0.8em",
          color: "#00d4ff",
          fontFamily: '"Roboto Mono", monospace',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(0, 212, 255, 0.1)",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid rgba(0, 212, 255, 0.1)",
          "&:hover": { border: "1px solid rgba(0, 212, 255, 0.3)" },
          transition: "border-color 0.2s ease",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
        containedPrimary: {
          background: "linear-gradient(135deg, #00b4d8 0%, #0077b6 100%)",
          boxShadow: "0 0 12px rgba(0, 212, 255, 0.3)",
          "&:hover": { boxShadow: "0 0 20px rgba(0, 212, 255, 0.5)" },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background: "rgba(8, 12, 24, 0.95)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(0, 212, 255, 0.15)",
          boxShadow: "0 1px 20px rgba(0, 0, 0, 0.5)",
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          background: "#0a0f1e",
          borderRight: "1px solid rgba(0, 212, 255, 0.12)",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderBottom: "1px solid rgba(0, 212, 255, 0.08)" },
        head: { color: "#5e92b8", fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: "0.7rem", letterSpacing: "0.05em" },
      },
    },
    MuiTextField: {
      defaultProps: { variant: "outlined" },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": { borderColor: "rgba(0, 212, 255, 0.2)" },
            "&:hover fieldset": { borderColor: "rgba(0, 212, 255, 0.4)" },
            "&.Mui-focused fieldset": { borderColor: "#00d4ff" },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          "&.Mui-selected": {
            background: "rgba(0, 212, 255, 0.08)",
            borderLeft: "3px solid #00d4ff",
            "&:hover": { background: "rgba(0, 212, 255, 0.12)" },
          },
          "&:hover": { background: "rgba(0, 212, 255, 0.05)" },
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={cockpitTheme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-tenant" element={<SelectTenantPage />} />
        <Route path="/tenant/:id" element={<TenantDashboard />} />
        <Route path="/tenant/:id/products" element={<ProductsListPage />} />
        <Route path="/tenant/:id/products/add" element={<ProductAddPage />} />
        <Route path="/tenant/:id/products/:productId/edit" element={<ProductEditPage />} />
        <Route path="/tenant/:id/creatives/add" element={<CreativesAddPage />} />
        <Route path="/tenant/:id/creatives/review" element={<CreativesReviewPage />} />
        <Route path="/tenant/:id/creatives/list" element={<CreativesListPage />} />
        <Route path="/tenant/:id/workflows" element={<WorkflowsListPage />} />
        <Route path="/tenant/:id/workflows/:workflowId/steps/:stepId/review" element={<WorkflowReviewPage />} />
        <Route path="/tenant/:id/authorized-properties/create" element={<AuthorizedPropertiesPage />} />
        <Route path="/tenant/:id/authorized-properties/:propertyId/edit" element={<AuthorizedPropertiesPage />} />
        <Route path="/tenant/:id/authorized-properties" element={<AuthorizedPropertiesPage />} />
        <Route path="/tenant/:id/inventory" element={<LegacyInventoryRedirect />} />
        <Route path="/tenant/:id/targeting" element={<LegacyTargetingRedirect />} />
        <Route path="/tenant/:id/inventory-profiles" element={<InventoryProfilesPage />} />
        <Route path="/tenant/:id/inventory-profiles/add" element={<InventoryProfileEditPage />} />
        <Route path="/tenant/:id/inventory-profiles/:profileId/edit" element={<InventoryProfileEditPage />} />
        <Route path="/tenant/:id/principals/create" element={<PrincipalsPage />} />
        <Route path="/tenant/:id/principals/:principalId/edit" element={<PrincipalsPage />} />
        <Route path="/tenant/:id/principals" element={<PrincipalsPage />} />
        <Route path="/tenant/:id/creative-agents/add" element={<CreativeAgentsPage />} />
        <Route path="/tenant/:id/creative-agents/:agentId/edit" element={<CreativeAgentsPage />} />
        <Route path="/tenant/:id/creative-agents" element={<CreativeAgentsPage />} />
        <Route path="/tenant/:id/users" element={<UsersPage />} />
        <Route path="/tenant/:id/settings" element={<TenantSettingsPage />} />
        <Route path="/tenant/:id/gam/config" element={<GamConfigPage />} />
        <Route path="/tenant/:id/gam/reporting" element={<GamReportingPage />} />
        <Route path="/tenant/:id/media-buys" element={<MediaBuysListPage />} />
        <Route path="/tenant/:id/media-buy/:mbId" element={<MediaBuyDetailPage />} />
        <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

function NotFound() {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", bgcolor: "background.default", gap: 1 }}>
      <Typography variant="h1" sx={{ fontFamily: "monospace", color: "primary.main", fontWeight: 800, lineHeight: 1 }}>404</Typography>
      <Typography variant="body1" sx={{ color: "text.secondary" }}>Page not found.</Typography>
    </Box>
  );
}

function LegacyInventoryRedirect() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <NotFound />;
  return <Navigate to={`/tenant/${id}/inventory-profiles`} replace />;
}

function LegacyTargetingRedirect() {
  const { id } = useParams<{ id: string }>();
  if (!id) return <NotFound />;
  return <Navigate to={`/tenant/${id}/settings`} replace />;
}

import { Box, Typography } from "@mui/material";
