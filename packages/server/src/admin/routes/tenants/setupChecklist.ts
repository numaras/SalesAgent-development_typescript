import { and, count, eq, isNotNull } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";

import { db } from "../../../db/client.js";
import { adapterConfigs } from "../../../db/schema/adapterConfigs.js";
import { authorizedProperties } from "../../../db/schema/authorizedProperties.js";
import { currencyLimits } from "../../../db/schema/currencyLimits.js";
import { gamInventory } from "../../../db/schema/gamInventory.js";
import { principals } from "../../../db/schema/principals.js";
import { products } from "../../../db/schema/products.js";
import { publisherPartners } from "../../../db/schema/publisherPartners.js";
import { tenants } from "../../../db/schema/tenants.js";
import { tenantAuthConfigs } from "../../../db/schema/users.js";
import { requireTenantAccess } from "../../services/authGuard.js";

interface SetupTask {
  key: string;
  name: string;
  description: string;
  is_complete: boolean;
  action_url: string | null;
  details: string | null;
}

function isMultiTenantMode(): boolean {
  return process.env["ADCP_MULTI_TENANT"]?.toLowerCase() === "true";
}

function isGamTenant(adServer: string | null | undefined): boolean {
  return adServer === "google_ad_manager";
}

function buildCriticalTasks(
  tenantId: string,
  adServer: string | null | undefined,
  oidcEnabled: boolean,
  authSetupMode: boolean,
  currencyCount: number,
  propertyCount: number,
  verifiedPublisherCount: number,
  gamInventoryCount: number,
  productCount: number,
  principalCount: number,
): SetupTask[] {
  const tasks: SetupTask[] = [];

  const adServerSelected = Boolean(adServer);
  let adServerFullyConfigured = false;
  let configDetails = "No ad server configured";

  if (adServerSelected) {
    if (isGamTenant(adServer)) {
      adServerFullyConfigured = true;
      configDetails = "GAM configured - Test connection to verify";
    } else if (adServer === "mock") {
      if (process.env["ADCP_TESTING"] === "true") {
        adServerFullyConfigured = true;
        configDetails = "Mock adapter configured (test mode)";
      } else {
        adServerFullyConfigured = false;
        configDetails = "Mock adapter - Configure a real ad server for production";
      }
    } else if (adServer === "kevel" || adServer === "triton") {
      adServerFullyConfigured = true;
      configDetails = `${adServer} adapter configured`;
    } else {
      adServerFullyConfigured = true;
      configDetails = `${adServer} adapter - verify configuration`;
    }
  }

  tasks.push({
    key: "ad_server_connected",
    name: "⚠️ Ad Server Configuration",
    description: "BLOCKER: Configure and test ad server connection before proceeding with other setup",
    is_complete: adServerFullyConfigured,
    action_url: `/tenant/${tenantId}/settings#adserver`,
    details: configDetails,
  });

  if (!isMultiTenantMode()) {
    const ssoEnabled = oidcEnabled;
    const setupModeDisabled = !authSetupMode;
    const ssoDetails =
      ssoEnabled && setupModeDisabled
        ? "SSO enabled and setup mode disabled"
        : ssoEnabled
          ? "SSO enabled but setup mode still active"
          : "SSO not configured";
    tasks.push({
      key: "sso_configuration",
      name: "⚠️ Single Sign-On (SSO)",
      description: "CRITICAL: Configure SSO and disable setup mode for production security",
      is_complete: ssoEnabled && setupModeDisabled,
      action_url: `/tenant/${tenantId}/users`,
      details: ssoDetails,
    });
  }

  if (adServerFullyConfigured) {
    tasks.push({
      key: "currency_limits",
      name: "Currency Configuration",
      description: "At least one currency must be configured for media buys",
      is_complete: currencyCount > 0,
      action_url: `/tenant/${tenantId}/settings#business-rules`,
      details: currencyCount > 0 ? `${currencyCount} currencies configured` : "No currencies configured",
    });
  }

  const propertiesDetails =
    propertyCount > 0
      ? `${propertyCount} properties from ${verifiedPublisherCount} verified publishers`
      : "Add publishers and sync to discover properties";
  tasks.push({
    key: "authorized_properties",
    name: "Authorized Properties",
    description: "Configure properties with adagents.json for verification",
    is_complete: propertyCount > 0,
    action_url: `/tenant/${tenantId}/inventory#publishers-pane`,
    details: propertiesDetails,
  });

  if (adServerFullyConfigured) {
    if (isGamTenant(adServer)) {
      tasks.push({
        key: "inventory_synced",
        name: "Inventory Sync",
        description: "Sync ad units and placements from ad server",
        is_complete: gamInventoryCount > 0,
        action_url: `/tenant/${tenantId}/settings#inventory`,
        details:
          gamInventoryCount > 0
            ? `${gamInventoryCount.toLocaleString()} inventory items synced`
            : "No inventory synced from ad server",
      });
    } else if (adServer === "kevel" || adServer === "triton") {
      const label = adServer.charAt(0).toUpperCase() + adServer.slice(1);
      tasks.push({
        key: "inventory_synced",
        name: "Inventory Configuration",
        description: `${label} adapter - inventory configured per product`,
        is_complete: true,
        action_url: null,
        details: `${label} adapter configures inventory targeting at product level`,
      });
    } else {
      tasks.push({
        key: "inventory_synced",
        name: "Inventory Configuration",
        description: `${adServer} adapter - inventory configured per product`,
        is_complete: true,
        action_url: null,
        details: `${adServer} adapter configures inventory targeting at product level`,
      });
    }

    tasks.push({
      key: "products_created",
      name: "Products",
      description: "Create at least one advertising product",
      is_complete: productCount > 0,
      action_url: `/tenant/${tenantId}/products`,
      details: productCount > 0 ? `${productCount} products created` : "No products created",
    });
  }

  tasks.push({
    key: "principals_created",
    name: "Advertisers (Principals)",
    description: "Create principals for advertisers who will buy inventory",
    is_complete: principalCount > 0,
    action_url: `/tenant/${tenantId}/settings#advertisers`,
    details:
      principalCount > 0 ? `${principalCount} advertisers configured` : "No advertisers configured",
  });

  return tasks;
}

