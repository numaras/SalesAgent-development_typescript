import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";
import {
  Alert, Box, Button, Chip, CircularProgress, Collapse,
  Divider, Paper, Table, TableBody, TableCell, TableRow,
  TextField, ToggleButton, ToggleButtonGroup, Typography,
  List, ListItem, ListItemText,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import WifiIcon from "@mui/icons-material/Wifi";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import TuneIcon from "@mui/icons-material/Tune";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LockIcon from "@mui/icons-material/Lock";

interface SavedConfig {
  configured: boolean;
  network_code?: string;
  auth_method?: "oauth" | "service_account";
  has_refresh_token?: boolean;
  has_service_account?: boolean;
  service_account_email?: string | null;
  trafficker_id?: string;
  network_currency?: string;
  secondary_currencies?: string[];
  network_timezone?: string;
  order_name_template?: string;
  line_item_name_template?: string;
}

interface PingResult {
  success: boolean;
  error?: string;
  network?: {
    network_code: string;
    display_name: string;
    currency_code: string;
    timezone: string;
  };
  advertisers?: Array<{ id: string; name: string }>;
  advertiser_count?: number;
  auth_method?: string;
}

interface NetworkOption {
  network_code: string;
  network_name: string;
  currency_code?: string;
  timezone?: string;
}

interface DetectResult {
  success?: boolean;
  network_code?: string;
  network_name?: string;
  trafficker_id?: string | null;
  currency_code?: string;
  secondary_currencies?: string[];
  timezone?: string;
  multiple_networks?: boolean;
  networks?: NetworkOption[];
  error?: string;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: "0.12em", display: "block", mb: 1.5 }}>
      {children}
    </Typography>
  );
}

