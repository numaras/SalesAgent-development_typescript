import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface AddPageContext {
  tenant_id: string;
  tenant_name: string;
  adapter_type: string;
  currencies: string[];
  inventory_profiles?: Array<{ id: number; name: string }>;
  inventory_synced?: boolean;
}

// ── Adapter-specific config shapes ──────────────────────────────────────────

interface MockConfig {
  daily_impressions: number;
  fill_rate: number;
  ctr: number;
  viewability: number;
  scenario: string;
}

interface GamConfig {
  inventory_profile_id: number | null;
  targeted_ad_unit_ids: string;
  targeted_placement_ids: string;
  include_descendants: boolean;
  order_name_template: string;
  creative_rotation_type: string;
  delivery_rate_type: string;
  allow_overbook: boolean;
}

interface BroadstreetConfig {
  targeted_zone_ids: string;
  delivery_rate: string;
  frequency_cap: string;
}

// ── Mock adapter config component (mirrors mock/product_config.html) ─────────

function MockProductConfig({ value, onChange }: { value: MockConfig; onChange: (c: MockConfig) => void }) {
  const handleScenario = (scenario: string) => {
    const updates: Partial<MockConfig> = { scenario };
    if (scenario === "high_demand") updates.fill_rate = 0.3;
    else if (scenario === "degraded") { updates.fill_rate = 0.5; updates.viewability = 0.4; }
    else if (scenario === "outage") updates.fill_rate = 0;
    else { updates.fill_rate = 0.85; updates.viewability = 0.65; }
    onChange({ ...value, ...updates });
  };

  return (
    <fieldset style={{ border: "1px solid rgba(0,212,255,0.15)", borderRadius: 6, padding: "1rem", marginTop: "1rem" }}>
      <legend style={{ fontWeight: 600, padding: "0 0.5rem", color: "#00d4ff", fontSize: "0.8rem", letterSpacing: "0.05em" }}>Mock Simulation Settings</legend>
      <p style={{ color: "#7da0c0", fontSize: "0.875rem", margin: "0 0 0.75rem" }}>
        Configure how this product behaves in the mock simulation environment.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Daily Impressions</span>
          <input
            type="number" min={0} step={1000} value={value.daily_impressions}
            onChange={(e) => onChange({ ...value, daily_impressions: parseInt(e.target.value, 10) || 0 })}
          />
          <small style={{ color: "#7da0c0" }}>Simulated daily impression capacity</small>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Fill Rate (%)</span>
          <input
            type="number" min={0} max={100} step={1} value={Math.round(value.fill_rate * 100)}
            onChange={(e) => onChange({ ...value, fill_rate: (parseInt(e.target.value, 10) || 0) / 100 })}
          />
          <small style={{ color: "#7da0c0" }}>Percentage of requests filled (0-100)</small>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Click-Through Rate (%)</span>
          <input
            type="number" min={0} max={100} step={0.1} value={+(value.ctr * 100).toFixed(2)}
            onChange={(e) => onChange({ ...value, ctr: (parseFloat(e.target.value) || 0) / 100 })}
          />
          <small style={{ color: "#7da0c0" }}>Simulated CTR percentage (0-100)</small>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Viewability Rate (%)</span>
          <input
            type="number" min={0} max={100} step={1} value={Math.round(value.viewability * 100)}
            onChange={(e) => onChange({ ...value, viewability: (parseInt(e.target.value, 10) || 0) / 100 })}
          />
          <small style={{ color: "#7da0c0" }}>Simulated viewability percentage (0-100)</small>
        </label>
      </div>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "0.75rem" }}>
        <span>Simulation Scenario</span>
        <select value={value.scenario} onChange={(e) => handleScenario(e.target.value)}>
          <option value="normal">Normal Operation</option>
          <option value="high_demand">High Demand (Low Fill)</option>
          <option value="degraded">Degraded Performance</option>
          <option value="outage">Service Outage</option>
        </select>
        <small style={{ color: "#7da0c0" }}>Simulate different operational scenarios for testing</small>
      </label>
    </fieldset>
  );
}

