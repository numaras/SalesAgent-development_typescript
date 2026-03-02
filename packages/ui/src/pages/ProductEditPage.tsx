import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";
import { ProductInventoryWidget } from "../components/ProductInventoryWidget";

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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [pricingOptionsJson, setPricingOptionsJson] = useState("[]");

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
        setPricingOptionsJson(
          JSON.stringify(
            (p.implementation_config?.pricing_options as Record<string, unknown>[]) ?? [],
             null,
             2
          )
        );
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Request failed"))
      .finally(() => setLoading(false));
  }, [id, productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !productId || !ctx) return;
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
      const res = await fetch(`/tenant/${id}/products/${encodeURIComponent(productId)}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          formats: ctx.product.formats,
          pricing_options: pricingOptions.length > 0 ? pricingOptions : undefined,
          countries: ctx.product.countries,
          channels: ctx.product.channels,
          targeting_template: ctx.product.targeting_template,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (data.success) {
        navigate(`/tenant/${id}/products`, { replace: true });
        return;
      }
      setError(data.error ?? "Update failed");
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
    <BaseLayout tenantId={id}>
      <h1 style={{ fontFamily: "system-ui" }}>Edit product</h1>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/products`}>← Back to products</Link>
      </p>
      <form onSubmit={handleSubmit} style={{ maxWidth: 480, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label>Product name *</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        <label>Description</label>
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} />
        <label>Pricing options (JSON array)</label>
        <textarea
          value={pricingOptionsJson}
          onChange={(e) => setPricingOptionsJson(e.target.value)}
          rows={4}
          style={{ fontFamily: "monospace" }}
        />
        {error && <p style={{ color: "crimson", margin: 0 }}>{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save"}</button>
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
