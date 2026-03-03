/**
 * Admin routes barrel — registers every admin route plugin into the Fastify app.
 *
 * All admin routes live under packages/server/src/admin/routes/ but were never
 * wired into app.ts. This file collects them into a single Fastify plugin so
 * app.ts only needs one `app.register(adminRoutes)` call.
 */
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import adminRootRoute from "./core/adminRoot.js";

// Auth
import loginRoute from "./auth/login.js";
import logoutRoute from "./auth/logout.js";
import testAuthRoute from "./auth/testAuth.js";
import googleStartRoute from "./auth/googleStart.js";
import googleCallbackRoute from "./auth/googleCallback.js";
import gamOauthRoute from "./auth/gamOauth.js";
import selectTenantRoute from "./auth/selectTenant.js";
import tenantLoginRoute from "./auth/tenantLogin.js";

// OIDC
import oidcConfigRoute from "./oidc/config.js";
import oidcEnableDisableRoute from "./oidc/enableDisable.js";
import oidcFlowRoute from "./oidc/flow.js";

// Public (no auth required)
import signupRoute from "./public/signup.js";
import onboardingRoute from "./public/onboarding.js";

// Tenants
import dashboardRoute from "./tenants/dashboard.js";
import createTenantRoute from "./tenants/createTenant.js";
import deactivateTenantRoute from "./tenants/deactivate.js";
import reactivateTenantRoute from "./tenants/reactivate.js";
import faviconRoute from "./tenants/favicon.js";
import mediaBuysListRoute from "./tenants/mediaBuysList.js";
import setupChecklistRoute from "./tenants/setupChecklist.js";

// Settings
import generalSettingsRoute from "./settings/general.js";
import aiSettingsRoute from "./settings/ai.js";
import aiTestRoute from "./settings/aiTest.js";
import adapterSettingsRoute from "./settings/adapter.js";
import domainsSettingsRoute from "./settings/domains.js";
import slackSettingsRoute from "./settings/slack.js";
import approximatedSettingsRoute from "./settings/approximated.js";
import tenantManagementSettingsRoute from "./settings/tenantManagementSettings.js";

// Adapters
import adapterConfigRoute from "./adapters/adapterConfig.js";
import gamConfigRoute from "./adapters/gamConfig.js";
import broadstreetRoute from "./adapters/broadstreet.js";
import capabilitiesRoute from "./adapters/capabilities.js";
import inventorySchemaRoute from "./adapters/inventorySchema.js";
import mockConfigRoute from "./adapters/mockConfig.js";
import mockConnectionConfigRoute from "./adapters/mockConnectionConfig.js";

// GAM
import detectConfigureRoute from "./gam/detectConfigure.js";
import lineItemRoute from "./gam/lineItem.js";
import serviceAccountRoute from "./gam/serviceAccount.js";
import syncStatusRoute from "./gam/syncStatus.js";
import customTargetingRoute from "./gam/customTargeting.js";

// GAM Inventory
import productInventoryRoute from "./gamInventory/productInventory.js";
import syncTreeRoute from "./gamInventory/syncTree.js";
import targetingRoute from "./gamInventory/targeting.js";

// GAM Reporting
import gamReportingBaseRoute from "./gamReporting/base.js";
import gamReportingBreakdownRoute from "./gamReporting/breakdown.js";
import gamReportingPrincipalRoute from "./gamReporting/principal.js";

// Principals
import principalsApiRoute from "./principals/principalsApi.js";
import principalsCrudRoute from "./principals/principalsCrud.js";
import principalGamApiRoute from "./principals/principalGamApi.js";
import principalWebhooksRoute from "./principals/principalWebhooks.js";

// Products
import listProductsRoute from "./products/listProducts.js";
import addProductRoute from "./products/addProduct.js";
import editProductRoute from "./products/editProduct.js";
import deleteProductRoute from "./products/deleteProduct.js";
import productInventoryAdminRoute from "./products/productInventory.js";

// Properties
import propertiesApiListRoute from "./properties/propertiesApiList.js";
import propertiesCrudRoute from "./properties/propertiesCrud.js";
import propertyActionsRoute from "./properties/propertyActions.js";
import propertyTagsRoute from "./properties/propertyTags.js";

// Creatives
import analyzeCreativeRoute from "./creatives/analyzeCreative.js";
import creativePagesRoute from "./creatives/creativePages.js";
import reviewActionsRoute from "./creatives/reviewActions.js";

// Operations
import mediaBuyActionsRoute from "./operations/mediaBuyActions.js";
import mediaBuyDetailRoute from "./operations/mediaBuyDetail.js";
import reportingRoute from "./operations/reporting.js";
import webhooksRoute from "./operations/webhooks.js";

// Workflows
import workflowsListRoute from "./workflows/workflowsList.js";
import stepActionsRoute from "./workflows/stepActions.js";
import stepReviewRoute from "./workflows/stepReview.js";

// Policy
import policyActionsRoute from "./policy/policyActions.js";
import policyPagesRoute from "./policy/policyPages.js";

// Agents
import creativeAgentsRoute from "./agents/creativeAgents.js";
import signalsAgentsRoute from "./agents/signalsAgents.js";

// Inventory profiles
import profilesApiRoute from "./inventoryProfiles/profilesApi.js";
import profilesCrudRoute from "./inventoryProfiles/profilesCrud.js";