function buildRecommendedTasks(
  tenantId: string,
  tenantName: string,
  tenantId2: string,
  autoApproveFormatIds: string[] | null | undefined,
  lineItemNameTemplate: string | null | undefined,
  budgetLimitCount: number,
  slackWebhookUrl: string | null | undefined,
  virtualHost: string | null | undefined,
  axeIncludeKey: string | null | undefined,
  axeExcludeKey: string | null | undefined,
  axeMacroKey: string | null | undefined,
): SetupTask[] {
  const tasks: SetupTask[] = [];

  const defaultNames = new Set(["default", "Test Sales Agent", "My Sales Agent", "Demo Sales Agent"]);
  const hasCustomName = Boolean(
    tenantName && !defaultNames.has(tenantName) && tenantName !== tenantId2,
  );
  tasks.push({
    key: "tenant_name",
    name: "Account Name",
    description: "Set a display name for your sales agent",
    is_complete: hasCustomName,
    action_url: `/tenant/${tenantId}/settings#account`,
    details: hasCustomName ? `Using '${tenantName}'` : "Using default name",
  });

  const hasApprovalConfig = Boolean(autoApproveFormatIds && autoApproveFormatIds.length > 0);
  tasks.push({
    key: "creative_approval_guidelines",
    name: "Creative Approval Guidelines",
    description: "Configure auto-approval rules and manual review settings",
    is_complete: hasApprovalConfig,
    action_url: `/tenant/${tenantId}/settings#business-rules`,
    details: hasApprovalConfig ? "Auto-approval formats configured" : "Using default (manual review required)",
  });

  const hasCustomNaming = Boolean(lineItemNameTemplate);
  tasks.push({
    key: "naming_conventions",
    name: "Naming Conventions",
    description: "Customize order and line item naming templates",
    is_complete: hasCustomNaming,
    action_url: `/tenant/${tenantId}/settings#business-rules`,
    details: hasCustomNaming ? "Custom templates configured" : "Using default naming templates",
  });

  const hasBudgetLimits = budgetLimitCount > 0;
  tasks.push({
    key: "budget_controls",
    name: "Budget Controls",
    description: "Set maximum daily budget limits for safety",
    is_complete: hasBudgetLimits,
    action_url: `/tenant/${tenantId}/settings#business-rules`,
    details: hasBudgetLimits
      ? `${budgetLimitCount} currency limit(s) with daily budget controls`
      : "Budget limits can be set per currency",
  });

  const axeKeysConfigured = Boolean(axeIncludeKey && axeExcludeKey && axeMacroKey);
  const axeConfiguredCount = [axeIncludeKey, axeExcludeKey, axeMacroKey].filter(Boolean).length;
  tasks.push({
    key: "axe_segment_keys",
    name: "AXE Segment Keys",
    description:
      "Configure custom targeting keys for AXE audience segments (recommended for AdCP compliance)",
    is_complete: axeKeysConfigured,
    action_url: `/tenant/${tenantId}/targeting`,
    details: axeKeysConfigured
      ? `Include: ${axeIncludeKey}, Exclude: ${axeExcludeKey}, Macro: ${axeMacroKey}`
      : `Configure all three keys: include, exclude, macro (${axeConfiguredCount}/3 configured)`,
  });

  const slackConfigured = Boolean(slackWebhookUrl);
  tasks.push({
    key: "slack_integration",
    name: "Slack Integration",
    description: "Configure Slack webhooks for order notifications",
    is_complete: slackConfigured,
    action_url: `/tenant/${tenantId}/settings#integrations`,
    details: slackConfigured ? "Slack notifications enabled" : "No Slack integration",
  });

  const hasCustomDomain = Boolean(virtualHost);
  tasks.push({
    key: "tenant_cname",
    name: "Custom Domain (CNAME)",
    description: "Configure custom domain for your sales agent",
    is_complete: hasCustomDomain,
    action_url: `/tenant/${tenantId}/settings#account`,
    details: hasCustomDomain ? `Using ${virtualHost}` : "Using default subdomain",
  });

  return tasks;
}

