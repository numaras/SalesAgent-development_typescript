/**
 * A2A skill: get_adcp_capabilities — optional auth, returns minimal or full capabilities.
 *
 * Legacy equivalent: _legacy/src/core/main.py → get_adcp_capabilities (MCP tool)
 *   Minimal capabilities when no tenant; full media_buy when tenant context.
 */
import { resolveTenantFromHeaders } from "../../auth/resolveTenantFromHost.js";
import { getAdcpCapabilities } from "../../services/capabilitiesService.js";
import { isToolContext } from "../authExtractor.js";
import { registerSkill } from "../dispatcher.js";

async function getAdcpCapabilitiesHandler(
  _params: Record<string, unknown>,
  _authToken: string | null,
  context: import("../authExtractor.js").A2AContext,
): Promise<unknown> {
  let tenantContext: { tenantId: string; tenantName?: string } | null = null;

  if (isToolContext(context)) {
    tenantContext = {
      tenantId: context.tenantId,
      tenantName: undefined,
    };
  } else {
    const tenant = await resolveTenantFromHeaders(context.headers);
    if (tenant) {
      tenantContext = {
        tenantId: tenant.tenantId,
        tenantName: tenant.name,
      };
    }
  }

  return await getAdcpCapabilities(tenantContext);
}

registerSkill("get_adcp_capabilities", getAdcpCapabilitiesHandler);