// Sync, activity, logs, misc
import syncApiRoute from "./syncApi.js";
import activityRestRoute from "./activity/activityRest.js";
import activitySseRoute from "./activity/activitySse.js";
import processLogsRoute from "./logs/processLogsRoute.js";
import formatSearchRoute from "./formatSearch.js";
import publisherPartnersRoute from "./publisherPartners.js";
import tenantManagementApiRoute from "./tenantManagementApi.js";

// API sub-routes
import gamAdvertisersRoute from "./api/gamAdvertisers.js";
import productsListApiRoute from "./api/productsList.js";
import revenueChartRoute from "./api/revenueChart.js";

// Users
import domainsUserRoute from "./users/domains.js";
import listUsersRoute from "./users/listUsers.js";
import setupModeRoute from "./users/setupMode.js";
import userActionsRoute from "./users/userActions.js";

const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  await fastify.register(adminRootRoute);

  // Auth + session
  await fastify.register(loginRoute);
  await fastify.register(logoutRoute);
  await fastify.register(testAuthRoute);
  await fastify.register(googleStartRoute);
  await fastify.register(googleCallbackRoute);
  await fastify.register(gamOauthRoute);
  await fastify.register(selectTenantRoute);
  await fastify.register(tenantLoginRoute);

  // OIDC
  await fastify.register(oidcConfigRoute);
  await fastify.register(oidcEnableDisableRoute);
  await fastify.register(oidcFlowRoute);

  // Public
  await fastify.register(signupRoute);
  await fastify.register(onboardingRoute);

  // Tenants
  await fastify.register(dashboardRoute);
  await fastify.register(createTenantRoute);
  await fastify.register(deactivateTenantRoute);
  await fastify.register(reactivateTenantRoute);
  await fastify.register(faviconRoute);
  await fastify.register(mediaBuysListRoute);
  await fastify.register(setupChecklistRoute);

  // Settings
  await fastify.register(generalSettingsRoute);
  await fastify.register(aiSettingsRoute);
  await fastify.register(aiTestRoute);
  await fastify.register(adapterSettingsRoute);
  await fastify.register(domainsSettingsRoute);
  await fastify.register(slackSettingsRoute);
  await fastify.register(approximatedSettingsRoute);
  await fastify.register(tenantManagementSettingsRoute);

  // Adapters
  await fastify.register(adapterConfigRoute);
  await fastify.register(gamConfigRoute);
  await fastify.register(broadstreetRoute);
  await fastify.register(capabilitiesRoute);
  await fastify.register(inventorySchemaRoute);
  await fastify.register(mockConfigRoute);
  await fastify.register(mockConnectionConfigRoute);

  // GAM
  await fastify.register(detectConfigureRoute);
  await fastify.register(lineItemRoute);
  await fastify.register(serviceAccountRoute);
  await fastify.register(syncStatusRoute);
  await fastify.register(customTargetingRoute);

  // GAM Inventory
  await fastify.register(productInventoryRoute);
  await fastify.register(syncTreeRoute);
  await fastify.register(targetingRoute);

  // GAM Reporting
  await fastify.register(gamReportingBaseRoute);
  await fastify.register(gamReportingBreakdownRoute);
  await fastify.register(gamReportingPrincipalRoute);

  // Principals
  await fastify.register(principalsApiRoute);
  await fastify.register(principalsCrudRoute);
  await fastify.register(principalGamApiRoute);
  await fastify.register(principalWebhooksRoute);

  // Products
  await fastify.register(listProductsRoute);
  await fastify.register(addProductRoute);
  await fastify.register(editProductRoute);
  await fastify.register(deleteProductRoute);
  await fastify.register(productInventoryAdminRoute);

  // Properties
  await fastify.register(propertiesApiListRoute);
  await fastify.register(propertiesCrudRoute);
  await fastify.register(propertyActionsRoute);
  await fastify.register(propertyTagsRoute);

  // Creatives
  await fastify.register(analyzeCreativeRoute);
  await fastify.register(creativePagesRoute);
  await fastify.register(reviewActionsRoute);

  // Operations
  await fastify.register(mediaBuyActionsRoute);
  await fastify.register(mediaBuyDetailRoute);
  await fastify.register(reportingRoute);
  await fastify.register(webhooksRoute);

  // Workflows
  await fastify.register(workflowsListRoute);
  await fastify.register(stepActionsRoute);
  await fastify.register(stepReviewRoute);

  // Policy
  await fastify.register(policyActionsRoute);
  await fastify.register(policyPagesRoute);

  // Agents
  await fastify.register(creativeAgentsRoute);
  await fastify.register(signalsAgentsRoute);

  // Inventory profiles
  await fastify.register(profilesApiRoute);
  await fastify.register(profilesCrudRoute);

  // Sync, activity, misc
  await fastify.register(syncApiRoute);
  await fastify.register(activityRestRoute);
  await fastify.register(activitySseRoute);
  await fastify.register(processLogsRoute);
  await fastify.register(formatSearchRoute);
  await fastify.register(publisherPartnersRoute);
  // Tenant management API — prefix mirrors legacy Blueprint url_prefix="/api/v1/tenant-management"
  await fastify.register(tenantManagementApiRoute, { prefix: "/api/v1/tenant-management" });

  // API sub-routes
  await fastify.register(gamAdvertisersRoute);
  await fastify.register(productsListApiRoute);
  await fastify.register(revenueChartRoute);

  // Users
  await fastify.register(domainsUserRoute);
  await fastify.register(listUsersRoute);
  await fastify.register(setupModeRoute);
  await fastify.register(userActionsRoute);
};

export default adminRoutes;