function buildOptionalTasks(
  tenantId: string,
  oidcEnabled: boolean,
  authSetupMode: boolean,
  enableAxeSignals: boolean,
  geminiApiKey: string | null | undefined,
  currencyCount: number,
): SetupTask[] {
  const tasks: SetupTask[] = [];

  if (isMultiTenantMode()) {
    const ssoEnabled = oidcEnabled;
    const setupModeDisabled = !authSetupMode;
    const ssoDetails =
      ssoEnabled && setupModeDisabled
        ? "SSO enabled and setup mode disabled"
        : ssoEnabled
          ? "SSO enabled but setup mode still active"
          : "SSO not configured";
    tasks.push({
      key: "sso_configuration",
      name: "Single Sign-On (SSO)",
      description: "Configure tenant-specific SSO authentication",
      is_complete: ssoEnabled && setupModeDisabled,
      action_url: `/tenant/${tenantId}/users`,
      details: ssoDetails,
    });
  }

  tasks.push({
    key: "signals_agent",
    name: "Signals Discovery Agent",
    description: "Enable AXE signals for advanced targeting",
    is_complete: Boolean(enableAxeSignals),
    action_url: `/tenant/${tenantId}/settings#integrations`,
    details: enableAxeSignals ? "AXE signals enabled" : "AXE signals not configured",
  });

  const geminiConfigured = Boolean(geminiApiKey);
  tasks.push({
    key: "gemini_api_key",
    name: "Gemini AI Features",
    description: "Enable AI-assisted product recommendations and creative policy checks",
    is_complete: geminiConfigured,
    action_url: `/tenant/${tenantId}/settings#integrations`,
    details: geminiConfigured
      ? "AI features enabled"
      : "Optional: Configure Gemini API key for AI features",
  });

  const multipleCurrencies = currencyCount > 1;
  tasks.push({
    key: "multiple_currencies",
    name: "Multiple Currencies",
    description: "Support international advertisers with EUR, GBP, etc.",
    is_complete: multipleCurrencies,
    action_url: `/tenant/${tenantId}/settings#business-rules`,
    details: multipleCurrencies ? `${currencyCount} currencies supported` : "Only 1 currency configured",
  });

  return tasks;
}

