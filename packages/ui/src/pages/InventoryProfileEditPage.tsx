import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

// ── Data shapes ──────────────────────────────────────────────────────────────

interface InventoryConfig {
  ad_units?: string[];
  placements?: string[];
  include_descendants?: boolean;
}

interface FormatId {
  agent_url: string;
  id: string;
}

interface PublisherProp {
  publisher_domain: string;
  property_ids?: string[];
  property_tags?: string[];
}

interface ProfileFormData {
  id?: number;
  profile_id?: string;
  name: string;
  description: string | null;
  inventory_config: InventoryConfig;
  format_ids: FormatId[];
  publisher_properties: PublisherProp[];
  targeting_template?: Record<string, unknown> | null;
}

interface EditResponse {
  tenant_id: string;
  tenant_name: string;
  profile: ProfileFormData | null;
  mode: "create" | "edit";
}

interface FormatCard {
  agent_url: string;
  id: string;
  name: string;
  type: string;
  description: string | null;
  is_standard: boolean;
  dimensions: string | null;
}

interface InventoryNode {
  id: string;
  name: string;
  path: string[];
  children: InventoryNode[];
}

type PropertyMode = "tags" | "property_ids" | "full";

const TAG_RE = /^[a-z0-9_]{2,50}$/;

const defaultInventory: InventoryConfig = { ad_units: [], placements: [], include_descendants: true };

// ── Inventory Picker Modal ────────────────────────────────────────────────────

