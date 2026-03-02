import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  AppBar, Box, Drawer, IconButton, List, ListItemButton,
  ListItemIcon, ListItemText, Toolbar, Typography, Tooltip,
  Divider, Chip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import PaletteIcon from "@mui/icons-material/Palette";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BarChartIcon from "@mui/icons-material/BarChart";
import DomainIcon from "@mui/icons-material/Domain";
import LayersIcon from "@mui/icons-material/Layers";
import PeopleIcon from "@mui/icons-material/People";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import SettingsIcon from "@mui/icons-material/Settings";
import TuneIcon from "@mui/icons-material/Tune";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import RadioButtonCheckedIcon from "@mui/icons-material/RadioButtonChecked";

const DRAWER_WIDTH = 220;
const DRAWER_COLLAPSED = 56;

const scriptRoot = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
function prefixed(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return scriptRoot ? `${scriptRoot}${p}` : p;
}

export interface BaseLayoutProps {
  children: ReactNode;
  tenantId?: string | null;
  tenantName?: string | null;
  faviconUrl?: string | null;
}

interface NavItem {
  label: string;
  icon: ReactNode;
  to: string;
  match?: string;
}

export function BaseLayout({ children, tenantId, tenantName, faviconUrl }: BaseLayoutProps) {
  const params = useParams();
  const location = useLocation();
  const id = tenantId ?? params.id;
  const [open, setOpen] = useState(true);

  const navItems: NavItem[] = id
    ? [
        { label: "Dashboard",          icon: <DashboardIcon />,      to: prefixed(`/tenant/${id}`),                          match: `/tenant/${id}` },
        { label: "Products",           icon: <ShoppingCartIcon />,   to: prefixed(`/tenant/${id}/products`),                 match: `/tenant/${id}/products` },
        { label: "Creatives",          icon: <PaletteIcon />,        to: prefixed(`/tenant/${id}/creatives/list`),            match: `/tenant/${id}/creatives` },
        { label: "Workflows",          icon: <AccountTreeIcon />,    to: prefixed(`/tenant/${id}/workflows`),                 match: `/tenant/${id}/workflows` },
        { label: "Reports",            icon: <BarChartIcon />,       to: prefixed(`/tenant/${id}/gam/reporting`),             match: `/tenant/${id}/gam/reporting` },
        { label: "Properties",         icon: <DomainIcon />,         to: prefixed(`/tenant/${id}/authorized-properties`),     match: `/tenant/${id}/authorized-properties` },
        { label: "Inventory",          icon: <LayersIcon />,         to: prefixed(`/tenant/${id}/inventory-profiles`),        match: `/tenant/${id}/inventory-profiles` },
        { label: "Principals",         icon: <PeopleIcon />,         to: prefixed(`/tenant/${id}/principals`),                match: `/tenant/${id}/principals` },
        { label: "Users",              icon: <ManageAccountsIcon />, to: prefixed(`/tenant/${id}/users`),                     match: `/tenant/${id}/users` },
        { label: "GAM Config",         icon: <TuneIcon />,           to: prefixed(`/tenant/${id}/gam/config`),                match: `/tenant/${id}/gam/config` },
        { label: "Settings",           icon: <SettingsIcon />,       to: prefixed(`/tenant/${id}/settings`),                  match: `/tenant/${id}/settings` },
      ]
    : [];

  const isActive = (item: NavItem) =>
    item.match
      ? location.pathname === item.match || location.pathname.startsWith(item.match + "/")
      : location.pathname === item.to;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: open ? DRAWER_WIDTH : DRAWER_COLLAPSED,
          flexShrink: 0,
          transition: "width 0.2s ease",
          "& .MuiDrawer-paper": {
            width: open ? DRAWER_WIDTH : DRAWER_COLLAPSED,
            overflowX: "hidden",
            transition: "width 0.2s ease",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        {/* Logo area */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: open ? 2 : 1,
            py: 1.5,
            borderBottom: "1px solid rgba(0,212,255,0.12)",
            minHeight: 56,
          }}
        >
          <RadioButtonCheckedIcon sx={{ color: "primary.main", fontSize: 22, flexShrink: 0 }} />
          {open && (
            <Typography
              variant="subtitle2"
              sx={{
                color: "primary.main",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: "0.7rem",
                whiteSpace: "nowrap",
              }}
            >
              AdCP Sales Agent
            </Typography>
          )}
        </Box>

        {/* Tenant badge */}
        {tenantName && open && (
          <Box sx={{ px: 2, py: 1, borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.25 }}>
              ACTIVE TENANT
            </Typography>
            <Chip
              label={tenantName}
              size="small"
              sx={{
                bgcolor: "rgba(0,212,255,0.08)",
                color: "primary.main",
                border: "1px solid rgba(0,212,255,0.2)",
                fontWeight: 600,
                fontSize: "0.7rem",
                height: 20,
              }}
            />
          </Box>
        )}

        {/* Nav items */}
        <List dense sx={{ px: open ? 1 : 0.5, py: 1, flex: 1 }}>
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Tooltip key={item.label} title={open ? "" : item.label} placement="right">
                <ListItemButton
                  component={Link}
                  to={item.to}
                  selected={active}
                  sx={{
                    borderRadius: 1,
                    mb: 0.25,
                    minHeight: 36,
                    px: open ? 1.5 : 1,
                    borderLeft: active ? "3px solid" : "3px solid transparent",
                    borderLeftColor: active ? "primary.main" : "transparent",
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: active ? "primary.main" : "text.secondary",
                      minWidth: open ? 32 : "auto",
                      fontSize: 18,
                      "& svg": { fontSize: 18 },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {open && (
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{
                        fontSize: "0.8rem",
                        fontWeight: active ? 600 : 400,
                        color: active ? "primary.main" : "text.secondary",
                      }}
                    />
                  )}
                </ListItemButton>
              </Tooltip>
            );
          })}
        </List>

        <Divider sx={{ borderColor: "rgba(0,212,255,0.08)" }} />

        {/* Switch tenant */}
        <List dense sx={{ px: open ? 1 : 0.5, py: 0.5 }}>
          <Tooltip title={open ? "" : "Switch Tenant"} placement="right">
            <ListItemButton
              component={Link}
              to={prefixed("/select-tenant")}
              sx={{ borderRadius: 1, minHeight: 36, px: open ? 1.5 : 1 }}
            >
              <ListItemIcon sx={{ color: "text.secondary", minWidth: open ? 32 : "auto", "& svg": { fontSize: 18 } }}>
                <SwapHorizIcon />
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary="Switch Tenant"
                  primaryTypographyProps={{ fontSize: "0.75rem", color: "text.secondary" }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        </List>

        {/* Favicon if any */}
        {faviconUrl && open && (
          <Box sx={{ px: 2, pb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
            <img src={faviconUrl} alt="" width={16} height={16} style={{ objectFit: "contain" }} />
          </Box>
        )}
      </Drawer>

      {/* Main content area */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Top bar */}
        <AppBar position="static" elevation={0}>
          <Toolbar variant="dense" sx={{ minHeight: 48 }}>
            <IconButton
              size="small"
              onClick={() => setOpen((o) => !o)}
              sx={{ color: "text.secondary", mr: 1 }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>

            {/* Breadcrumb / page title area — children can override via portal if needed */}
            <Box sx={{ flex: 1 }} />

            {/* Status indicator */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  bgcolor: "#00e5a0",
                  boxShadow: "0 0 6px #00e5a0",
                  animation: "pulse 2s ease-in-out infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.4 },
                  },
                }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: "0.08em" }}>
                ONLINE
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box component="main" sx={{ flex: 1, p: 3, overflow: "auto" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