function GamConfigContent() {
  const { id } = useParams<{ id: string }>();

  // Saved config state
  const [savedConfig, setSavedConfig] = useState<SavedConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Tab
  const [tab, setTab] = useState<"detect" | "configure">("configure");

  // Detect form
  const [refreshToken, setRefreshToken] = useState("");
  const [networkCode, setNetworkCode] = useState("");
  const [detectBusy, setDetectBusy] = useState(false);
  const [detectResult, setDetectResult] = useState<DetectResult | null>(null);
  const [selectedNetworkCode, setSelectedNetworkCode] = useState("");

  // Configure form
  const [authMethod, setAuthMethod] = useState<"oauth" | "service_account">("oauth");
  const [configureNetworkCode, setConfigureNetworkCode] = useState("");
  const [configureRefreshToken, setConfigureRefreshToken] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [traffickerIdInput, setTraffickerIdInput] = useState("");
  const [orderTemplate, setOrderTemplate] = useState("");
  const [lineItemTemplate, setLineItemTemplate] = useState("");
  const [networkCurrency, setNetworkCurrency] = useState("");
  const [secondaryCurrencies, setSecondaryCurrencies] = useState("");
  const [networkTimezone, setNetworkTimezone] = useState("");
  const [configureBusy, setConfigureBusy] = useState(false);
  const [configureSuccess, setConfigureSuccess] = useState(false);
  const [configureError, setConfigureError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // Ping
  const [pingBusy, setPingBusy] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  // Load saved config on mount
  useEffect(() => {
    if (!id) return;
    setLoadingConfig(true);
    fetch(`/tenant/${id}/gam/config`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: SavedConfig | null) => {
        if (!data) return;
        setSavedConfig(data);
        if (data.configured) {
          setConfigureNetworkCode(data.network_code ?? "");
          setAuthMethod(data.auth_method ?? "oauth");
          setTraffickerIdInput(data.trafficker_id ?? "");
          setNetworkCurrency(data.network_currency ?? "");
          setSecondaryCurrencies((data.secondary_currencies ?? []).join(", "));
          setNetworkTimezone(data.network_timezone ?? "");
          setOrderTemplate(data.order_name_template ?? "");
          setLineItemTemplate(data.line_item_name_template ?? "");
          // Show advanced section if any advanced fields are populated
          if (data.trafficker_id || data.order_name_template || data.line_item_name_template ||
              data.network_currency || (data.secondary_currencies?.length ?? 0) > 0 || data.network_timezone) {
            setAdvancedOpen(true);
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, [id]);

  // Auto-ping on mount once config is loaded
  useEffect(() => {
    if (!id || loadingConfig) return;
    void handlePing();
  }, [loadingConfig]);

  const handlePing = async () => {
    if (!id) return;
    setPingBusy(true);
    setPingResult(null);
    try {
      const res = await fetch(`/tenant/${id}/gam/ping`, { credentials: "include" });
      const data = (await res.json().catch(() => ({}))) as PingResult;
      setPingResult(data);
    } catch (err) {
      setPingResult({ success: false, error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setPingBusy(false);
    }
  };

  function populateFromNetwork(net: Partial<NetworkOption & { trafficker_id?: string | null }>) {
    if (net.network_code) setConfigureNetworkCode(net.network_code);
    if (net.currency_code) setNetworkCurrency(net.currency_code);
    if (net.timezone) setNetworkTimezone(net.timezone);
  }

  const handleDetect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !refreshToken.trim()) return;
    setDetectBusy(true);
    setDetectResult(null);
    setSelectedNetworkCode("");
    try {
      const res = await fetch(`/tenant/${id}/gam/detect-network`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken.trim(), network_code: networkCode.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as DetectResult;
      if (data.success) {
        setDetectResult(data);
        if (!data.multiple_networks) {
          populateFromNetwork({ network_code: data.network_code, currency_code: data.currency_code, timezone: data.timezone });
          if (data.network_code) setNetworkCode(data.network_code);
        }
      } else {
        setDetectResult({ ...data, success: false });
      }
    } catch (err) {
      setDetectResult({ success: false, error: err instanceof Error ? err.message : "Request failed" });
    } finally {
      setDetectBusy(false);
    }
  };

  const handleNetworkSelect = (net: NetworkOption) => {
    setSelectedNetworkCode(net.network_code);
    setNetworkCode(net.network_code);
    populateFromNetwork(net);
    setConfigureRefreshToken(refreshToken);
    setTab("configure");
  };

  const handleConfigure = async (e: React.FormEvent) => {
    e.preventDefault();
    const nc = configureNetworkCode.trim() || networkCode.trim();
    if (!id || !nc) { setConfigureError("Network code is required"); return; }
    if (authMethod === "oauth" && !configureRefreshToken.trim()) {
      setConfigureError("Refresh token required for OAuth (leave blank to keep the existing saved token)");
      return;
    }
    if (authMethod === "service_account" && !serviceAccountJson.trim()) {
      setConfigureError("Service account JSON required");
      return;
    }
    setConfigureBusy(true);
    setConfigureError("");
    setConfigureSuccess(false);
    try {
      const body: Record<string, unknown> = {
        auth_method: authMethod,
        network_code: nc,
        trafficker_id: traffickerIdInput.trim() || undefined,
        order_name_template: orderTemplate.trim() || undefined,
        line_item_name_template: lineItemTemplate.trim() || undefined,
        network_currency: networkCurrency.trim() || undefined,
        secondary_currencies: secondaryCurrencies.trim()
          ? secondaryCurrencies.split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        network_timezone: networkTimezone.trim() || undefined,
      };
      if (authMethod === "oauth" && configureRefreshToken.trim()) body.refresh_token = configureRefreshToken.trim();
      else if (authMethod === "service_account") body.service_account_json = serviceAccountJson.trim();

      const res = await fetch(`/tenant/${id}/gam/configure`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; errors?: string[] };
      if (data.success) {
        setConfigureSuccess(true);
        // Refresh config + re-ping
        const cfgRes = await fetch(`/tenant/${id}/gam/config`, { credentials: "include" });
        if (cfgRes.ok) setSavedConfig((await cfgRes.json()) as SavedConfig);
        void handlePing();
      } else {
        setConfigureError(data.error ?? data.errors?.join(", ") ?? "Configure failed");
      }
    } catch (err) {
      setConfigureError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setConfigureBusy(false);
    }
  };

  if (!id) return null;

  const isConfigured = savedConfig?.configured ?? false;

  return (
    <BaseLayout tenantId={id}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>Google Ad Manager Config</Typography>
          <Typography variant="body2" color="text.secondary">
            Connect your GAM network via OAuth refresh token or service account credentials.
          </Typography>
        </Box>
        {isConfigured && (
          <Chip
            label={`Network ${savedConfig?.network_code}`}
            size="small"
            sx={{ bgcolor: "rgba(0,212,255,0.08)", color: "primary.main", border: "1px solid rgba(0,212,255,0.2)", fontFamily: "monospace", fontWeight: 700 }}
          />
        )}
      </Box>

      {/* Connection status panel */}
      <Paper sx={{ p: 2.5, mb: 3, position: "relative", overflow: "hidden" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: pingResult ? 2 : 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {pingBusy ? (
              <CircularProgress size={16} color="primary" />
            ) : pingResult?.success ? (
              <WifiIcon sx={{ color: "success.main", fontSize: 18 }} />
            ) : pingResult ? (
              <WifiOffIcon sx={{ color: "error.main", fontSize: 18 }} />
            ) : (
              <WifiIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            )}
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Connection Status
            </Typography>
            {pingBusy && (
              <Typography variant="caption" color="text.secondary">Testing…</Typography>
            )}
          </Box>
          <Button
            size="small"
            variant="outlined"
            onClick={handlePing}
            disabled={pingBusy}
            sx={{ borderColor: "divider", color: "text.secondary", fontSize: "0.72rem" }}
          >
            Re-test
          </Button>
        </Box>

        {pingResult && (
          pingResult.success ? (
            <Box sx={{ bgcolor: "rgba(0,229,160,0.06)", border: "1px solid rgba(0,229,160,0.2)", borderRadius: 1, p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                <CheckCircleIcon sx={{ color: "success.main", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "success.main", fontWeight: 700 }}>
                  Connected to Google Ad Manager
                </Typography>
                {pingResult.auth_method && (
                  <Chip label={pingResult.auth_method.replace("_", " ").toUpperCase()} size="small"
                    sx={{ bgcolor: "rgba(0,229,160,0.12)", color: "success.main", fontSize: "0.65rem", height: 18, fontWeight: 700 }} />
                )}
              </Box>
              <Table size="small">
                <TableBody>
                  {[
                    ["Network name", pingResult.network?.display_name],
                    ["Network code", pingResult.network?.network_code],
                    ["Currency",     pingResult.network?.currency_code],
                    ["Timezone",     pingResult.network?.timezone],
                  ].map(([label, value]) => (
                    <TableRow key={label} sx={{ "& td": { border: "none", py: 0.4, px: 0 } }}>
                      <TableCell sx={{ color: "text.secondary", fontSize: "0.8rem", width: 140, fontWeight: 500 }}>{label}</TableCell>
                      <TableCell sx={{ color: "text.primary", fontSize: "0.8rem", fontFamily: label === "Network code" ? "monospace" : "inherit" }}>
                        {value ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pingResult.advertisers && pingResult.advertisers.length > 0 && (
                <Box sx={{ mt: 1.5 }}>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>
                    FIRST {pingResult.advertisers.length} ADVERTISER(S) FROM GAM
                  </Typography>
                  <List dense disablePadding>
                    {pingResult.advertisers.map((a) => (
                      <ListItem key={a.id} disableGutters sx={{ py: 0 }}>
                        <ListItemText
                          primary={a.name}
                          secondary={`ID: ${a.id}`}
                          primaryTypographyProps={{ fontSize: "0.8rem", color: "text.primary" }}
                          secondaryTypographyProps={{ fontSize: "0.7rem", fontFamily: "monospace" }}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ bgcolor: "rgba(255,69,96,0.06)", border: "1px solid rgba(255,69,96,0.2)", borderRadius: 1, p: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <ErrorIcon sx={{ color: "error.main", fontSize: 18 }} />
                <Typography variant="body2" sx={{ color: "error.main", fontWeight: 700 }}>
                  Connection failed
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "error.light", display: "block", mt: 0.5, ml: 3.5 }}>
                {pingResult.error ?? "Unknown error"}
              </Typography>
            </Box>
          )
        )}
      </Paper>

      {/* Tab buttons */}
      <ToggleButtonGroup
        value={tab}
        exclusive
        onChange={(_, v) => { if (v) setTab(v); }}
        size="small"
        sx={{ mb: 3, "& .MuiToggleButton-root": { px: 2, fontSize: "0.78rem", fontWeight: 600, borderColor: "divider", color: "text.secondary", "&.Mui-selected": { bgcolor: "rgba(0,212,255,0.1)", color: "primary.main", borderColor: "rgba(0,212,255,0.3)" } } }}
      >
        <ToggleButton value="configure">
          <TuneIcon sx={{ fontSize: 15, mr: 0.75 }} />
          {isConfigured ? "Edit Config" : "Configure"}
        </ToggleButton>
        <ToggleButton value="detect">
          <SearchIcon sx={{ fontSize: 15, mr: 0.75 }} />
          Detect Network
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Detect tab */}
      {tab === "detect" && (
        <Paper sx={{ p: 3, maxWidth: 580 }}>
          <SectionTitle>Auto-detect GAM network via OAuth</SectionTitle>
          <Box component="form" onSubmit={handleDetect} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="OAuth Refresh Token"
              value={refreshToken}
              onChange={(e) => setRefreshToken(e.target.value)}
              placeholder="1/..."
              required
              size="small"
              fullWidth
            />
            <TextField
              label="Network Code (optional — leave blank to auto-detect)"
              value={networkCode}
              onChange={(e) => setNetworkCode(e.target.value)}
              placeholder="12345678"
              size="small"
              fullWidth
            />
            <Button type="submit" variant="contained" disabled={detectBusy} startIcon={detectBusy ? <CircularProgress size={14} color="inherit" /> : <SearchIcon />}>
              {detectBusy ? "Detecting…" : "Detect Network"}
            </Button>
          </Box>

          {detectResult && !detectResult.success && (
            <Alert severity="error" sx={{ mt: 2 }}>{detectResult.error ?? "Detection failed"}</Alert>
          )}

          {detectResult?.success && !detectResult.multiple_networks && (
            <Box sx={{ mt: 2, bgcolor: "rgba(0,229,160,0.06)", border: "1px solid rgba(0,229,160,0.2)", borderRadius: 1, p: 2 }}>
              <Typography variant="body2" sx={{ color: "success.main", fontWeight: 700, mb: 1 }}>
                Detected: {detectResult.network_name ?? "—"} ({detectResult.network_code})
              </Typography>
              {[["Currency", detectResult.currency_code], ["Timezone", detectResult.timezone]].map(([l, v]) =>
                v ? <Typography key={l} variant="caption" sx={{ display: "block", color: "text.secondary" }}>{l}: {v}</Typography> : null
              )}
              <Button
                size="small"
                variant="outlined"
                sx={{ mt: 1.5 }}
                onClick={() => { setTab("configure"); setConfigureRefreshToken(refreshToken); }}
              >
                Continue to Configure →
              </Button>
            </Box>
          )}

          {detectResult?.multiple_networks && detectResult.networks && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Multiple networks found — select one:</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {detectResult.networks.map((net) => (
                  <Box
                    key={net.network_code}
                    onClick={() => handleNetworkSelect(net)}
                    sx={{
                      p: 1.5, borderRadius: 1, cursor: "pointer",
                      border: "1px solid",
                      borderColor: selectedNetworkCode === net.network_code ? "primary.main" : "divider",
                      bgcolor: selectedNetworkCode === net.network_code ? "rgba(0,212,255,0.06)" : "transparent",
                      "&:hover": { borderColor: "primary.main", bgcolor: "rgba(0,212,255,0.04)" },
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{net.network_name}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
                      {net.network_code}{net.currency_code ? ` · ${net.currency_code}` : ""}{net.timezone ? ` · ${net.timezone}` : ""}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}

      {/* Configure tab */}
      {tab === "configure" && (
        <Paper sx={{ p: 3, maxWidth: 580 }}>
          {loadingConfig ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={16} color="primary" />
              <Typography variant="body2" color="text.secondary">Loading saved configuration…</Typography>
            </Box>
          ) : (
            <Box component="form" onSubmit={handleConfigure} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <SectionTitle>Connection credentials</SectionTitle>

              <TextField
                label="Network Code"
                value={configureNetworkCode}
                onChange={(e) => setConfigureNetworkCode(e.target.value)}
                placeholder="12345678"
                required
                size="small"
                fullWidth
              />

              <Box>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.75 }}>Auth Method</Typography>
                <ToggleButtonGroup
                  value={authMethod}
                  exclusive
                  onChange={(_, v) => { if (v) setAuthMethod(v); }}
                  size="small"
                  sx={{ "& .MuiToggleButton-root": { px: 2, fontSize: "0.75rem", fontWeight: 600, borderColor: "divider", color: "text.secondary", "&.Mui-selected": { bgcolor: "rgba(0,212,255,0.1)", color: "primary.main", borderColor: "rgba(0,212,255,0.3)" } } }}
                >
                  <ToggleButton value="oauth">OAuth / Refresh Token</ToggleButton>
                  <ToggleButton value="service_account">Service Account</ToggleButton>
                </ToggleButtonGroup>
              </Box>

              {authMethod === "oauth" && (
                <TextField
                  label={
                    savedConfig?.has_refresh_token
                      ? "New OAuth Refresh Token (leave blank to keep saved)"
                      : "OAuth Refresh Token"
                  }
                  value={configureRefreshToken}
                  onChange={(e) => setConfigureRefreshToken(e.target.value)}
                  placeholder="1/..."
                  size="small"
                  fullWidth
                  InputProps={savedConfig?.has_refresh_token && !configureRefreshToken ? {
                    startAdornment: (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mr: 1, opacity: 0.6 }}>
                        <LockIcon sx={{ fontSize: 14 }} />
                        <Typography variant="caption">saved</Typography>
                      </Box>
                    ),
                  } : undefined}
                />
              )}

              {authMethod === "service_account" && (
                <>
                  {savedConfig?.has_service_account && (
                    <Alert severity="info" sx={{ py: 0.5 }}>
                      Service account is saved
                      {savedConfig.service_account_email ? ` (${savedConfig.service_account_email})` : ""}.
                      Paste a new JSON below to replace it, or leave blank to keep the existing one.
                    </Alert>
                  )}
                  <TextField
                    label={savedConfig?.has_service_account ? "New Service Account JSON (leave blank to keep saved)" : "Service Account JSON"}
                    value={serviceAccountJson}
                    onChange={(e) => setServiceAccountJson(e.target.value)}
                    placeholder='{"type":"service_account",...}'
                    multiline
                    rows={6}
                    size="small"
                    fullWidth
                    inputProps={{ style: { fontFamily: "monospace", fontSize: "0.8rem" } }}
                  />
                </>
              )}

              <Divider sx={{ borderColor: "divider" }} />

              {/* Advanced settings */}
              <Box>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setAdvancedOpen((o) => !o)}
                  endIcon={advancedOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ color: "text.secondary", fontSize: "0.78rem", p: 0, textTransform: "none" }}
                >
                  Advanced settings (trafficker, templates, currency, timezone)
                </Button>

                <Collapse in={advancedOpen}>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2, pl: 0 }}>
                    <TextField
                      label="Trafficker ID"
                      helperText="Auto-detected from OAuth when using Detect Network"
                      value={traffickerIdInput}
                      onChange={(e) => setTraffickerIdInput(e.target.value)}
                      placeholder="123456"
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Order name template"
                      helperText='e.g. {advertiser} - {product}'
                      value={orderTemplate}
                      onChange={(e) => setOrderTemplate(e.target.value)}
                      placeholder="{advertiser} - {product}"
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Line item name template"
                      value={lineItemTemplate}
                      onChange={(e) => setLineItemTemplate(e.target.value)}
                      placeholder="{product} - {start_date}"
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Primary currency (ISO 3-letter)"
                      value={networkCurrency}
                      onChange={(e) => setNetworkCurrency(e.target.value)}
                      placeholder="USD"
                      inputProps={{ maxLength: 3, style: { textTransform: "uppercase" } }}
                      size="small"
                      sx={{ maxWidth: 160 }}
                    />
                    <TextField
                      label="Secondary currencies (comma-separated)"
                      value={secondaryCurrencies}
                      onChange={(e) => setSecondaryCurrencies(e.target.value)}
                      placeholder="EUR, GBP"
                      size="small"
                      fullWidth
                    />
                    <TextField
                      label="Network timezone"
                      value={networkTimezone}
                      onChange={(e) => setNetworkTimezone(e.target.value)}
                      placeholder="America/New_York"
                      size="small"
                      fullWidth
                    />
                  </Box>
                </Collapse>
              </Box>

              {configureError && <Alert severity="error" sx={{ py: 0.5 }}>{configureError}</Alert>}
              {configureSuccess && <Alert severity="success" sx={{ py: 0.5 }}>GAM configuration saved successfully.</Alert>}

              <Button
                type="submit"
                variant="contained"
                disabled={configureBusy}
                startIcon={configureBusy ? <CircularProgress size={14} color="inherit" /> : undefined}
                sx={{ alignSelf: "flex-start" }}
              >
                {configureBusy ? "Saving…" : isConfigured ? "Update Config" : "Save Config"}
              </Button>
            </Box>
          )}
        </Paper>
      )}
    </BaseLayout>
  );
}

export default function GamConfigPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <GamConfigContent />
    </PrivateRoute>
  );
}