function InventoryPickerModal({
  tenantId,
  inventoryType,
  selected,
  onConfirm,
  onClose,
}: {
  tenantId: string;
  inventoryType: "ad_unit" | "placement";
  selected: string[];
  onConfirm: (ids: string[]) => void;
  onClose: () => void;
}) {
  const [nodes, setNodes] = useState<InventoryNode[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Set<string>>(new Set(selected));

  useEffect(() => {
    setLoading(true);
    const q = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : "";
    fetch(`/api/tenant/${tenantId}/inventory/tree${q}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : { tree: [], placements: [] })
      .then((data: { tree?: InventoryNode[]; placements?: InventoryNode[] }) => {
        if (inventoryType === "ad_unit") setNodes(data.tree ?? []);
        else setNodes(data.placements ?? []);
      })
      .catch(() => setNodes([]))
      .finally(() => setLoading(false));
  }, [tenantId, inventoryType, search]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (node: InventoryNode, depth = 0): React.ReactNode => (
    <div key={node.id} style={{ marginLeft: depth * 16 }}>
      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0", cursor: "pointer" }}>
        <input type="checkbox" checked={checked.has(node.id)} onChange={() => toggle(node.id)} />
        <span style={{ fontSize: "0.875rem" }}>{node.name}</span>
        <code style={{ fontSize: "0.7rem", color: "#6b7280" }}>{node.id}</code>
      </label>
      {node.children?.map((c) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 8, padding: "1.5rem", width: 480, maxHeight: "80vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1rem" }}>
            Browse {inventoryType === "ad_unit" ? "Ad Units" : "Placements"}
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.25rem", color: "#6b7280" }}>✕</button>
        </div>
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginBottom: "0.75rem", padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 4, fontSize: "0.875rem" }}
        />
        <div style={{ flex: 1, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 4, padding: "0.5rem", minHeight: 120 }}>
          {loading ? (
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0.5rem" }}>Loading…</p>
          ) : nodes.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: "0.5rem" }}>
              {search ? "No results for this search." : "No inventory synced yet. Go to Settings → Ad Server to sync."}
            </p>
          ) : (
            nodes.map((n) => renderNode(n))
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "0.4rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => onConfirm([...checked])} style={{ padding: "0.4rem 0.75rem", border: "none", borderRadius: 4, background: "#2563eb", color: "#fff", cursor: "pointer", fontWeight: 600 }}>
            Confirm ({checked.size})
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Format selector (replaces manual agent_url+id rows) ──────────────────────

function FormatSelector({
  tenantId,
  value,
  onChange,
}: {
  tenantId: string;
  value: FormatId[];
  onChange: (v: FormatId[]) => void;
}) {
  const [allFormats, setAllFormats] = useState<FormatCard[]>([]);
  const [search, setSearch] = useState("");
  const [loadingFmts, setLoadingFmts] = useState(false);
  const fetched = useRef(false);

  const loadFormats = useCallback(() => {
    if (fetched.current) return;
    fetched.current = true;
    setLoadingFmts(true);
    fetch(`/api/formats/list?tenant_id=${encodeURIComponent(tenantId)}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : { agents: {}, total_formats: 0 })
      .then((data: { agents: Record<string, Array<{ format_id: { id: string; agent_url: string }; name: string; type: string; description: string | null; is_standard: boolean; dimensions: string | null }>> }) => {
        const flat: FormatCard[] = [];
        for (const [, formats] of Object.entries(data.agents)) {
          for (const f of formats) {
            flat.push({
              agent_url: f.format_id.agent_url,
              id: f.format_id.id,
              name: f.name,
              type: f.type,
              description: f.description,
              is_standard: f.is_standard,
              dimensions: f.dimensions,
            });
          }
        }
        setAllFormats(flat);
      })
      .catch(() => { /* silent; user can retry */ })
      .finally(() => setLoadingFmts(false));
  }, [tenantId]);

  const isSelected = (f: FormatCard) => value.some((v) => v.id === f.id && v.agent_url === f.agent_url);

  const toggle = (f: FormatCard) => {
    if (isSelected(f)) {
      onChange(value.filter((v) => !(v.id === f.id && v.agent_url === f.agent_url)));
    } else {
      onChange([...value, { agent_url: f.agent_url, id: f.id }]);
    }
  };

  const lowerQ = search.toLowerCase();
  const filtered = allFormats.filter(
    (f) =>
      !lowerQ ||
      f.name.toLowerCase().includes(lowerQ) ||
      f.id.toLowerCase().includes(lowerQ) ||
      (f.description?.toLowerCase().includes(lowerQ) ?? false)
  );

  const typeColors: Record<string, { bg: string; text: string }> = {
    display: { bg: "#dbeafe", text: "#1e40af" },
    video:   { bg: "#d1fae5", text: "#065f46" },
    native:  { bg: "#fef3c7", text: "#92400e" },
    audio:   { bg: "#e0e7ff", text: "#3730a3" },
  };

  return (
    <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "1rem", marginBottom: "1rem" }}>
      <legend style={{ fontWeight: 600, padding: "0 0.25rem" }}>Creative Formats</legend>

      {/* Selected formats tags */}
      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
          {value.map((v) => (
            <span
              key={`${v.agent_url}:${v.id}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem", background: "#dbeafe", color: "#1e40af", padding: "0.2rem 0.5rem", borderRadius: 4, fontSize: "0.8rem", fontWeight: 600 }}
            >
              {v.id}
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => !(x.id === v.id && x.agent_url === v.agent_url)))}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#1e40af", padding: 0, fontSize: "0.75rem", lineHeight: 1 }}
              >×</button>
            </span>
          ))}
        </div>
      )}

      {/* Load / search */}
      {!allFormats.length && !loadingFmts ? (
        <button type="button" onClick={loadFormats} style={{ padding: "0.4rem 0.75rem", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
          Browse formats from agent registry
        </button>
      ) : (
        <input
          type="text"
          placeholder="Search formats…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 4, fontSize: "0.875rem", marginBottom: "0.5rem", boxSizing: "border-box" }}
        />
      )}

      {loadingFmts && <p style={{ color: "#6b7280", fontSize: "0.875rem" }}>Loading formats…</p>}

      {/* Format cards */}
      {allFormats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.5rem", maxHeight: 240, overflowY: "auto" }}>
          {filtered.map((f) => {
            const sel = isSelected(f);
            const tcolor = typeColors[f.type] ?? { bg: "#f3f4f6", text: "#374151" };
            return (
              <button
                key={`${f.agent_url}:${f.id}`}
                type="button"
                onClick={() => toggle(f)}
                style={{
                  textAlign: "left",
                  padding: "0.6rem",
                  border: `2px solid ${sel ? "#2563eb" : "#e5e7eb"}`,
                  borderRadius: 6,
                  background: sel ? "#eff6ff" : "#fff",
                  cursor: "pointer",
                  transition: "border-color 0.1s",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: "0.8rem", color: "#111827", marginBottom: "0.2rem" }}>{f.name}</div>
                <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", marginBottom: "0.25rem" }}>
                  <span style={{ fontSize: "0.7rem", background: tcolor.bg, color: tcolor.text, padding: "0 0.3rem", borderRadius: 3 }}>{f.type}</span>
                  {f.dimensions && <span style={{ fontSize: "0.7rem", background: "#f3f4f6", color: "#374151", padding: "0 0.3rem", borderRadius: 3 }}>{f.dimensions}</span>}
                  {f.is_standard && <span style={{ fontSize: "0.7rem", background: "#d1fae5", color: "#065f46", padding: "0 0.3rem", borderRadius: 3 }}>std</span>}
                </div>
                {f.description && <div style={{ fontSize: "0.7rem", color: "#6b7280", lineHeight: 1.3 }}>{f.description}</div>}
              </button>
            );
          })}
        </div>
      )}

      {/* Fallback: allow manual entry if formats can't load */}
      <details style={{ marginTop: "0.75rem" }}>
        <summary style={{ cursor: "pointer", fontSize: "0.8rem", color: "#6b7280" }}>Manual entry (agent_url + format ID)</summary>
        <div style={{ marginTop: "0.5rem" }}>
          {value.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: "0.4rem", marginBottom: "0.25rem" }}>
              <input
                type="text"
                placeholder="agent_url"
                value={f.agent_url}
                onChange={(e) => { const n = [...value]; n[i] = { ...n[i]!, agent_url: e.target.value }; onChange(n); }}
                style={{ flex: 2, fontSize: "0.8rem" }}
              />
              <input
                type="text"
                placeholder="format id"
                value={f.id}
                onChange={(e) => { const n = [...value]; n[i] = { ...n[i]!, id: e.target.value }; onChange(n); }}
                style={{ flex: 1, fontSize: "0.8rem" }}
              />
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626" }}>✕</button>
            </div>
          ))}
          <button type="button" onClick={() => onChange([...value, { agent_url: "", id: "" }])} style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer" }}>
            + Add row
          </button>
        </div>
      </details>
    </fieldset>
  );
}

// ── Property Selector (property_mode: tags / property_ids / full) ─────────────

function PropertySelector({
  value,
  onChange,
  propertiesList,
  propertyMode,
  onModeChange,
  publisherDomain,
  onDomainChange,
  tagsStr,
  onTagsChange,
  tagError,
}: {
  value: PublisherProp[];
  onChange: (v: PublisherProp[]) => void;
  propertiesList: Array<{ publisher_domain: string; name: string; tags: string[] }>;
  propertyMode: PropertyMode;
  onModeChange: (m: PropertyMode) => void;
  publisherDomain: string;
  onDomainChange: (d: string) => void;
  tagsStr: string;
  onTagsChange: (t: string) => void;
  tagError: string | null;
}) {
  const domains = [...new Set(propertiesList.map((p) => p.publisher_domain))];

  return (
    <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "1rem", marginBottom: "1rem" }}>
      <legend style={{ fontWeight: 600, padding: "0 0.25rem" }}>Publisher Properties</legend>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {(["tags", "property_ids", "full"] as PropertyMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onModeChange(m)}
            style={{
              padding: "0.25rem 0.6rem",
              fontSize: "0.8rem",
              border: "1px solid #d1d5db",
              borderRadius: 4,
              cursor: "pointer",
              background: propertyMode === m ? "#2563eb" : "#fff",
              color: propertyMode === m ? "#fff" : "#374151",
              fontWeight: propertyMode === m ? 600 : 400,
            }}
          >
            {m === "tags" ? "By Tags" : m === "property_ids" ? "By Property IDs" : "Full JSON"}
          </button>
        ))}
      </div>

      {/* Tags mode */}
      {propertyMode === "tags" && (
        <div>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.5rem" }}>
            <span>Publisher Domain</span>
            {domains.length > 0 ? (
              <select value={publisherDomain} onChange={(e) => onDomainChange(e.target.value)} style={{ fontSize: "0.875rem" }}>
                <option value="">— Select domain —</option>
                {domains.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            ) : (
              <input
                type="text"
                value={publisherDomain}
                onChange={(e) => onDomainChange(e.target.value)}
                placeholder="e.g., example.com"
                style={{ fontSize: "0.875rem" }}
              />
            )}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <span>Property Tags (comma-separated)</span>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => onTagsChange(e.target.value)}
              placeholder="all_inventory, sports, news"
              style={{ fontSize: "0.875rem", borderColor: tagError ? "#dc2626" : undefined }}
            />
            <small style={{ color: "#6b7280" }}>Format: lowercase letters, numbers, underscores, 2–50 chars each</small>
            {tagError && <small style={{ color: "#dc2626" }}>{tagError}</small>}
          </label>
        </div>
      )}

      {/* Property IDs mode — checkbox list */}
      {propertyMode === "property_ids" && (
        <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: 4, padding: "0.5rem" }}>
          {propertiesList.length === 0 ? (
            <p style={{ color: "#6b7280", fontSize: "0.875rem", margin: 0 }}>No authorized properties found.</p>
          ) : (
            propertiesList.map((prop) => {
              const checked = value.some((p) =>
                p.publisher_domain === prop.publisher_domain &&
                p.property_ids?.includes(prop.publisher_domain)
              );
              return (
                <label key={prop.publisher_domain} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0", fontSize: "0.875rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...value, { publisher_domain: prop.publisher_domain, property_ids: [prop.publisher_domain] }]);
                      } else {
                        onChange(value.filter((p) => p.publisher_domain !== prop.publisher_domain));
                      }
                    }}
                  />
                  <span><strong>{prop.name}</strong> <code style={{ fontSize: "0.75rem", color: "#6b7280" }}>{prop.publisher_domain}</code></span>
                </label>
              );
            })
          )}
        </div>
      )}

      {/* Full mode — JSON textarea */}
      {propertyMode === "full" && (
        <div>
          {value.map((p, i) => (
            <div key={i} style={{ marginBottom: "0.5rem", padding: "0.5rem", border: "1px solid #e5e7eb", borderRadius: 4, background: "#f9fafb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                <select
                  value={p.publisher_domain}
                  onChange={(e) => { const n = [...value]; n[i] = { ...n[i]!, publisher_domain: e.target.value }; onChange(n); }}
                  style={{ fontSize: "0.875rem", flex: 1 }}
                >
                  <option value="">— Domain —</option>
                  {domains.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", marginLeft: "0.5rem" }}>✕</button>
              </div>
              <input
                type="text"
                value={(p.property_tags ?? []).join(", ")}
                onChange={(e) => {
                  const tags = e.target.value.split(",").map((t) => t.trim()).filter(Boolean);
                  const n = [...value];
                  n[i] = { ...n[i]!, property_tags: tags };
                  onChange(n);
                }}
                placeholder="property_tags (comma-separated)"
                style={{ width: "100%", fontSize: "0.8rem", boxSizing: "border-box", marginTop: "0.25rem" }}
              />
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange([...value, { publisher_domain: "", property_tags: ["all_inventory"] }])}
            style={{ fontSize: "0.8rem", padding: "0.2rem 0.5rem", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer" }}
          >
            + Add property
          </button>
        </div>
      )}
    </fieldset>
  );
}

// ── Main page component ──────────────────────────────────────────────────────

function InventoryProfileEditContent() {
  const { id, profileId } = useParams<{ id: string; profileId: string }>();
  const navigate = useNavigate();
  const isAdd = profileId === "add";

  const [meta, setMeta] = useState<EditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitBusy, setSubmitBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Core fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [readonlyProfileId, setReadonlyProfileId] = useState<string>("");

  // Inventory
  const [adUnits, setAdUnits] = useState<string[]>([]);
  const [placements, setPlacements] = useState<string[]>([]);
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [pickerOpen, setPickerOpen] = useState<"ad_unit" | "placement" | null>(null);

  // Formats
  const [formatIds, setFormatIds] = useState<FormatId[]>([]);

  // Properties
  const [propertyMode, setPropertyMode] = useState<PropertyMode>("full");
  const [publisherProperties, setPublisherProperties] = useState<PublisherProp[]>([{ publisher_domain: "", property_tags: ["all_inventory"] }]);
  const [propertiesList, setPropertiesList] = useState<Array<{ publisher_domain: string; name: string; tags: string[] }>>([]);
  const [publisherDomain, setPublisherDomain] = useState("");
  const [tagsStr, setTagsStr] = useState("all_inventory");
  const [tagError, setTagError] = useState<string | null>(null);

  // Targeting template
  const [targetingJson, setTargetingJson] = useState("{}");
  const [targetingJsonError, setTargetingJsonError] = useState<string | null>(null);

  // ── Load profile data ──────────────────────────────────────────────────────
  const loadMeta = useCallback(async () => {
    if (!id) return;
    const url = isAdd
      ? `/tenant/${id}/inventory-profiles/add`
      : `/tenant/${id}/inventory-profiles/${profileId}/edit`;
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) return null;
    return (await res.json()) as EditResponse;
  }, [id, profileId, isAdd]);

  const loadProperties = useCallback(async () => {
    if (!id) return;
    const res = await fetch(`/tenant/${id}/authorized-properties`, { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { properties?: Array<{ publisher_domain: string; name: string; tags?: string[] }> };
    setPropertiesList((data.properties ?? []).map((p) => ({ publisher_domain: p.publisher_domain, name: p.name, tags: p.tags ?? [] })));
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const data = await loadMeta();
      if (cancelled || !data) return;
      setMeta(data);
      if (data.profile) {
        setName(data.profile.name);
        setDescription(data.profile.description ?? "");
        setReadonlyProfileId(data.profile.profile_id ?? "");

        const inv = data.profile.inventory_config ?? defaultInventory;
        setAdUnits(inv.ad_units ?? []);
        setPlacements(inv.placements ?? []);
        setIncludeDescendants(inv.include_descendants ?? true);

        const fids = (data.profile.format_ids ?? []) as FormatId[];
        setFormatIds(fids);

        const props = (data.profile.publisher_properties ?? []) as PublisherProp[];
        setPublisherProperties(props.length ? props : [{ publisher_domain: "", property_tags: ["all_inventory"] }]);

        const tt = data.profile.targeting_template;
        setTargetingJson(tt && Object.keys(tt).length > 0 ? JSON.stringify(tt, null, 2) : "{}");
      }
    })().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [loadMeta]);

  useEffect(() => { loadProperties(); }, [loadProperties]);

  // ── Tag validation ─────────────────────────────────────────────────────────
  const validateTags = (raw: string): string[] | null => {
    const tags = raw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
    for (const tag of tags) {
      if (!TAG_RE.test(tag)) {
        setTagError(`Invalid tag "${tag}" — use lowercase letters, numbers, underscores (2–50 chars)`);
        return null;
      }
    }
    setTagError(null);
    return tags;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !meta) return;
    setFormError(null);

    // Parse targeting_template JSON
    let targetingTemplate: Record<string, unknown> | null = null;
    try {
      const parsed = JSON.parse(targetingJson);
      targetingTemplate = typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
      setTargetingJsonError(null);
    } catch {
      setTargetingJsonError("Invalid JSON in targeting template");
      return;
    }

    // Build publisher_properties from current mode
    let finalProperties: PublisherProp[];
    if (propertyMode === "tags") {
      const tags = validateTags(tagsStr);
      if (!tags) return;
      if (!publisherDomain.trim()) { setFormError("Publisher domain is required in tags mode"); return; }
      finalProperties = [{ publisher_domain: publisherDomain.trim(), property_tags: tags, selection_type: "by_tag" } as PublisherProp];
    } else {
      finalProperties = publisherProperties.filter((p) => p.publisher_domain.trim());
      if (!finalProperties.length) finalProperties = [{ publisher_domain: "unknown", property_tags: ["all_inventory"] }];
    }

    const formatIdsFiltered = formatIds.filter((f) => f.agent_url.trim() && f.id.trim());

    const body: Record<string, unknown> = {
      name: name.trim(),
      description: description.trim() || null,
      inventory_config: { ad_units: adUnits, placements, include_descendants: includeDescendants },
      format_ids: formatIdsFiltered,
      publisher_properties: finalProperties,
      targeting_template: targetingTemplate,
    };

    // Add tags-mode specific fields for the add endpoint
    if (isAdd && propertyMode === "tags") {
      body.property_mode = "tags";
      body.publisher_domain = publisherDomain.trim();
      body.property_tags = tagsStr;
    }

    setSubmitBusy(true);
    try {
      const url = isAdd
        ? `/tenant/${id}/inventory-profiles/add`
        : `/tenant/${id}/inventory-profiles/${profileId}/edit`;
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (result.success) {
        navigate(`/tenant/${id}/inventory-profiles`);
      } else {
        setFormError(result.error ?? (isAdd ? "Create failed" : "Update failed"));
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setSubmitBusy(false);
    }
  };

  if (!id) return null;
  if (loading || !meta) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;

  return (
    <BaseLayout tenantId={id} tenantName={meta.tenant_name}>
      {/* Inventory picker modal */}
      {pickerOpen && (
        <InventoryPickerModal
          tenantId={id}
          inventoryType={pickerOpen}
          selected={pickerOpen === "ad_unit" ? adUnits : placements}
          onConfirm={(ids) => {
            if (pickerOpen === "ad_unit") setAdUnits(ids);
            else setPlacements(ids);
            setPickerOpen(null);
          }}
          onClose={() => setPickerOpen(null)}
        />
      )}

      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/inventory-profiles`} style={{ color: "var(--link, #06c)" }}>← Back to profiles</Link>
      </p>
      <h1 style={{ fontFamily: "system-ui" }}>{isAdd ? "Add inventory profile" : "Edit inventory profile"}</h1>

      <form onSubmit={handleSubmit} style={{ maxWidth: 660 }}>
        {/* profile_id — readonly in edit mode */}
        {!isAdd && readonlyProfileId && (
          <div style={{ marginBottom: "0.75rem" }}>
            <label style={{ color: "#6b7280", fontSize: "0.875rem" }}>Profile ID (read-only)</label>
            <input
              type="text"
              value={readonlyProfileId}
              readOnly
              style={{ display: "block", width: "100%", background: "#f9fafb", cursor: "not-allowed", color: "#6b7280", fontFamily: "monospace" }}
            />
          </div>
        )}

        <div style={{ marginBottom: "0.75rem" }}>
          <label>Name *
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={{ display: "block", width: "100%", marginTop: "0.25rem" }} />
          </label>
        </div>
        <div style={{ marginBottom: "0.75rem" }}>
          <label>Description
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={{ display: "block", width: "100%", marginTop: "0.25rem" }} />
          </label>
        </div>

        {/* Inventory picker — Browse Ad Units + Placements */}
        <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "1rem", marginBottom: "1rem" }}>
          <legend style={{ fontWeight: 600, padding: "0 0.25rem" }}>Inventory</legend>

          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, minWidth: 80 }}>Ad Units ({adUnits.length})</span>
              <button
                type="button"
                onClick={() => setPickerOpen("ad_unit")}
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer" }}
              >
                Browse Ad Units
              </button>
            </div>
            <input
              type="text"
              value={adUnits.join(", ")}
              onChange={(e) => setAdUnits(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="or enter IDs comma-separated"
              style={{ width: "100%", fontSize: "0.875rem", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.4rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500, minWidth: 80 }}>Placements ({placements.length})</span>
              <button
                type="button"
                onClick={() => setPickerOpen("placement")}
                style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem", border: "1px solid #d1d5db", borderRadius: 4, background: "#fff", cursor: "pointer" }}
              >
                Browse Placements
              </button>
            </div>
            <input
              type="text"
              value={placements.join(", ")}
              onChange={(e) => setPlacements(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              placeholder="or enter IDs comma-separated"
              style={{ width: "100%", fontSize: "0.875rem", boxSizing: "border-box" }}
            />
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
            <input type="checkbox" checked={includeDescendants} onChange={(e) => setIncludeDescendants(e.target.checked)} />
            Include child ad units in targeting
          </label>
        </fieldset>

        {/* Format selector — search + card selection from /api/formats/list */}
        <FormatSelector tenantId={id} value={formatIds} onChange={setFormatIds} />

        {/* Property selector — tags / property_ids / full */}
        <PropertySelector
          value={publisherProperties}
          onChange={setPublisherProperties}
          propertiesList={propertiesList}
          propertyMode={propertyMode}
          onModeChange={setPropertyMode}
          publisherDomain={publisherDomain}
          onDomainChange={setPublisherDomain}
          tagsStr={tagsStr}
          onTagsChange={(t) => { setTagsStr(t); validateTags(t); }}
          tagError={tagError}
        />

        {/* Targeting template — JSON textarea */}
        <fieldset style={{ border: "1px solid #e5e7eb", borderRadius: 6, padding: "1rem", marginBottom: "1rem" }}>
          <legend style={{ fontWeight: 600, padding: "0 0.25rem" }}>Targeting Template (optional)</legend>
          <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 0.5rem" }}>
            Key-value pairs for custom targeting (e.g. <code>{"{"}"sport":"basketball"{"}"}</code>). Leave as <code>{"{}"}</code> for no targeting.
          </p>
          <textarea
            value={targetingJson}
            onChange={(e) => { setTargetingJson(e.target.value); setTargetingJsonError(null); }}
            rows={4}
            style={{ width: "100%", fontFamily: "monospace", fontSize: "0.875rem", boxSizing: "border-box", borderColor: targetingJsonError ? "#dc2626" : undefined }}
          />
          {targetingJsonError && <small style={{ color: "#dc2626" }}>{targetingJsonError}</small>}
        </fieldset>

        {formError && <p style={{ color: "#dc2626", marginBottom: "0.75rem" }}>{formError}</p>}
        <button type="submit" disabled={submitBusy} style={{ padding: "0.5rem 1.25rem", fontWeight: 600 }}>
          {submitBusy ? "Saving…" : isAdd ? "Create" : "Save"}
        </button>
      </form>
    </BaseLayout>
  );
}

export default function InventoryProfileEditPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <InventoryProfileEditContent />
    </PrivateRoute>
  );
}
