import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert, Box, Button, Card, CardContent, Chip,
  CircularProgress, Divider, FormControl, InputLabel,
  MenuItem, Select, Stack, TextField, Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface FormatEntry {
  format_id: { id: string; agent_url: string };
  name: string;
  type: string;
  dimensions: string | null;
}

interface Principal {
  principal_id: string;
  name: string;
}

interface AnalyzeResult {
  format_id: string | null;
  width: number | null;
  height: number | null;
  asset_type: string;
  extension: string | null;
  hostname: string;
}

function CreativesAddContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Form state
  const [name, setName] = useState("");
  const [principalId, setPrincipalId] = useState("");
  const [assetUrl, setAssetUrl] = useState("");
  const [clickUrl, setClickUrl] = useState("");
  const [selectedFormat, setSelectedFormat] = useState<FormatEntry | null>(null);
  const [width, setWidth] = useState<string>("");
  const [height, setHeight] = useState<string>("");

  // Data state
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [formats, setFormats] = useState<FormatEntry[]>([]);
  const [formatsSource, setFormatsSource] = useState<"live" | "fallback" | null>(null);
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load principals
  useEffect(() => {
    if (!id) return;
    fetch(`/tenant/${id}/principals`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { principals?: Principal[] } | null) => {
        if (data?.principals) setPrincipals(data.principals);
      })
      .catch(() => undefined);
  }, [id]);

  // Load formats from creative agent
  useEffect(() => {
    if (!id) return;
    setLoadingFormats(true);
    fetch(`/api/formats/list?tenant_id=${encodeURIComponent(id)}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { agents?: Record<string, FormatEntry[]>; source?: "live" | "fallback" } | null) => {
        if (!data?.agents) return;
        const all = Object.values(data.agents).flat();
        setFormats(all);
        setFormatsSource(data.source ?? null);
        // Pre-select first display format
        const display = all.find((f) => f.format_id.id.startsWith("display_300x250"));
        if (display) setSelectedFormat(display);
      })
      .catch(() => undefined)
      .finally(() => setLoadingFormats(false));
  }, [id]);

  const handleAnalyze = useCallback(async () => {
    if (!id || !assetUrl.trim()) return;
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const res = await fetch(`/tenant/${id}/creatives/analyze`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: assetUrl.trim() }),
      });
      const data = (await res.json()) as AnalyzeResult & { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Analysis failed");
        return;
      }
      setAnalyzeResult(data);
      // Auto-fill dimensions
      if (data.width) setWidth(String(data.width));
      if (data.height) setHeight(String(data.height));
      // Auto-select matching format
      if (data.format_id) {
        const match = formats.find((f) => f.format_id.id.includes(data.format_id!));
        if (match) setSelectedFormat(match);
      }
      // Auto-fill name from hostname if empty
      if (!name && data.hostname) {
        setName(`${data.hostname} ${data.format_id ?? data.asset_type}`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [id, assetUrl, formats, name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedFormat) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/tenant/${id}/creatives/add`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          principal_id: principalId,
          format_id: selectedFormat.format_id.id,
          agent_url: selectedFormat.format_id.agent_url,
          asset_url: assetUrl.trim(),
          click_url: clickUrl.trim() || undefined,
          width: width ? Number(width) : undefined,
          height: height ? Number(height) : undefined,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; creative_id?: string; error?: string; message?: string };
      if (json.success) {
        setSuccess(json.message ?? "Creative uploaded!");
        setTimeout(() => navigate(`/tenant/${id}/creatives/review`), 1500);
      } else {
        setError(json.error ?? "Upload failed.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) return null;

  return (
    <BaseLayout tenantId={id}>
      <Stack direction="row" alignItems="center" gap={1} mb={2}>
        <Button component={Link} to={`/tenant/${id}/creatives/list`} startIcon={<ArrowBackIcon />} size="small" sx={{ color: "text.secondary" }}>
          Back to Creatives
        </Button>
      </Stack>

      <Typography variant="h4" fontWeight={700} mb={3}>Upload Creative</Typography>

      {error && <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
        {/* Main form */}
        <Card sx={{ flex: "1 1 480px" }}>
          <CardContent>
            <form onSubmit={(e) => { void handleSubmit(e); }}>
              <Stack gap={2.5}>

                {/* Asset URL + Analyze */}
                <Box>
                  <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.1em" }}>Asset</Typography>
                  <Stack direction="row" gap={1} mt={0.5}>
                    <TextField
                      label="Asset URL *"
                      size="small"
                      fullWidth
                      value={assetUrl}
                      onChange={(e) => setAssetUrl(e.target.value)}
                      placeholder="https://example.com/banner_300x250.jpg"
                      required
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => { void handleAnalyze(); }}
                      disabled={analyzing || !assetUrl.trim()}
                      startIcon={analyzing ? <CircularProgress size={14} /> : <SearchIcon />}
                      sx={{ whiteSpace: "nowrap", minWidth: 100 }}
                    >
                      {analyzing ? "Analyzing…" : "Analyze"}
                    </Button>
                  </Stack>
                  {analyzeResult && (
                    <Box sx={{ mt: 1, p: 1, background: "rgba(0,229,160,0.06)", borderRadius: 1, border: "1px solid rgba(0,229,160,0.2)" }}>
                      <Stack direction="row" gap={1} flexWrap="wrap">
                        <Chip label={analyzeResult.asset_type} size="small" color="success" />
                        {analyzeResult.extension && <Chip label={`.${analyzeResult.extension}`} size="small" variant="outlined" />}
                        {analyzeResult.width && analyzeResult.height && <Chip label={`${analyzeResult.width}×${analyzeResult.height}`} size="small" variant="outlined" />}
                        {analyzeResult.format_id && <Chip label={analyzeResult.format_id} size="small" color="primary" variant="outlined" />}
                      </Stack>
                    </Box>
                  )}
                </Box>

                <Divider />

                {/* Basic info */}
                <Box>
                  <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.1em" }}>Details</Typography>
                  <Stack gap={2} mt={0.5}>
                    <TextField label="Creative Name *" size="small" fullWidth required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. GalaxyiPhone Banner 300x250" />

                    <FormControl size="small" fullWidth required>
                      <InputLabel>Advertiser (Principal) *</InputLabel>
                      <Select value={principalId} label="Advertiser (Principal) *" onChange={(e) => setPrincipalId(e.target.value)}>
                        {principals.map((p) => (
                          <MenuItem key={p.principal_id} value={p.principal_id}>{p.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField label="Click URL (optional)" size="small" fullWidth value={clickUrl} onChange={(e) => setClickUrl(e.target.value)} placeholder="https://example.com/landing" />
                  </Stack>
                </Box>

                <Divider />

                {/* Dimensions */}
                <Box>
                  <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.1em" }}>Dimensions (auto-detected or manual)</Typography>
                  <Stack direction="row" gap={2} mt={0.5}>
                    <TextField label="Width (px)" size="small" type="number" value={width} onChange={(e) => setWidth(e.target.value)} />
                    <TextField label="Height (px)" size="small" type="number" value={height} onChange={(e) => setHeight(e.target.value)} />
                  </Stack>
                </Box>

                <Divider />

                {/* Format selector */}
                <Box>
                  <Stack direction="row" alignItems="center" gap={1} mb={1}>
                    <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.1em" }}>Creative Format *</Typography>
                    {formatsSource && (
                      <Box sx={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem" }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: "50%", background: formatsSource === "live" ? "#00e5a0" : "#f59e0b", boxShadow: `0 0 5px ${formatsSource === "live" ? "#00e5a0" : "#f59e0b"}` }} />
                        <Typography variant="caption" sx={{ color: formatsSource === "live" ? "#00e5a0" : "#f59e0b", fontWeight: 600 }}>{formatsSource}</Typography>
                      </Box>
                    )}
                  </Stack>
                  {loadingFormats ? (
                    <CircularProgress size={20} />
                  ) : (
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.75, maxHeight: 260, overflowY: "auto", pr: 0.5 }}>
                      {formats.map((f) => {
                        const key = `${f.format_id.agent_url}::${f.format_id.id}`;
                        const active = selectedFormat?.format_id.id === f.format_id.id && selectedFormat?.format_id.agent_url === f.format_id.agent_url;
                        return (
                          <Box
                            key={key}
                            onClick={() => setSelectedFormat(f)}
                            sx={{
                              p: 1, borderRadius: 1, cursor: "pointer", border: "1px solid",
                              borderColor: active ? "primary.main" : "rgba(0,212,255,0.12)",
                              background: active ? "rgba(0,212,255,0.08)" : "rgba(13,21,38,0.5)",
                              "&:hover": { borderColor: "primary.main", background: "rgba(0,212,255,0.05)" },
                            }}
                          >
                            <Typography variant="caption" sx={{ fontWeight: 600, display: "block", color: active ? "primary.main" : "text.primary" }}>{f.name}</Typography>
                            {f.dimensions && <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem" }}>{f.dimensions}</Typography>}
                            <Chip label={f.type} size="small" sx={{ mt: 0.5, height: 16, fontSize: "0.65rem" }} />
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={submitting || !name || !principalId || !assetUrl || !selectedFormat}
                  startIcon={submitting ? <CircularProgress size={18} /> : <CloudUploadIcon />}
                >
                  {submitting ? "Uploading…" : "Upload Creative"}
                </Button>

              </Stack>
            </form>
          </CardContent>
        </Card>

        {/* Help sidebar */}
        <Box sx={{ flex: "0 1 260px" }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>How it works</Typography>
              <Stack gap={1.5}>
                {[
                  ["1. Paste URL", "Enter the URL of your creative asset (image, video, HTML5)"],
                  ["2. Analyze", "Click Analyze to auto-detect dimensions and format"],
                  ["3. Select format", "Pick the matching AdCP creative format"],
                  ["4. Upload", "Creative is saved as pending review"],
                  ["5. Review", "Approve or reject in Creatives → Review"],
                ].map(([step, desc]) => (
                  <Box key={step}>
                    <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>{step}</Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>{desc}</Typography>
                  </Box>
                ))}
              </Stack>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="caption" color="text.secondary">
                After approval, assign creatives to campaigns via the campaign detail page or ask Claude to assign them.
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </BaseLayout>
  );
}

export default function CreativesAddPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <CreativesAddContent />
    </PrivateRoute>
  );
}