const setupChecklistRoute: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get("/tenant/:id/setup-checklist", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!(await requireTenantAccess(request, reply, id))) return;

    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        name: tenants.name,
        adServer: tenants.adServer,
        slackWebhookUrl: tenants.slackWebhookUrl,
        virtualHost: tenants.virtualHost,
        autoApproveFormatIds: tenants.autoApproveFormatIds,
        lineItemNameTemplate: tenants.lineItemNameTemplate,
        geminiApiKey: tenants.geminiApiKey,
        enableAxeSignals: tenants.enableAxeSignals,
        authSetupMode: tenants.authSetupMode,
      })
      .from(tenants)
      .where(eq(tenants.tenantId, id))
      .limit(1);

    if (!tenant) {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    const [oidc] = await db
      .select({
        oidcEnabled: tenantAuthConfigs.oidcEnabled,
        oidcClientId: tenantAuthConfigs.oidcClientId,
      })
      .from(tenantAuthConfigs)
      .where(eq(tenantAuthConfigs.tenantId, id))
      .limit(1);

    const [adapterCfg] = await db
      .select({
        axeIncludeKey: adapterConfigs.axeIncludeKey,
        axeExcludeKey: adapterConfigs.axeExcludeKey,
        axeMacroKey: adapterConfigs.axeMacroKey,
      })
      .from(adapterConfigs)
      .where(eq(adapterConfigs.tenantId, id))
      .limit(1);

    const [{ currencyCount }] = await db
      .select({ currencyCount: count() })
      .from(currencyLimits)
      .where(eq(currencyLimits.tenantId, id));

    const [{ budgetLimitCount }] = await db
      .select({ budgetLimitCount: count() })
      .from(currencyLimits)
      .where(and(eq(currencyLimits.tenantId, id), isNotNull(currencyLimits.maxDailyPackageSpend)));

    const [{ propertyCount }] = await db
      .select({ propertyCount: count() })
      .from(authorizedProperties)
      .where(eq(authorizedProperties.tenantId, id));

    const [{ verifiedPublisherCount }] = await db
      .select({ verifiedPublisherCount: count() })
      .from(publisherPartners)
      .where(and(eq(publisherPartners.tenantId, id), eq(publisherPartners.isVerified, true)));

    const [{ gamInventoryCount }] = await db
      .select({ gamInventoryCount: count() })
      .from(gamInventory)
      .where(eq(gamInventory.tenantId, id));

    const [{ productCount }] = await db
      .select({ productCount: count() })
      .from(products)
      .where(eq(products.tenantId, id));

    const [{ principalCount }] = await db
      .select({ principalCount: count() })
      .from(principals)
      .where(eq(principals.tenantId, id));

    const oidcEnabled = Boolean(oidc?.oidcEnabled);
    const authSetupMode = Boolean(tenant.authSetupMode);

    const criticalTasks = buildCriticalTasks(
      id,
      tenant.adServer,
      oidcEnabled,
      authSetupMode,
      currencyCount,
      propertyCount,
      verifiedPublisherCount,
      gamInventoryCount,
      productCount,
      principalCount,
    );

    const recommendedTasks = buildRecommendedTasks(
      id,
      tenant.name,
      tenant.tenantId,
      tenant.autoApproveFormatIds,
      tenant.lineItemNameTemplate,
      budgetLimitCount,
      tenant.slackWebhookUrl,
      tenant.virtualHost,
      adapterCfg?.axeIncludeKey,
      adapterCfg?.axeExcludeKey,
      adapterCfg?.axeMacroKey,
    );

    const optionalTasks = buildOptionalTasks(
      id,
      oidcEnabled,
      authSetupMode,
      tenant.enableAxeSignals,
      tenant.geminiApiKey,
      currencyCount,
    );

    const allTasks = [...criticalTasks, ...recommendedTasks, ...optionalTasks];
    const completedCount = allTasks.filter((t) => t.is_complete).length;
    const totalCount = allTasks.length;
    const progressPercent = totalCount > 0 ? Math.floor((completedCount / totalCount) * 100) : 0;
    const readyForOrders = criticalTasks.every((t) => t.is_complete);

    const setup_status = {
      progress_percent: progressPercent,
      completed_count: completedCount,
      total_count: totalCount,
      ready_for_orders: readyForOrders,
      critical: criticalTasks,
      recommended: recommendedTasks,
      optional: optionalTasks,
    };

    return reply.send({
      tenant: {
        tenant_id: tenant.tenantId,
        name: tenant.name,
      },
      tenant_id: id,
      setup_status,
    });
  });
};

export default setupChecklistRoute;
