import { useCallback, useEffect, useRef, useState } from "react";

export interface ActivityItem {
  id: number;
  type: string;
  principal_name: string;
  action: string;
  details: Record<string, string>;
  full_details?: Record<string, unknown>;
  timestamp: string;
  time_relative: string;
  action_required?: boolean;
  operation?: string;
  success?: boolean;
}

interface ActivityStreamProps {
  tenantId: string;
  /** Use SSE EventSource at /tenant/:id/events when true; otherwise REST only. */
  useSse?: boolean;
  /** REST fallback URL: activity (single) or activities (with ?since=). */
  restUrl?: "activity" | "activities";
  /** Max items to show. */
  limit?: number;
  className?: string;
}

/**
 * SSE EventSource to /tenant/:id/events; REST fallback; audit log renderer.
 * Connects to GET /tenant/:id/events (SSE) or falls back to GET /tenant/:id/activity (or /activities).
 */
export function ActivityStream({
  tenantId,
  useSse = true,
  restUrl = "activity",
  limit = 50,
  className,
}: ActivityStreamProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useRest, setUseRest] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchRest = useCallback(async () => {
    if (!tenantId) return;
    const url = restUrl === "activities"
      ? `/tenant/${tenantId}/activities?limit=${limit}`
      : `/tenant/${tenantId}/activity`;
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        setError(res.status === 401 ? "Unauthorized" : "Failed to load activity");
        return;
      }
      const data = (await res.json()) as { activities: ActivityItem[]; count?: number };
      const list = data.activities ?? [];
      setActivities(Array.isArray(list) ? list.slice(0, limit) : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, [tenantId, restUrl, limit]);

  useEffect(() => {
    if (!tenantId) return;

    if (useRest || !useSse) {
      fetchRest();
      return;
    }

    const url = `/tenant/${tenantId}/events`;
    let es: EventSource;
    try {
      es = new EventSource(url, { withCredentials: true });
      eventSourceRef.current = es;
    } catch {
      setUseRest(true);
      return;
    }

    const newItems: ActivityItem[] = [];
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;
        if (data.type === "connected" || data.type === "error") return;
        if (data.id != null && data.timestamp) {
          newItems.push(data as unknown as ActivityItem);
          setActivities((prev) => {
            const combined = [data as unknown as ActivityItem, ...prev].slice(0, limit);
            return combined;
          });
        }
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      setUseRest(true);
    };

    // Initial load via REST so we have data immediately; SSE will append
    fetch(`/tenant/${tenantId}/activity`, { credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((data: { activities?: ActivityItem[] } | null) => {
        if (data?.activities?.length) {
          setActivities(Array.isArray(data.activities) ? data.activities.slice(0, limit) : []);
        }
      })
      .finally(() => setLoading(false));

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [tenantId, useSse, useRest, limit, fetchRest]);

  if (!tenantId) return null;
  if (loading && activities.length === 0) return <p className={className}>Loading activity…</p>;
  if (error && activities.length === 0) return <p className={className} style={{ color: "crimson" }}>{error}</p>;

  return (
    <div className={className}>
      {useRest && useSse && <p style={{ fontSize: "0.875rem", color: "#666" }}>Using REST fallback (SSE unavailable).</p>}
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {activities.map((a) => (
          <li
            key={`${a.id}-${a.timestamp}`}
            style={{
              borderLeft: a.action_required ? "3px solid #f59e0b" : a.success === false ? "3px solid #dc2626" : "3px solid #e5e7eb",
              paddingLeft: "0.75rem",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {a.time_relative} · {a.principal_name}
            </div>
            <div style={{ fontWeight: 500 }}>{a.action}</div>
            {a.details?.primary && <div>{a.details.primary}</div>}
            {a.details?.secondary && <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{a.details.secondary}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
}
