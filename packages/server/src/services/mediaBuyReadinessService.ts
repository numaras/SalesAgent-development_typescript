/**
 * Shared media buy readiness state computation.
 *
 * Mirrors the state mapping currently used by admin media buy listing and
 * powers detail views that need computed readiness metadata.
 */

export function extractPackagesTotal(rawRequest: unknown): number {
  if (!rawRequest || typeof rawRequest !== "object") return 0;
  const record = rawRequest as Record<string, unknown>;
  const packages = record["packages"];
  if (!Array.isArray(packages)) return 0;
  return packages.length;
}

export function computeReadinessState(
  status: string,
  startDate: string | null,
  endDate: string | null,
  startTime: Date | null,
  endTime: Date | null,
  packagesTotal: number,
): {
  state: string;
  is_ready_to_activate: boolean;
  blocking_issues: string[];
} {
  const now = new Date();

  if (status === "failed") {
    return {
      state: "failed",
      is_ready_to_activate: false,
      blocking_issues: ["Media buy creation failed"],
    };
  }

  if (status === "paused") {
    return { state: "paused", is_ready_to_activate: false, blocking_issues: [] };
  }

  if (status === "pending_approval") {
    return {
      state: "needs_approval",
      is_ready_to_activate: false,
      blocking_issues: [],
    };
  }

  if (status === "pending_creatives") {
    return {
      state: "needs_creatives",
      is_ready_to_activate: false,
      blocking_issues: ["Creatives required before activation"],
    };
  }

  const resolveEnd = (): Date => {
    if (endTime) return endTime;
    if (endDate) return new Date(`${endDate}T23:59:59Z`);
    return now;
  };

  const resolveStart = (): Date => {
    if (startTime) return startTime;
    if (startDate) return new Date(`${startDate}T00:00:00Z`);
    return now;
  };

  const endDateTime = resolveEnd();
  const startDateTime = resolveStart();

  if (now > endDateTime) {
    return { state: "completed", is_ready_to_activate: false, blocking_issues: [] };
  }

  if (packagesTotal === 0) {
    return { state: "draft", is_ready_to_activate: false, blocking_issues: ["No packages configured"] };
  }

  if (status === "active" || status === "scheduled" || status === "approved") {
    if (now >= startDateTime) {
      return { state: "live", is_ready_to_activate: true, blocking_issues: [] };
    }
    return { state: "scheduled", is_ready_to_activate: true, blocking_issues: [] };
  }

  if (status === "draft") {
    return { state: "draft", is_ready_to_activate: false, blocking_issues: [] };
  }

  return { state: status, is_ready_to_activate: false, blocking_issues: [] };
}

