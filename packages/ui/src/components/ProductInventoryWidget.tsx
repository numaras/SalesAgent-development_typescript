import { useCallback, useEffect, useState } from "react";

interface InventoryItem {
  mapping_id: number | string;
  inventory_id: string;
  inventory_name: string;
  inventory_type: string;
  is_primary?: boolean;
  status?: string;
  path?: string[] | null;
}

/**
 * Fetch/add/remove inventory mappings; uses GET/POST /api/tenant/:id/product/:p_id/inventory.
 * Remove uses DELETE /tenant/:id/products/:productId/inventory/:mappingId (mappingId = type:id).
 */
export function ProductInventoryWidget({
  tenantId,
  productId,
}: {
  tenantId: string;
  productId: string;
}) {
  const [list, setList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addId, setAddId] = useState("");
  const [addType, setAddType] = useState<"ad_unit" | "placement">("ad_unit");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/tenant/${tenantId}/product/${encodeURIComponent(productId)}/inventory`,
        { credentials: "include" }
      );
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized" : "Failed to load");
        setList([]);
        return;
      }
      const data = (await res.json()) as { inventory?: InventoryItem[] };
      setList(data.inventory ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, productId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = addId.trim();
    if (!id) return;
    setAddSubmitting(true);
    try {
      const res = await fetch(
        `/api/tenant/${tenantId}/product/${encodeURIComponent(productId)}/inventory`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            inventory_id: id,
            inventory_type: addType,
            is_primary: false,
          }),
        }
      );
      if (res.ok) {
        setAddId("");
        await load();
      } else {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Add failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleRemove = async (item: InventoryItem) => {
    const mappingId = `${item.inventory_type}:${item.inventory_id}`;
    if (!window.confirm(`Remove ${item.inventory_name}?`)) return;
    try {
      const res = await fetch(
        `/tenant/${tenantId}/products/${encodeURIComponent(productId)}/inventory/${encodeURIComponent(mappingId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) await load();
      else {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? "Remove failed");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    }
  };

  if (loading) return <p style={{ color: "#666" }}>Loading inventory…</p>;
  if (error) return <p style={{ color: "crimson" }}>{error}</p>;

  return (
    <div style={{ fontFamily: "system-ui" }}>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {list.map((item) => (
          <li
            key={String(item.mapping_id)}
            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0" }}
          >
            <span>
              {item.inventory_name} ({item.inventory_type})
            </span>
            <button
              type="button"
              onClick={() => handleRemove(item)}
              style={{ color: "crimson", cursor: "pointer", fontSize: "0.875rem" }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {list.length === 0 && <p style={{ color: "#666" }}>No inventory assigned.</p>}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.5rem" }}>
        <input
          type="text"
          value={addId}
          onChange={(e) => setAddId(e.target.value)}
          placeholder="Inventory ID"
          style={{ width: 120 }}
        />
        <select
          value={addType}
          onChange={(e) => setAddType(e.target.value as "ad_unit" | "placement")}
        >
          <option value="ad_unit">ad_unit</option>
          <option value="placement">placement</option>
        </select>
        <button type="submit" disabled={addSubmitting || !addId.trim()}>
          {addSubmitting ? "Adding…" : "Add"}
        </button>
      </form>
    </div>
  );
}