// ── GAM adapter config component (mirrors google_ad_manager/product_config.html) ──

function GamProductConfig({
  value,
  onChange,
  inventoryProfiles,
  inventorySynced,
}: {
  value: GamConfig;
  onChange: (c: GamConfig) => void;
  inventoryProfiles: Array<{ id: number; name: string }>;
  inventorySynced: boolean;
}) {
  const showManual = value.inventory_profile_id === null;

  return (
    <fieldset style={{ border: "1px solid rgba(0,212,255,0.15)", borderRadius: 6, padding: "1rem", marginTop: "1rem" }}>
      <legend style={{ fontWeight: 600, padding: "0 0.5rem", color: "#00d4ff", fontSize: "0.8rem", letterSpacing: "0.05em" }}>GAM Inventory Configuration</legend>

      {/* Inventory Profile selector */}
      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Inventory Profile</span>
          <select
            value={value.inventory_profile_id ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...value, inventory_profile_id: v ? parseInt(v, 10) : null });
            }}
          >
            <option value="">-- Select an inventory profile or configure manually --</option>
            {inventoryProfiles.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <small style={{ color: "#7da0c0" }}>
            Inventory profiles pre-configure ad units, formats, and targeting for common product types.
          </small>
        </label>
      </div>

      {/* Manual inventory — shown when no profile selected */}
      {showManual && (
        <div>
          <h4 style={{ color: "#7da0c0", fontSize: "0.8rem", margin: "0 0 0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>GAM Inventory</h4>
          {!inventorySynced && (
            <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 4, padding: "0.75rem", marginBottom: "0.75rem", fontSize: "0.875rem" }}>
              <strong style={{ color: "#f59e0b" }}>Inventory Not Synced</strong>
              <p style={{ margin: "0.25rem 0 0", color: "#c8a45a" }}>GAM inventory must be synced before browsing ad units. Go to Settings to sync inventory.</p>
            </div>
          )}
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.75rem" }}>
            <span>Ad Unit IDs (comma-separated)</span>
            <input
              type="text"
              value={value.targeted_ad_unit_ids}
              onChange={(e) => onChange({ ...value, targeted_ad_unit_ids: e.target.value })}
              placeholder="e.g., 12345678, 87654321"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.75rem" }}>
            <span>Placement IDs (comma-separated)</span>
            <input
              type="text"
              value={value.targeted_placement_ids}
              onChange={(e) => onChange({ ...value, targeted_placement_ids: e.target.value })}
              placeholder="e.g., 45678, 91011"
            />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <input
              type="checkbox"
              checked={value.include_descendants}
              onChange={(e) => onChange({ ...value, include_descendants: e.target.checked })}
            />
            Include child ad units in targeting
          </label>
        </div>
      )}

      {/* GAM line item info */}
      <div style={{ background: "rgba(0,212,255,0.05)", borderLeft: "3px solid #00d4ff", borderRadius: 4, padding: "0.75rem", marginBottom: "0.75rem", fontSize: "0.875rem" }}>
        <strong style={{ color: "#00d4ff" }}>Automatic Configuration</strong>
        <p style={{ margin: "0.25rem 0 0", color: "#7da0c0" }}>
          Line item type and priority are automatically determined from the selected pricing model:
          CPM Fixed → Standard (guaranteed), CPM Bid → Price Priority (non-guaranteed), Flat Rate → Sponsorship.
        </p>
      </div>

      {/* Advanced settings (collapsible) */}
      <details>
        <summary style={{ cursor: "pointer", fontWeight: 600, color: "#7da0c0", fontSize: "0.875rem" }}>Advanced Line Item Settings</summary>
        <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", gridColumn: "1 / -1" }}>
            <span>Order Name Template</span>
            <input
              type="text"
              value={value.order_name_template}
              onChange={(e) => onChange({ ...value, order_name_template: e.target.value })}
              placeholder="AdCP-{po_number}-{product_name}-{timestamp}"
            />
            <small style={{ color: "#7da0c0" }}>Variables: {"{po_number}"}, {"{product_name}"}, {"{timestamp}"}, {"{principal_name}"}</small>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>Creative Rotation</span>
            <select value={value.creative_rotation_type} onChange={(e) => onChange({ ...value, creative_rotation_type: e.target.value })}>
              <option value="EVEN">Even - Rotate creatives evenly</option>
              <option value="OPTIMIZED">Optimized - Favor best performers</option>
              <option value="MANUAL">Manual - Weighted rotation</option>
              <option value="SEQUENTIAL">Sequential - Show in order</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>Delivery Pacing</span>
            <select value={value.delivery_rate_type} onChange={(e) => onChange({ ...value, delivery_rate_type: e.target.value })}>
              <option value="EVENLY">Evenly - Spread throughout flight</option>
              <option value="FRONTLOADED">Frontloaded - Deliver faster early</option>
              <option value="AS_FAST_AS_POSSIBLE">As Fast As Possible - No pacing</option>
            </select>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              checked={value.allow_overbook}
              onChange={(e) => onChange({ ...value, allow_overbook: e.target.checked })}
            />
            Allow overbooking
          </label>
        </div>
      </details>
    </fieldset>
  );
}

