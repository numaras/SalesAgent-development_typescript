import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BaseLayout } from "../components/BaseLayout";
import { PrivateRoute } from "../components/PrivateRoute";

interface ProductRow {
  product_id: string;
  name: string;
  description: string | null;
  delivery_type: string;
}

/**
 * Table from GET /api/tenant/:id/products; delete action via DELETE /tenant/:id/products/:productId/delete.
 * Parity with _legacy products list and delete.
 */
function ProductsListContent() {
  const { id } = useParams<{ id: string }>();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tenant/${id}/products`, { credentials: "include" });
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized" : "Failed to load products");
        return;
      }
      const data = (await res.json()) as { products: ProductRow[] };
      setProducts(data.products ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (productId: string) => {
    if (!id || !window.confirm(`Delete product "${productId}"?`)) return;
    try {
      const res = await fetch(`/tenant/${id}/products/${encodeURIComponent(productId)}/delete`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
      if (data.success) {
        setProducts((prev) => prev.filter((p) => p.product_id !== productId));
      } else {
        window.alert(data.error ?? "Delete failed");
      }
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Request failed");
    }
  };

  if (!id) return null;
  if (loading) return <BaseLayout tenantId={id}><p>Loading…</p></BaseLayout>;
  if (error) {
    return (
      <BaseLayout tenantId={id}>
        <p style={{ color: "crimson" }}>{error}</p>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout tenantId={id}>
      <h1 style={{ fontFamily: "system-ui" }}>Products</h1>
      <p style={{ marginBottom: "1rem" }}>
        <Link to={`/tenant/${id}/products/add`} style={{ color: "var(--link, #06c)" }}>Add product</Link>
      </p>
      {products.length === 0 ? (
        <p style={{ color: "#666" }}>No products yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "system-ui" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #eee" }}>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Product ID</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Name</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Delivery</th>
              <th style={{ textAlign: "left", padding: "0.5rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.product_id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: "0.5rem" }}>
                  <Link to={`/tenant/${id}/products/${encodeURIComponent(p.product_id)}/edit`}>
                    {p.product_id}
                  </Link>
                </td>
                <td style={{ padding: "0.5rem" }}>{p.name}</td>
                <td style={{ padding: "0.5rem" }}>{p.delivery_type}</td>
                <td style={{ padding: "0.5rem" }}>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.product_id)}
                    style={{ color: "crimson", cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </BaseLayout>
  );
}

export default function ProductsListPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <PrivateRoute requireAuth requireTenantAccess tenantId={id}>
      <ProductsListContent />
    </PrivateRoute>
  );
}
