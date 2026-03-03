import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";
import { ProductInventoryWidget } from "../components/ProductInventoryWidget";

interface FormatEntry {
  format_id: { id: string; agent_url: string };
  name: string;
  type: string;
  dimensions: string | null;
}

interface ProductEditData {
  product_id: string;
  name: string;
  description: string | null;
  formats: Array<{ agent_url?: string; id?: string }>;
  countries: string[];
  channels: string[];
  targeting_template: Record<string, unknown>;
  implementation_config: Record<string, unknown>;
}

interface EditPageContext {
  tenant_id: string;
  tenant_name: string;
  product: ProductEditData;
}

/**
 * Prefill from existing product; GET /tenant/:id/products/:productId/edit; POST to update.
 */
function ProductEditContent() {
  const { id, productId } = useParams<{ id: string; productId: string }>();
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<EditPageContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [saved, setSaved] = useState(false);

  // Core fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingOptionsJson, setPricingOptionsJson] = useState("[]");
  const [countries, setCountries] = useState("");
  const [channels, setChannels] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");

  // Formats
  const [selectedFormats, setSelectedFormats] = useState<Array<{ id: string; agent_url: string }>>([]);
  const [availableFormats, setAvailableFormats] = useState<FormatEntry[]>([]);
  const [formatsLoading, setFormatsLoading] = useState(false);
  const [formatsSource, setFormatsSource] = useState<"live" | "fallback" | null>(null);

  // Mock simulation settings
  const [mockDailyImpressions, setMockDailyImpressions] = useState(10000);
  const [mockFillRate, setMockFillRate] = useState(85);
  const [mockCtr, setMockCtr] = useState(2);
  const [mockViewability, setMockViewability] = useState(65);
  const [mockScenario, setMockScenario] = useState("normal");
  const [isMockAdapter, setIsMockAdapter] = useState(false);

  // Load product data
  useEffect(() => {
    if (!id || !productId) return;
    fetch(`/tenant/${id}/products/${encodeURIComponent(productId)}/edit`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data: EditPageContext) => {
        setCtx(data);
        const p = data.product;
        setName(p.name);
        setDescription(p.description ?? "");
        setCountries((p.countries ?? []).join(", "));
        setChannels((p.channels ?? []).join(", "));

        // Pricing options from implementation_config
        const po = (p.implementation_config?.pricing_options as Record<string, unknown>[]) ?? [];
        setPricingOptionsJson(JSON.stringify(po, null, 2));

        // Product image from product_card manifest
        const card = p.implementation_config?.product_card as Record<string, unknown> | undefined;
        const manifest = card?.manifest as Record<string, unknown> | undefined;
        if (typeof manifest?.product_image === "string") setProductImageUrl(manifest.product_image);

        // Mock simulation settings
        const impl = p.implementation_config;
        const adapterType = typeof impl?.adapter_type === "string" ? impl.adapter_type : "";
        if (adapterType === "mock" || adapterType === "mock_ad_server") {
          setIsMockAdapter(true);
          if (typeof impl?.daily_impressions === "number") setMockDailyImpressions(impl.daily_impressions);
          if (typeof impl?.fill_rate === "number") setMockFillRate(Math.round((impl.fill_rate as number) * 100));
          if (typeof impl?.ctr === "number") setMockCtr(+((impl.ctr as number) * 100).toFixed(2));
          if (typeof impl?.viewability === "number") setMockViewability(Math.round((impl.viewability as number) * 100));
          if (typeof impl?.scenario === "string") setMockScenario(impl.scenario);
        }

        // Pre-select existing formats
        const existingFmts = (p.formats ?? [])
          .filter((f) => f.id && f.agent_url)
          .map((f) => ({ id: f.id!, agent_url: f.agent_url! }));
        setSelectedFormats(existingFmts);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Request failed"))
      .finally(() => setLoading(false));
  }, [id, productId]);

  // Load available formats
  useEffect(() => {
    if (!id) return;
    setFormatsLoading(true);
    fetch(`/api/formats/list?tenant_id=${encodeURIComponent(id)}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data: { agents?: Record<string, FormatEntry[]>; source?: "live" | "fallback" } | null) => {
        if (!data?.agents) return;
        const all = Object.values(data.agents).flat();
        setAvailableFormats(all);
        setFormatsSource(data.source ?? null);
      })
      .catch(() => undefined)
      .finally(() => setFormatsLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !productId || !ctx) return;
    setSaved(false);
    setSubmitting(true);
    setError(null);
    try {
      let pricingOptions: Record<string, unknown>[];
      try {
        pricingOptions = JSON.parse(pricingOptionsJson) as Record<string, unknown>[];
        if (!Array.isArray(pricingOptions)) pricingOptions = [];
      } catch {
        setError("Invalid pricing options JSON");
        setSubmitting(false);
        return;
      }

      // Build formats — use selected or fall back to existing
      const formats = selectedFormats.length > 0
        ? selectedFormats.map((f) => ({ id: f.id, agent_url: f.agent_url }))
        : ctx.product.formats;

      // Build implementation_config with mock settings if applicable
      const implConfig: Record<string, unknown> = {};
      if (isMockAdapter) {
        implConfig.daily_impressions = mockDailyImpressions;
        implConfig.fill_rate = mockFillRate / 100;
        implConfig.ctr = mockCtr / 100;
        implConfig.viewability = mockViewability / 100;
        implConfig.scenario = mockScenario;
      }

      const res = await fetch(`/tenant/${id}/products/${encodeURIComponent(productId)}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          formats,
          pricing_options: pricingOptions,
          countries: countries.split(",").map((s) => s.trim()).filter(Boolean),
          channels: channels.split(",").map((s) => s.trim()).filter(Boolean),
          targeting_template: ctx.product.targeting_template,
          product_image_url: productImageUrl.trim() || undefined,
          implementation_config: Object.keys(implConfig).length > 0 ? implConfig : undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (data.success) {
        setSaved(true);
        setTimeout(() => navigate(`/tenant/${id}/products`), 1000);
      } else {
        setError(data.error ?? "Update failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!id || !productId) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error && !ctx) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!ctx) return null;

  return (
    <BaseLayout tenantId={id} tenantName={ctx.tenant_name}>
      <h1 style={{ fontFamily: "system-ui" }}>Edit product</h1>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/products`}>← Back to products</Link>
        <span style={{ marginLeft: "0.75rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#666" }}>{ctx.product.product_id}</span>
      </p>

      <form onSubmit={(e) => { void handleSubmit(e); }} style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: "0.75rem" }}>

        {/* Core info */}
        <label>
          Product name *
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ display: "block", width: "100%", marginTop: "0.25rem" }} />
        </label>

        <label>
          Description
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={{ display: "block", width: "100%", marginTop: "0.25rem" }} />
        </label>

        <label>
          Countries (comma-separated, e.g. US, BR, DE)
          <input type="text" value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="Leave empty for all countries" style={{ display: "block", width: "100%", marginTop: "0.25rem" }} />
        </label>

        <label>
          Channels (comma-separated, e.g. display, video)
          <input type="text" value={channels} onChange={(e) => setChannels(e.target.value)} placeholder="display, video, native…" style={{ display: "block", width: "100%", marginTop: "0.25rem" }} />
        </label>

        <label>
          Product image URL (optional — generates product card)
          <input type="text" value={productImageUrl} onChange={(e) => setProductImageUrl(e.target.value)} placeholder="https://example.com/product-preview.jpg" style={{ display: "block", width: "100%", marginTop: "0.25rem" }} />
        </label>

        {/* Pricing */}
        <label>
          Pricing options (JSON array) *
          <small style={{ color: "#666", marginLeft: "0.5rem" }}>pricing_model must be lowercase: cpm, flat_rate, cpc…</small>
          <textarea
            value={pricingOptionsJson}
            onChange={(e) => setPricingOptionsJson(e.target.value)}
            rows={4}
            style={{ fontFamily: "monospace", display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>

        {/* Format selector */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span style={{ fontWeight: 500 }}>Creative Formats *</span>
            {formatsSource && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.72rem", fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", background: formatsSource === "live" ? "#00e5a0" : "#f59e0b", boxShadow: formatsSource === "live" ? "0 0 5px #00e5a0" : "0 0 5px #f59e0b" }} />
                <span style={{ color: formatsSource === "live" ? "#00e5a0" : "#f59e0b" }}>{formatsSource}</span>
              </span>
            )}
          </div>
          {formatsLoading ? (
            <p style={{ color: "#666", fontSize: "0.875rem" }}>Loading formats…</p>
          ) : availableFormats.length === 0 ? (
            <p style={{ color: "#888", fontSize: "0.875rem" }}>
              No formats available — existing formats will be kept: {selectedFormats.map((f) => f.id).join(", ") || "none"}
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
              {availableFormats.map((f) => {
                const key = `${f.format_id.agent_url}::${f.format_id.id}`;
                const checked = selectedFormats.some((s) => s.id === f.format_id.id && s.agent_url === f.format_id.agent_url);
                return (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.875rem", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFormats((prev) => [...prev, f.format_id]);
                        } else {
                          setSelectedFormats((prev) => prev.filter((s) => !(s.id === f.format_id.id && s.agent_url === f.format_id.agent_url)));
                        }
                      }}
                    />
                    <span>
                      <strong>{f.name}</strong>
                      {f.dimensions && <span style={{ color: "#888", marginLeft: "0.3rem" }}>({f.dimensions})</span>}
                      <span style={{ color: "#aaa", marginLeft: "0.3rem", fontSize: "0.75rem" }}>{f.type}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Mock simulation settings */}
        {isMockAdapter && (
          <fieldset style={{ border: "1px solid rgba(0,212,255,0.15)", borderRadius: 6, padding: "1rem" }}>
            <legend style={{ fontWeight: 600, padding: "0 0.5rem", color: "#00d4ff", fontSize: "0.8rem", letterSpacing: "0.05em" }}>Mock Simulation Settings</legend>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span>Daily Impressions</span>
                <input type="number" min={0} step={1000} value={mockDailyImpressions} onChange={(e) => setMockDailyImpressions(parseInt(e.target.value, 10) || 0)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span>Fill Rate (%)</span>
                <input type="number" min={0} max={100} value={mockFillRate} onChange={(e) => setMockFillRate(parseInt(e.target.value, 10) || 0)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span>Click-Through Rate (%)</span>
                <input type="number" min={0} max={100} step={0.1} value={mockCtr} onChange={(e) => setMockCtr(parseFloat(e.target.value) || 0)} />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                <span>Viewability Rate (%)</span>
                <input type="number" min={0} max={100} value={mockViewability} onChange={(e) => setMockViewability(parseInt(e.target.value, 10) || 0)} />
              </label>
            </div>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.75rem" }}>
              <span>Simulation Scenario</span>
              <select value={mockScenario} onChange={(e) => setMockScenario(e.target.value)}>
                <option value="normal">Normal Operation</option>
                <option value="high_demand">High Demand (Low Fill)</option>
                <option value="degraded">Degraded Performance</option>
                <option value="outage">Service Outage</option>
              </select>
            </label>
          </fieldset>
        )}

        {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
        {saved && <p style={{ color: "#00e5a0", margin: 0 }}>Saved! Redirecting…</p>}
        <button type="submit" disabled={submitting} style={{ alignSelf: "flex-start" }}>
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </form>

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontFamily: "system-ui", fontSize: "1rem" }}>Inventory</h2>
        <ProductInventoryWidget tenantId={id} productId={productId} />
      </section>
    </BaseLayout>
  );
}

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <ProductEditContent />
    </PrivateRoute>
  );
}