// ── Broadstreet adapter config component (mirrors broadstreet/product_config.html) ──

function BroadstreetProductConfig({ value, onChange }: { value: BroadstreetConfig; onChange: (c: BroadstreetConfig) => void }) {
  return (
    <fieldset style={{ border: "1px solid rgba(0,212,255,0.15)", borderRadius: 6, padding: "1rem", marginTop: "1rem" }}>
      <legend style={{ fontWeight: 600, padding: "0 0.5rem", color: "#00d4ff", fontSize: "0.8rem", letterSpacing: "0.05em" }}>Broadstreet Zone Targeting</legend>
      <p style={{ color: "#7da0c0", fontSize: "0.875rem", margin: "0 0 0.75rem" }}>
        Select which Broadstreet zones this product will deliver to.
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.75rem" }}>
        <span>Target Zone IDs *</span>
        <input
          type="text"
          value={value.targeted_zone_ids}
          onChange={(e) => onChange({ ...value, targeted_zone_ids: e.target.value })}
          placeholder="e.g., 12345, 67890"
        />
        <small style={{ color: "#7da0c0" }}>Comma-separated list of Broadstreet zone IDs.</small>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Delivery Pacing</span>
          <select value={value.delivery_rate} onChange={(e) => onChange({ ...value, delivery_rate: e.target.value })}>
            <option value="EVEN">Even (Spread evenly)</option>
            <option value="FRONTLOADED">Frontloaded</option>
            <option value="ASAP">ASAP</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
          <span>Frequency Cap (per day)</span>
          <input
            type="number"
            min={1}
            value={value.frequency_cap}
            onChange={(e) => onChange({ ...value, frequency_cap: e.target.value })}
            placeholder="No cap"
          />
        </label>
      </div>
    </fieldset>
  );
}

// ── Converts adapter config state to a JSON-serialisable object for POST body ──

function buildImplConfig(
  adapterType: string,
  mockCfg: MockConfig,
  gamCfg: GamConfig,
  broadstreetCfg: BroadstreetConfig,
): Record<string, unknown> {
  if (adapterType === "mock") {
    return {
      daily_impressions: mockCfg.daily_impressions,
      fill_rate: mockCfg.fill_rate,
      ctr: mockCfg.ctr,
      viewability: mockCfg.viewability,
      scenario: mockCfg.scenario,
    };
  }
  if (adapterType === "google_ad_manager") {
    const cfg: Record<string, unknown> = {
      order_name_template: gamCfg.order_name_template || "AdCP-{po_number}-{product_name}-{timestamp}",
      creative_rotation_type: gamCfg.creative_rotation_type,
      delivery_rate_type: gamCfg.delivery_rate_type,
      allow_overbook: gamCfg.allow_overbook,
      include_descendants: gamCfg.include_descendants,
    };
    if (gamCfg.inventory_profile_id !== null) {
      cfg.inventory_profile_id = gamCfg.inventory_profile_id;
    } else {
      cfg.targeted_ad_unit_ids = gamCfg.targeted_ad_unit_ids.split(",").map((s) => s.trim()).filter(Boolean);
      cfg.targeted_placement_ids = gamCfg.targeted_placement_ids.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return cfg;
  }
  if (adapterType === "broadstreet") {
    return {
      targeted_zone_ids: broadstreetCfg.targeted_zone_ids.split(",").map((s) => s.trim()).filter(Boolean),
      delivery_rate: broadstreetCfg.delivery_rate,
      frequency_cap: parseInt(broadstreetCfg.frequency_cap, 10) || null,
    };
  }
  return {};
}

// ── Main page ────────────────────────────────────────────────────────────────

function ProductAddContent() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<AddPageContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Core fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productId, setProductId] = useState("");
  const [pricingOptionsJson, setPricingOptionsJson] = useState('[{"pricing_option_id":"opt-1","pricing_model":"cpm","currency":"USD","fixed_price":5}]');
  const [selectedFormats, setSelectedFormats] = useState<Array<{ id: string; agent_url: string }>>([]);
  const [availableFormats, setAvailableFormats] = useState<Array<{ format_id: { id: string; agent_url: string }; name: string; type: string; dimensions: string | null }>>([]);
  const [formatsLoading, setFormatsLoading] = useState(false);
  const [formatsSource, setFormatsSource] = useState<"live" | "fallback" | null>(null);
  const [formatsError, setFormatsError] = useState<string | null>(null);

  // Adapter-specific config state
  const [mockCfg, setMockCfg] = useState<MockConfig>({
    daily_impressions: 10000,
    fill_rate: 0.85,
    ctr: 0.02,
    viewability: 0.65,
    scenario: "normal",
  });
  const [gamCfg, setGamCfg] = useState<GamConfig>({
    inventory_profile_id: null,
    targeted_ad_unit_ids: "",
    targeted_placement_ids: "",
    include_descendants: true,
    order_name_template: "AdCP-{po_number}-{product_name}-{timestamp}",
    creative_rotation_type: "EVEN",
    delivery_rate_type: "EVENLY",
    allow_overbook: false,
  });
  const [broadstreetCfg, setBroadstreetCfg] = useState<BroadstreetConfig>({
    targeted_zone_ids: "",
    delivery_rate: "EVEN",
    frequency_cap: "",
  });

  useEffect(() => {
    if (!id) return;
    fetch(`/tenant/${id}/products/add`, { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data: AddPageContext) => setCtx(data))
      .catch((e) => setError(e instanceof Error ? e.message : "Request failed"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setFormatsLoading(true);
    fetch(`/api/formats/list?tenant_id=${encodeURIComponent(id)}`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { agents?: Record<string, Array<{ format_id: { id: string; agent_url: string }; name: string; type: string; dimensions: string | null }>>; source?: "live" | "fallback"; errors?: Array<{ error?: string }> } | null) => {
        if (!data?.agents) return;
        const all = Object.values(data.agents).flat();
        setAvailableFormats(all);
        setFormatsSource(data.source ?? null);
        if (data.errors && data.errors.length > 0) {
          setFormatsError(data.errors.map((e) => e.error ?? String(e)).join("; "));
        }
        // Pre-select standard display formats
        const defaults = all.filter((f) => f.format_id.id.startsWith("display_"));
        if (defaults.length > 0) setSelectedFormats(defaults.slice(0, 1).map((f) => f.format_id));
      })
      .catch(() => undefined)
      .finally(() => setFormatsLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !ctx) return;
    setSubmitting(true);
    try {
      let pricingOptions: Record<string, unknown>[];
      try {
        pricingOptions = JSON.parse(pricingOptionsJson) as Record<string, unknown>[];
        if (!Array.isArray(pricingOptions) || pricingOptions.length === 0) throw new Error("Need at least one option");
      } catch {
        setError("Invalid pricing options JSON (array with at least one object)");
        setSubmitting(false);
        return;
      }

      const implConfig = buildImplConfig(ctx.adapter_type, mockCfg, gamCfg, broadstreetCfg);

      const res = await fetch(`/tenant/${id}/products/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          product_id: productId.trim() || undefined,
          formats: selectedFormats,
          pricing_options: pricingOptions,
          countries: [],
          channels: [],
          implementation_config: implConfig,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; product_id?: string; error?: string };
      if (data.success && data.product_id) {
        navigate(`/tenant/${id}/products`, { replace: true });
        return;
      }
      setError(data.error ?? "Create failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (!id) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error && !ctx) return <BaseLayout tenantId={id}><p style={{ color: "crimson" }}>{error}</p></BaseLayout>;
  if (!ctx) return null;

  const adapterType = ctx.adapter_type ?? "mock";

  return (
    <BaseLayout tenantId={id}>
      <h1 style={{ fontFamily: "system-ui" }}>Add product</h1>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/products`}>← Back to products</Link>
      </p>
      <form onSubmit={handleSubmit} style={{ maxWidth: 560, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label>
          Product name *
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Standard Display"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        <label>
          Product ID (optional)
          <input
            type="text"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Leave empty to auto-generate"
            style={{ display: "block", width: "100%", marginTop: "0.25rem" }}
          />
        </label>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <span style={{ fontWeight: 500 }}>Creative Formats *</span>
            {formatsSource && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", fontSize: "0.72rem", fontWeight: 600 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", display: "inline-block",
                  background: formatsSource === "live" ? "#00e5a0" : "#f59e0b",
                  boxShadow: formatsSource === "live" ? "0 0 5px #00e5a0" : "0 0 5px #f59e0b",
                }} />
                <span
                  style={{ color: formatsSource === "live" ? "#00e5a0" : "#f59e0b", cursor: formatsError ? "help" : "default" }}
                  title={formatsError ?? undefined}
                >
                  {formatsSource === "live" ? "live" : "cached"}
                </span>
              </span>
            )}
          </div>
          {formatsLoading ? (
            <p style={{ color: "#666", fontSize: "0.875rem" }}>Loading formats…</p>
          ) : availableFormats.length === 0 ? (
            <p style={{ color: "#888", fontSize: "0.875rem" }}>No formats available (using default display_300x250)</p>
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
        <label>
          Pricing options (JSON array) *
          <textarea
            value={pricingOptionsJson}
            onChange={(e) => setPricingOptionsJson(e.target.value)}
            rows={3}
            style={{ fontFamily: "monospace", display: "block", width: "100%", marginTop: "0.25rem" }}
          />
          <small style={{ color: "#666" }}>pricing_model must be lowercase: cpm, vcpm, cpc, flat_rate</small>
        </label>

        {/* Adapter-specific product_config sub-component */}
        {adapterType === "mock" && (
          <MockProductConfig value={mockCfg} onChange={setMockCfg} />
        )}
        {adapterType === "google_ad_manager" && (
          <GamProductConfig
            value={gamCfg}
            onChange={setGamCfg}
            inventoryProfiles={ctx.inventory_profiles ?? []}
            inventorySynced={ctx.inventory_synced ?? false}
          />
        )}
        {adapterType === "broadstreet" && (
          <BroadstreetProductConfig value={broadstreetCfg} onChange={setBroadstreetCfg} />
        )}

        {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={submitting} style={{ alignSelf: "flex-start" }}>
          {submitting ? "Creating…" : "Create product"}
        </button>
      </form>
    </BaseLayout>
  );
}

export default function ProductAddPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <ProductAddContent />
    </PrivateRoute>
  );
}
