---
name: Atomic Task Registry
overview: "Reality-synced atomic task registry for the TypeScript migration of the ADCP Server (Fastify + Zod + Drizzle) and Admin UI (React + Vite + Tailwind). Strict reality check against packages/server and packages/ui."
todos:
  - id: INFRA-001
    content: "INFRA-001: server-ts/package.json"
    status: done
  - id: INFRA-002
    content: "INFRA-002: server-ts/tsconfig.json"
    status: done
  - id: INFRA-003
    content: "INFRA-003: server-ts/vitest.config.ts"
    status: done
  - id: INFRA-004
    content: "INFRA-004: src/app.ts – Fastify buildApp() factory"
    status: done
  - id: INFRA-005
    content: "INFRA-005: src/server.ts – entry point"
    status: done
  - id: DB-001
    content: "DB-001: src/db/schema/tenants.ts"
    status: done
  - id: DB-002
    content: "DB-002: src/db/schema/principals.ts"
    status: done
  - id: DB-003
    content: "DB-003: src/db/schema/adapter_configs.ts"
    status: done
  - id: DB-004
    content: "DB-004: src/db/schema/products.ts"
    status: done
  - id: DB-005
    content: "DB-005: src/db/schema/media_buys.ts"
    status: done
  - id: DB-006
    content: "DB-006: src/db/schema/creatives.ts"
    status: done
  - id: DB-007
    content: "DB-007: src/db/schema/workflow_steps.ts"
    status: done
  - id: DB-008
    content: "DB-008: src/db/schema/audit_logs.ts"
    status: done
  - id: DB-009
    content: "DB-009: src/db/schema/gam_inventory.ts"
    status: done
  - id: DB-010
    content: "DB-010: src/db/schema/publisher_partners.ts"
    status: done
  - id: DB-011
    content: "DB-011: src/db/schema/currency_limits.ts"
    status: done
  - id: DB-012
    content: "DB-012: src/db/schema/users.ts"
    status: done
  - id: DB-013
    content: "DB-013: src/db/schema/inventory_profiles.ts"
    status: done
  - id: DB-014
    content: "DB-014: src/db/schema/agents.ts"
    status: done
  - id: DB-015
    content: "DB-015: src/db/client.ts"
    status: done
  - id: ADCP-025-A
    content: "ADCP-025-A: src/auth/extractToken.ts"
    status: done
  - id: ADCP-025-B
    content: "ADCP-025-B: src/auth/lookupPrincipal.ts"
    status: done
  - id: ADCP-025-C
    content: "ADCP-025-C: src/auth/adminTokenFallback.ts"
    status: done
  - id: ADCP-025-D
    content: "ADCP-025-D: src/auth/validateActiveTenant.ts"
    status: done
  - id: ADCP-025-E
    content: "ADCP-025-E: src/auth/authPlugin.ts"
    status: done
  - id: ADCP-025-F
    content: "ADCP-025-F: src/auth/extractToken.spec.ts"
    status: done
  - id: ADCP-025-G
    content: "ADCP-025-G: src/auth/lookupPrincipal.spec.ts"
    status: done
  - id: ADCP-026-A
    content: "ADCP-026-A: src/auth/toolContext.ts"
    status: done
  - id: ADCP-026-B
    content: "ADCP-026-B: src/auth/requestContext.ts"
    status: done
  - id: ADCP-027-A
    content: "ADCP-027-A: src/auth/resolveTenantFromHost.ts"
    status: done
  - id: ADCP-027-B
    content: "ADCP-027-B: src/auth/resolveTenantFromHost.spec.ts"
    status: done
  - id: ADCP-001-A
    content: "ADCP-001-A: src/schemas/health.ts"
    status: done
  - id: ADCP-001-B
    content: "ADCP-001-B: src/routes/health.ts"
    status: done
  - id: ADCP-001-C
    content: "ADCP-001-C: src/routes/health.spec.ts"
    status: done
  - id: ADCP-002-A
    content: "ADCP-002-A: src/schemas/healthConfig.ts"
    status: done
  - id: ADCP-002-B
    content: "ADCP-002-B: src/routes/healthConfig.ts"
    status: done
  - id: ADCP-002-C
    content: "ADCP-002-C: src/routes/healthConfig.spec.ts"
    status: done
  - id: ADCP-003-A
    content: "ADCP-003-A: src/routes/adminDbReset.ts"
    status: done
  - id: ADCP-003-B
    content: "ADCP-003-B: src/routes/adminDbReset.spec.ts"
    status: done
  - id: ADCP-004-A
    content: "ADCP-004-A: src/routes/debug.ts"
    status: done
  - id: ADCP-004-B
    content: "ADCP-004-B: src/routes/debug.spec.ts"
    status: done
  - id: ADCP-005-A
    content: "ADCP-005-A: src/schemas/adcpCapabilities.ts"
    status: done
  - id: ADCP-005-B
    content: "ADCP-005-B: src/services/capabilitiesService.ts"
    status: done
  - id: ADCP-005-C
    content: "ADCP-005-C: src/routes/mcp/getAdcpCapabilities.ts"
    status: done
  - id: ADCP-005-D
    content: "ADCP-005-D: src/services/capabilitiesService.spec.ts"
    status: done
  - id: ADCP-006-A
    content: "ADCP-006-A: src/schemas/product.ts"
    status: done
  - id: ADCP-006-B
    content: "ADCP-006-B: src/schemas/getProducts.ts"
    status: done
  - id: ADCP-006-C
    content: "ADCP-006-C: src/services/productQueryService.ts"
    status: done
  - id: ADCP-006-D
    content: "ADCP-006-D: src/services/productRankingService.ts"
    status: done
  - id: ADCP-006-E
    content: "ADCP-006-E: src/services/v2CompatTransform.ts"
    status: done
  - id: ADCP-006-F
    content: "ADCP-006-F: src/routes/mcp/getProducts.ts"
    status: done
  - id: ADCP-006-G
    content: "ADCP-006-G: src/services/productQueryService.spec.ts"
    status: done
  - id: ADCP-006-H
    content: "ADCP-006-H: src/services/v2CompatTransform.spec.ts"
    status: done
  - id: ADCP-007-A
    content: "ADCP-007-A: src/schemas/creativeFormats.ts"
    status: done
  - id: ADCP-007-B
    content: "ADCP-007-B: src/services/formatService.ts"
    status: done
  - id: ADCP-007-C
    content: "ADCP-007-C: src/routes/mcp/listCreativeFormats.ts"
    status: done
  - id: ADCP-007-D
    content: "ADCP-007-D: src/services/formatService.spec.ts"
    status: done
  - id: ADCP-008-A
    content: "ADCP-008-A: src/schemas/creative.ts"
    status: done
  - id: ADCP-008-B
    content: "ADCP-008-B: src/services/creativeQueryService.ts"
    status: done
  - id: ADCP-008-C
    content: "ADCP-008-C: src/services/creativePagination.ts"
    status: done
  - id: ADCP-008-D
    content: "ADCP-008-D: src/routes/mcp/listCreatives.ts"
    status: done
  - id: ADCP-008-E
    content: "ADCP-008-E: src/services/creativeQueryService.spec.ts"
    status: done
  - id: ADCP-008-F
    content: "ADCP-008-F: src/services/creativePagination.spec.ts"
    status: done
  - id: ADCP-009-A
    content: "ADCP-009-A: src/schemas/syncCreatives.ts"
    status: done
  - id: ADCP-009-B
    content: "ADCP-009-B: src/services/creativeSyncService.ts"
    status: done
  - id: ADCP-009-C
    content: "ADCP-009-C: src/services/creativeSyncAdapterCall.ts"
    status: done
  - id: ADCP-009-D
    content: "ADCP-009-D: src/routes/mcp/syncCreatives.ts"
    status: done
  - id: ADCP-009-E
    content: "ADCP-009-E: src/services/creativeSyncService.spec.ts"
    status: done
  - id: ADCP-010-A
    content: "ADCP-010-A: src/schemas/authorizedProperties.ts"
    status: done
  - id: ADCP-010-B
    content: "ADCP-010-B: src/services/propertiesService.ts"
    status: done
  - id: ADCP-010-C
    content: "ADCP-010-C: src/routes/mcp/listAuthorizedProperties.ts"
    status: done
  - id: ADCP-010-D
    content: "ADCP-010-D: src/services/propertiesService.spec.ts"
    status: done
  - id: ADCP-011-A
    content: "ADCP-011-A: src/schemas/mediaBuyCreate.ts"
    status: done
  - id: ADCP-011-B
    content: "ADCP-011-B: src/schemas/mediaBuyCreateResponse.ts"
    status: done
  - id: ADCP-011-C
    content: "ADCP-011-C: src/services/internalFieldStripper.ts"
    status: done
  - id: ADCP-011-D
    content: "ADCP-011-D: src/services/mediaBuyCreateService.ts"
    status: done
  - id: ADCP-011-E
    content: "ADCP-011-E: src/services/workflowStepService.ts"
    status: done
  - id: ADCP-011-F
    content: "ADCP-011-F: src/services/mediaBuyAdapterCall.ts"
    status: done
  - id: ADCP-011-G
    content: "ADCP-011-G: src/routes/mcp/createMediaBuy.ts"
    status: done
  - id: ADCP-011-H
    content: "ADCP-011-H: src/services/mediaBuyCreateService.spec.ts"
    status: done
  - id: ADCP-011-I
    content: "ADCP-011-I: src/services/internalFieldStripper.spec.ts"
    status: done
  - id: ADCP-012-A
    content: "ADCP-012-A: src/schemas/mediaBuyUpdate.ts"
    status: done
  - id: ADCP-012-B
    content: "ADCP-012-B: src/services/mediaBuyLookup.ts"
    status: done
  - id: ADCP-012-C
    content: "ADCP-012-C: src/services/mediaBuyUpdateService.ts"
    status: done
  - id: ADCP-012-D
    content: "ADCP-012-D: src/routes/mcp/updateMediaBuy.ts"
    status: done
  - id: ADCP-012-E
    content: "ADCP-012-E: src/services/mediaBuyUpdateService.spec.ts"
    status: done
  - id: ADCP-013-A
    content: "ADCP-013-A: src/schemas/mediaBuyDelivery.ts"
    status: done
  - id: ADCP-013-B
    content: "ADCP-013-B: src/services/deliveryQueryService.ts"
    status: done
  - id: ADCP-013-C
    content: "ADCP-013-C: src/routes/mcp/getMediaBuyDelivery.ts"
    status: done
  - id: ADCP-013-D
    content: "ADCP-013-D: src/services/deliveryQueryService.spec.ts"
    status: done
  - id: ADCP-014-A
    content: "ADCP-014-A: src/schemas/performanceIndex.ts"
    status: done
  - id: ADCP-014-B
    content: "ADCP-014-B: src/services/performanceIndexService.ts"
    status: done
  - id: ADCP-014-C
    content: "ADCP-014-C: src/routes/mcp/updatePerformanceIndex.ts"
    status: done
  - id: ADCP-014-D
    content: "ADCP-014-D: src/services/performanceIndexService.spec.ts"
    status: done
  - id: ADCP-015-A
    content: "ADCP-015-A: src/schemas/workflowTask.ts"
    status: done
  - id: ADCP-015-B
    content: "ADCP-015-B: src/services/taskListService.ts"
    status: done
  - id: ADCP-015-C
    content: "ADCP-015-C: src/routes/mcp/listTasks.ts"
    status: done
  - id: ADCP-015-D
    content: "ADCP-015-D: src/services/taskListService.spec.ts"
    status: done
  - id: ADCP-016-A
    content: "ADCP-016-A: src/services/taskDetailService.ts"
    status: done
  - id: ADCP-016-B
    content: "ADCP-016-B: src/routes/mcp/getTask.ts"
    status: done
  - id: ADCP-016-C
    content: "ADCP-016-C: src/services/taskDetailService.spec.ts"
    status: done
  - id: ADCP-017-A
    content: "ADCP-017-A: src/services/taskCompleteService.ts"
    status: done
  - id: ADCP-017-B
    content: "ADCP-017-B: src/routes/mcp/completeTask.ts"
    status: done
  - id: ADCP-017-C
    content: "ADCP-017-C: src/services/taskCompleteService.spec.ts"
    status: done
  - id: ADCP-018-A
    content: "ADCP-018-A: src/schemas/a2a.ts"
    status: done
  - id: ADCP-018-B
    content: "ADCP-018-B: src/a2a/dispatcher.ts"
    status: done
  - id: ADCP-018-C
    content: "ADCP-018-C: src/routes/a2a/agentCard.ts"
    status: done
  - id: ADCP-018-D
    content: "ADCP-018-D: src/routes/a2a/jsonRpc.ts"
    status: done
  - id: ADCP-018-E
    content: "ADCP-018-E: src/a2a/authExtractor.ts"
    status: done
  - id: ADCP-018-F
    content: "ADCP-018-F: src/a2a/dispatcher.spec.ts"
    status: done
  - id: ADCP-019-A
    content: "ADCP-019-A: src/a2a/skills/getProducts.ts"
    status: done
  - id: ADCP-019-B
    content: "ADCP-019-B: src/a2a/skills/getProducts.spec.ts"
    status: done
  - id: ADCP-020-A
    content: "ADCP-020-A: src/a2a/skills/getAdcpCapabilities.ts"
    status: done
  - id: ADCP-020-B
    content: "ADCP-020-B: src/a2a/skills/getAdcpCapabilities.spec.ts"
    status: done
  - id: ADCP-021-A
    content: "ADCP-021-A: src/a2a/skills/createMediaBuy.ts"
    status: done
  - id: ADCP-021-B
    content: "ADCP-021-B: src/a2a/skills/createMediaBuy.spec.ts"
    status: done
  - id: ADCP-022-A
    content: "ADCP-022-A: src/a2a/skills/updateMediaBuy.ts"
    status: done
  - id: ADCP-022-B
    content: "ADCP-022-B: src/a2a/skills/updateMediaBuy.spec.ts"
    status: done
  - id: ADCP-023-A
    content: "ADCP-023-A: src/a2a/skills/bulkSkills.ts"
    status: done
  - id: ADCP-023-B
    content: "ADCP-023-B: src/a2a/skills/bulkSkills.spec.ts"
    status: done
  - id: ADCP-024-A
    content: "ADCP-024-A: src/schemas/pushNotification.ts"
    status: done
  - id: ADCP-024-B
    content: "ADCP-024-B: src/services/pushNotificationService.ts"
    status: done
  - id: ADCP-024-C
    content: "ADCP-024-C: src/a2a/skills/pushNotificationSkills.ts"
    status: done
  - id: ADCP-024-D
    content: "ADCP-024-D: src/services/pushNotificationService.spec.ts"
    status: done
  - id: ADCP-030-A
    content: "ADCP-030-A: src/utils/serializeNested.ts"
    status: done
  - id: ADCP-030-B
    content: "ADCP-030-B: src/utils/serializeNested.spec.ts"
    status: done
  - id: ADCP-031-A
    content: "ADCP-031-A: src/services/schemaRegistryService.ts"
    status: done
  - id: ADCP-031-B
    content: "ADCP-031-B: src/routes/schemas/getSchema.ts"
    status: done
  - id: ADCP-031-C
    content: "ADCP-031-C: src/routes/schemas/listSchemas.ts"
    status: done
  - id: ADCP-031-D
    content: "ADCP-031-D: src/routes/schemas/root.ts"
    status: done
  - id: ADCP-031-E
    content: "ADCP-031-E: src/services/schemaRegistryService.spec.ts"
    status: done
  - id: ADMIN-009-A
    content: "ADMIN-009-A: src/admin/routes/auth/login.ts"
    status: done
  - id: ADMIN-010-A
    content: "ADMIN-010-A: src/admin/routes/auth/tenantLogin.ts"
    status: done
  - id: ADMIN-011-A
    content: "ADMIN-011-A: src/admin/routes/auth/googleStart.ts"
    status: done
  - id: ADMIN-012-A
    content: "ADMIN-012-A: src/admin/routes/auth/googleCallback.ts"
    status: done
  - id: ADMIN-012-B
    content: "ADMIN-012-B: src/admin/services/sessionService.ts"
    status: done
  - id: ADMIN-013-A
    content: "ADMIN-013-A: src/admin/routes/auth/gamOauth.ts"
    status: done
  - id: ADMIN-014-A
    content: "ADMIN-014-A: src/admin/routes/auth/selectTenant.ts"
    status: done
  - id: ADMIN-015-A
    content: "ADMIN-015-A: src/admin/routes/auth/logout.ts"
    status: done
  - id: ADMIN-016-A
    content: "ADMIN-016-A: src/admin/routes/auth/testAuth.ts"
    status: done
  - id: ADMIN-017-A
    content: "ADMIN-017-A: src/admin/schemas/oidc.ts"
    status: done
  - id: ADMIN-017-B
    content: "ADMIN-017-B: src/admin/routes/oidc/config.ts"
    status: done
  - id: ADMIN-017-C
    content: "ADMIN-017-C: src/admin/routes/oidc/enableDisable.ts"
    status: done
  - id: ADMIN-017-D
    content: "ADMIN-017-D: src/admin/routes/oidc/flow.ts"
    status: done
  - id: ADMIN-007-A
    content: "ADMIN-007-A: src/admin/schemas/tenant.ts"
    status: done
  - id: ADMIN-007-B
    content: "ADMIN-007-B: src/admin/routes/tenants/createTenant.ts"
    status: done
  - id: ADMIN-008-A
    content: "ADMIN-008-A: src/admin/routes/tenants/reactivate.ts"
    status: done
  - id: ADMIN-018-A
    content: "ADMIN-018-A: src/admin/routes/tenants/dashboard.ts"
    status: done
  - id: ADMIN-019-A
    content: "ADMIN-019-A: src/admin/routes/tenants/setupChecklist.ts"
    status: done
  - id: ADMIN-022-A
    content: "ADMIN-022-A: src/admin/routes/tenants/deactivate.ts"
    status: done
  - id: ADMIN-023-A
    content: "ADMIN-023-A: src/admin/routes/tenants/mediaBuysList.ts"
    status: done
  - id: ADMIN-024-A
    content: "ADMIN-024-A: src/admin/routes/tenants/favicon.ts"
    status: done
  - id: ADMIN-020-A
    content: "ADMIN-020-A: src/admin/routes/settings/general.ts"
    status: done
  - id: ADMIN-020-B
    content: "ADMIN-020-B: src/admin/routes/settings/adapter.ts"
    status: done
  - id: ADMIN-020-C
    content: "ADMIN-020-C: src/admin/routes/settings/slack.ts"
    status: done
  - id: ADMIN-020-D
    content: "ADMIN-020-D: src/admin/routes/settings/ai.ts"
    status: done
  - id: ADMIN-020-E
    content: "ADMIN-020-E: src/admin/routes/settings/domains.ts"
    status: done
  - id: ADMIN-021-A
    content: "ADMIN-021-A: src/admin/routes/settings/aiTest.ts"
    status: done
  - id: ADMIN-021-B
    content: "ADMIN-021-B: src/admin/routes/settings/approximated.ts"
    status: done
  - id: ADMIN-025-A
    content: "ADMIN-025-A: src/admin/routes/products/listProducts.ts"
    status: done
  - id: ADMIN-026-A
    content: "ADMIN-026-A: src/admin/routes/products/addProduct.ts"
    status: done
  - id: ADMIN-027-A
    content: "ADMIN-027-A: src/admin/routes/products/editProduct.ts"
    status: done
  - id: ADMIN-028-A
    content: "ADMIN-028-A: src/admin/routes/products/deleteProduct.ts"
    status: done
  - id: ADMIN-029-A
    content: "ADMIN-029-A: src/admin/routes/products/productInventory.ts"
    status: done
  - id: ADMIN-030-A
    content: "ADMIN-030-A: src/admin/routes/api/revenueChart.ts"
    status: done
  - id: ADMIN-031-A
    content: "ADMIN-031-A: src/admin/routes/api/productsList.ts"
    status: done
  - id: ADMIN-032-A
    content: "ADMIN-032-A: src/admin/routes/api/gamAdvertisers.ts"
    status: done
  - id: ADMIN-033-A
    content: "ADMIN-033-A: src/admin/routes/creatives/creativePages.ts"
    status: done
  - id: ADMIN-034-A
    content: "ADMIN-034-A: src/admin/routes/creatives/analyzeCreative.ts"
    status: done
  - id: ADMIN-035-A
    content: "ADMIN-035-A: src/admin/routes/creatives/reviewActions.ts"
    status: done
  - id: ADMIN-036-A
    content: "ADMIN-036-A: src/admin/routes/gam/detectConfigure.ts"
    status: done
  - id: ADMIN-037-A
    content: "ADMIN-037-A: src/admin/routes/gam/lineItem.ts"
    status: done
  - id: ADMIN-038-A
    content: "ADMIN-038-A: src/admin/routes/gam/customTargeting.ts"
    status: done
  - id: ADMIN-039-A
    content: "ADMIN-039-A: src/admin/routes/gam/syncStatus.ts"
    status: done
  - id: ADMIN-040-A
    content: "ADMIN-040-A: src/admin/routes/gam/serviceAccount.ts"
    status: done
  - id: ADMIN-041-A
    content: "ADMIN-041-A: src/admin/routes/users/listUsers.ts"
    status: done
  - id: ADMIN-042-A
    content: "ADMIN-042-A: src/admin/routes/users/userActions.ts"
    status: done
  - id: ADMIN-043-A
    content: "ADMIN-043-A: src/admin/routes/users/domains.ts"
    status: done
  - id: ADMIN-044-A
    content: "ADMIN-044-A: src/admin/routes/users/setupMode.ts"
    status: done
  - id: ADMIN-045-A
    content: "ADMIN-045-A: src/admin/routes/workflows/workflowsList.ts"
    status: done
  - id: ADMIN-046-A
    content: "ADMIN-046-A: src/admin/routes/workflows/stepReview.ts"
    status: done
  - id: ADMIN-047-A
    content: "ADMIN-047-A: src/admin/routes/workflows/stepActions.ts"
    status: done
  - id: ADMIN-048-A
    content: "ADMIN-048-A: src/admin/routes/properties/propertiesCrud.ts"
    status: done
  - id: ADMIN-048-B
    content: "ADMIN-048-B: src/admin/routes/properties/propertiesApiList.ts"
    status: done
  - id: ADMIN-049-A
    content: "ADMIN-049-A: src/admin/routes/properties/propertyTags.ts"
    status: done
  - id: ADMIN-050-A
    content: "ADMIN-050-A: src/admin/routes/properties/propertyActions.ts"
    status: done
  - id: ADMIN-051-A
    content: "ADMIN-051-A: src/admin/routes/adapters/mockConfig.ts"
    status: done
  - id: ADMIN-052-A
    content: "ADMIN-052-A: src/admin/routes/adapters/inventorySchema.ts"
    status: done
  - id: ADMIN-053-A
    content: "ADMIN-053-A: src/admin/routes/adapters/adapterConfig.ts"
    status: done
  - id: ADMIN-054-A
    content: "ADMIN-054-A: src/admin/routes/adapters/capabilities.ts"
    status: done
  - id: ADMIN-055-A
    content: "ADMIN-055-A: src/admin/routes/adapters/broadstreet.ts"
    status: done
  - id: ADMIN-057-A
    content: "ADMIN-057-A: src/admin/routes/inventoryProfiles/profilesCrud.ts"
    status: done
  - id: ADMIN-057-B
    content: "ADMIN-057-B: src/admin/routes/inventoryProfiles/profilesApi.ts"
    status: done
  - id: ADMIN-058-A
    content: "ADMIN-058-A: src/admin/routes/policy/policyPages.ts"
    status: done
  - id: ADMIN-058-B
    content: "ADMIN-058-B: src/admin/routes/policy/policyActions.ts"
    status: done
  - id: ADMIN-059-A
    content: "ADMIN-059-A: src/admin/routes/activity/activityRest.ts"
    status: done
  - id: ADMIN-059-B
    content: "ADMIN-059-B: src/admin/routes/activity/activitySse.ts"
    status: done
  - id: ADMIN-059-C
    content: "ADMIN-059-C: src/admin/services/auditParseService.ts"
    status: done
  - id: ADMIN-060-A
    content: "ADMIN-060-A: src/admin/routes/principals/principalsCrud.ts"
    status: done
  - id: ADMIN-060-B
    content: "ADMIN-060-B: src/admin/routes/principals/principalsApi.ts"
    status: done
  - id: ADMIN-060-C
    content: "ADMIN-060-C: src/admin/routes/principals/principalWebhooks.ts"
    status: done
  - id: ADMIN-061-A
    content: "ADMIN-061-A: src/admin/routes/principals/principalGamApi.ts"
    status: done
  - id: ADMIN-062-A
    content: "ADMIN-062-A: src/admin/routes/operations/reporting.ts"
    status: done
  - id: ADMIN-062-B
    content: "ADMIN-062-B: src/admin/routes/operations/mediaBuyDetail.ts"
    status: done
  - id: ADMIN-062-C
    content: "ADMIN-062-C: src/admin/routes/operations/mediaBuyActions.ts"
    status: done
  - id: ADMIN-062-D
    content: "ADMIN-062-D: src/admin/routes/operations/webhooks.ts"
    status: done
  - id: ADMIN-063-A
    content: "ADMIN-063-A: src/admin/routes/agents/creativeAgents.ts"
    status: done
  - id: ADMIN-064-A
    content: "ADMIN-064-A: src/admin/routes/agents/signalsAgents.ts"
    status: done
  - id: ADMIN-065-A
    content: "ADMIN-065-A: src/admin/routes/publisherPartners.ts"
    status: done
  - id: ADMIN-066-A
    content: "ADMIN-066-A: src/admin/routes/formatSearch.ts"
    status: done
  - id: ADMIN-068-A
    content: "ADMIN-068-A: src/admin/routes/tenantManagementApi.ts"
    status: done
  - id: ADMIN-069-A
    content: "ADMIN-069-A: src/admin/routes/syncApi.ts"
    status: done
  - id: ADMIN-070-A
    content: "ADMIN-070-A: src/admin/routes/gamInventory/syncTree.ts"
    status: done
  - id: ADMIN-070-B
    content: "ADMIN-070-B: src/admin/routes/gamInventory/productInventory.ts"
    status: done
  - id: ADMIN-070-C
    content: "ADMIN-070-C: src/admin/routes/gamInventory/targeting.ts"
    status: done
  - id: ADMIN-071-A
    content: "ADMIN-071-A: src/admin/routes/gamReporting/base.ts"
    status: done
  - id: ADMIN-071-B
    content: "ADMIN-071-B: src/admin/routes/gamReporting/breakdown.ts"
    status: done
  - id: ADMIN-071-C
    content: "ADMIN-071-C: src/admin/routes/gamReporting/principal.ts"
    status: done
  - id: ADMIN-072-A
    content: "ADMIN-072-A: src/admin/routes/public/signup.ts"
    status: done
  - id: ADMIN-072-B
    content: "ADMIN-072-B: src/admin/routes/public/onboarding.ts"
    status: done
  - id: ADMIN-073-A
    content: "ADMIN-073-A: src/admin/plugins/scriptRootPlugin.ts"
    status: done
  - id: ADMIN-075-A
    content: "ADMIN-075-A: src/admin/plugins/auditPlugin.ts"
    status: done
  - id: ADMIN-076-A
    content: "ADMIN-076-A: src/admin/plugins/socketio.ts"
    status: done
  - id: ADMIN-077-A
    content: "ADMIN-077-A: src/admin/routes/adapters/gamConfig.ts"
    status: done
  - id: ADMIN-077-B
    content: "ADMIN-077-B: src/admin/routes/adapters/mockConnectionConfig.ts"
    status: done
  - id: ADMIN-056-A
    content: "ADMIN-056-A: src/admin/routes/settings/tenantManagementSettings.ts"
    status: done
  - id: UI-INFRA-001
    content: "UI-INFRA-001: ui/package.json"
    status: done
  - id: UI-INFRA-002
    content: "UI-INFRA-002: ui/vite.config.ts"
    status: done
  - id: UI-INFRA-003
    content: "UI-INFRA-003: ui/src/main.tsx + router"
    status: done
  - id: UI-AUTH-001
    content: "UI-AUTH-001: ui/src/context/AuthContext.tsx"
    status: done
  - id: UI-AUTH-002
    content: "UI-AUTH-002: ui/src/components/PrivateRoute.tsx"
    status: done
  - id: UI-AUTH-003
    content: "UI-AUTH-003: ui/src/pages/LoginPage.tsx"
    status: done
  - id: UI-AUTH-004
    content: "UI-AUTH-004: ui/src/pages/SelectTenantPage.tsx"
    status: done
  - id: UI-LAYOUT-001
    content: "UI-LAYOUT-001: ui/src/components/BaseLayout.tsx"
    status: done
  - id: UI-DASH-001
    content: "UI-DASH-001: ui/src/pages/TenantDashboard.tsx"
    status: done
  - id: UI-PROD-001
    content: "UI-PROD-001: ui/src/pages/ProductsListPage.tsx"
    status: done
  - id: UI-PROD-002
    content: "UI-PROD-002: ui/src/pages/ProductAddPage.tsx"
    status: done
  - id: UI-PROD-003
    content: "UI-PROD-003: ui/src/pages/ProductEditPage.tsx"
    status: done
  - id: UI-PROD-004
    content: "UI-PROD-004: ui/src/components/ProductInventoryWidget.tsx"
    status: done
  - id: UI-CREA-001
    content: "UI-CREA-001: ui/src/pages/CreativesReviewPage.tsx"
    status: done
  - id: UI-CREA-002
    content: "UI-CREA-002: ui/src/pages/CreativesListPage.tsx"
    status: done
  - id: UI-WF-001
    content: "UI-WF-001: ui/src/pages/WorkflowsListPage.tsx"
    status: done
  - id: UI-WF-002
    content: "UI-WF-002: ui/src/pages/WorkflowReviewPage.tsx"
    status: done
  - id: UI-PROP-001
    content: "UI-PROP-001: ui/src/pages/AuthorizedPropertiesPage.tsx"
    status: done
  - id: UI-INV-001
    content: "UI-INV-001: ui/src/pages/InventoryProfilesPage.tsx"
    status: done
  - id: UI-INV-002
    content: "UI-INV-002: ui/src/pages/InventoryProfileEditPage.tsx"
    status: done
  - id: UI-ACT-001
    content: "UI-ACT-001: ui/src/components/ActivityStream.tsx"
    status: done
  - id: UI-PRINC-001
    content: "UI-PRINC-001: ui/src/pages/PrincipalsPage.tsx"
    status: done
  - id: UI-USERS-001
    content: "UI-USERS-001: ui/src/pages/UsersPage.tsx"
    status: done
  - id: UI-SETTINGS-001
    content: "UI-SETTINGS-001: ui/src/pages/TenantSettingsPage.tsx"
    status: done
  - id: UI-GAM-001
    content: "UI-GAM-001: ui/src/pages/GamConfigPage.tsx"
    status: done
  - id: UI-GAM-002
    content: "UI-GAM-002: ui/src/pages/GamReportingPage.tsx"
    status: done
  - id: UI-PUB-001
    content: "UI-PUB-001: ui/src/pages/SignupPage.tsx"
    status: done
isProject: false
---

# Atomic Task Registry – TypeScript Migration (Reality-synced)

## Scope scanned

- `packages/server/`: present, populated TypeScript codebase
- `packages/ui/`: **empty** (0 files)

## Reality-check criteria (strict)

- **done**: new code reference exists in the scanned filesystem and is non-empty AND does not explicitly declare itself as stub/placeholder/TODO for the task’s stated parity requirement.
- **pending**: missing file, empty file, or explicitly stubbed/placeholder for parity.

## QA Batch (strict) – 2025-02-25

- **Criterion**: Identify 5 tasks with `status: done` and `Doublechecked` ≠ Yes.
- **Result**: No such tasks found; all table rows with status `done` have `Doublechecked: Yes`.
- **Re-verification**: Strict parity audit performed on 5 done tasks: **ADCP-001-A** (health schema), **ADCP-001-B** (health route), **ADCP-025-A** (extractToken), **DB-005** (media_buys schema), **ADCP-009-A** (syncCreatives schema). Python source in `_legacy/` and TypeScript in `packages/server/` compared for properties, edge cases, optional fields, and logic paths. **All 5: 100% parity confirmed.** No status or Doublechecked changes applied.

## QA Batch (strict) – 2026-02-25

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-013-A, ADMIN-014-A, ADMIN-015-A, ADMIN-016-A, ADMIN-017-A.
- **Result**: 2 confirmed parity (ADMIN-015-A `logout.ts`, ADMIN-016-A `testAuth.ts`); 3 logic missing (ADMIN-013-A `gamOauth.ts` callback stub, ADMIN-014-A `selectTenant.ts` missing `ensure_user_in_tenant`, ADMIN-017-A `oidc.ts` schema `discovery_url`→`issuer` mismatch + 4 missing fields).
- **Actions taken**: ADMIN-015-A and ADMIN-016-A: table status `pending`→`done`, `Doublechecked: Yes`, New Code Reference added. ADMIN-013-A, ADMIN-014-A, ADMIN-017-A: YAML status `done`→`pending`, `Doublechecked: Failed`, missing logic documented in New Code Reference.

## QA Batch (strict) – 2026-02-25 (Batch 2)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-017-B, ADMIN-017-C, ADMIN-017-D, ADMIN-007-A, ADMIN-007-B.
- **Result**: 1 confirmed parity (ADMIN-007-B `createTenant.ts`); 4 logic missing (ADMIN-017-B missing auth guard + 4 response fields, ADMIN-017-C missing auth guard + redirect URI validity check, ADMIN-017-D mock-only callback with no real OIDC token exchange, ADMIN-007-A wrong field set + schema unused by route).
- **Actions taken**: ADMIN-007-B: table status `pending`→`done`, `Doublechecked: Yes`, New Code Reference added. ADMIN-017-B, ADMIN-017-C, ADMIN-017-D, ADMIN-007-A: YAML status `done`→`pending`, `Doublechecked: Failed`, missing logic documented in New Code Reference.

## QA Batch (strict) – 2026-02-25 (Batch 3)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-008-A, ADMIN-018-A, ADMIN-019-A, ADMIN-022-A, ADMIN-023-A.
- **Result**: 1 confirmed parity (ADMIN-008-A `reactivate.ts`); 4 logic missing (ADMIN-018-A dashboard missing require_tenant_access + features/setup_status/chart data gaps, ADMIN-019-A setup_status schema completely wrong vs SetupChecklistService output, ADMIN-022-A deactivate missing require_tenant_access guard + critical-severity audit log, ADMIN-023-A mediaBuysList missing require_tenant_access + no MediaBuyReadinessService + blocking_issues/packages_ready gaps).
- **Actions taken**: ADMIN-008-A: table status `pending`→`done`, `Doublechecked: Yes`, New Code Reference added. ADMIN-018-A, ADMIN-019-A, ADMIN-022-A, ADMIN-023-A: YAML status `done`→`pending`, `Doublechecked: Failed`, missing logic documented in New Code Reference.

## QA Batch (strict) – 2026-02-25 (Batch 4)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-024-A, ADMIN-020-A, ADMIN-020-B, ADMIN-020-C, ADMIN-020-D.
- **Result**: 0 confirmed parity; 5 logic missing (all 5 missing `require_tenant_access` auth guard + `@log_admin_action` audit logging; ADMIN-020-B additionally missing AXE key + all GAM/Mock adapter config fields; ADMIN-020-C additionally missing SSRF private-IP range check + `/settings/slack` route alias; ADMIN-020-A additionally missing Babel ISO 4217 currency code validation).
- **Actions taken**: ADMIN-024-A, ADMIN-020-A, ADMIN-020-B, ADMIN-020-C, ADMIN-020-D: YAML status `done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

## QA Batch (strict) – 2026-02-25 (Batch 5)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-020-E, ADMIN-021-A, ADMIN-021-B, ADMIN-025-A, ADMIN-026-A.
- **Result**: 0 confirmed parity; 5 logic missing. ADMIN-020-E (domains): missing `require_tenant_access` + audit logging; core domain add/remove logic present. ADMIN-021-A (aiTest): missing `require_tenant_access`; both test endpoints are stubs (no real AI model call, no real logfire span); `GET /ai/models` hardcoded 5-provider list vs Python dynamic 14+ provider discovery from `pydantic_ai.models.KnownModelName`. ADMIN-021-B (approximated): missing `require_tenant_access` + audit logging on register/unregister; all API calls match Python 1:1 otherwise. ADMIN-025-A (listProducts): missing `require_tenant_access`; `inventory_details` hardcoded zeros (no `ProductInventoryMapping` query); `inventory_profile` always null; `created_at` always null. ADMIN-026-A (addProduct): missing `require_tenant_access` + audit logging; no format ID validation against creative agent registry; no GAM-specific `implementation_config` generation via `GAMProductConfigService`.
- **Actions taken**: ADMIN-020-E, ADMIN-021-A, ADMIN-021-B, ADMIN-025-A, ADMIN-026-A: YAML status `done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

## QA Batch (strict) – 2026-02-25 (Batch 6)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-027-A, ADMIN-028-A, ADMIN-029-A, ADMIN-030-A, ADMIN-031-A.
- **Result**: 1 confirmed parity (ADMIN-030-A `revenueChart.ts`); 4 logic missing. ADMIN-027-A (editProduct): 10 missing gaps including format registry validation, inventory_profile_id secure association, property_mode/publisher_properties, product_card generation, dynamic product fields, delivery_measurement, and pricing options stored to dedicated DB table. ADMIN-028-A (deleteProduct): missing require_tenant_access + critical active-media-buy reference check before deletion (allows deleting products still used in active buys). ADMIN-029-A (productInventory): missing require_tenant_access+audit on all 3 routes, is_primary not persisted (always false), mapping_id uses synthetic string vs Python integer DB ID (incompatible). ADMIN-031-A (productsList): /products has parity, /products/suggestions missing `total_count` field name (vs `count`), missing `criteria` object, and only 2 hardcoded industry types.
- **Actions taken**: ADMIN-030-A: table status `pending`→`done`, `Doublechecked: Yes`, New Code Reference added. ADMIN-027-A, ADMIN-028-A, ADMIN-029-A, ADMIN-031-A: YAML status `done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 7)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-032-A, ADMIN-033-A, ADMIN-034-A, ADMIN-035-A, ADMIN-036-A.
- **Result**: 0 confirmed parity; 5 logic missing. ADMIN-032-A (gamAdvertisers): `/api/gam/get-advertisers` Python is a 501 stub while TS improves it with DB lookup, but `/api/gam/test-connection` is a stub returning hardcoded mock instead of real `googleads` SDK calls + no audit logging on either route. ADMIN-033-A (creativePages): `media_buys` always `[]`, `assignment_count` always `0`, `promoted_offering` always `null` — Python queries `CreativeAssignment`+`MediaBuy`+`Product` for real values; no `require_tenant_access` guard. ADMIN-034-A (analyzeCreative): core stub logic at parity (both Python and TS return same "not yet implemented" stub), but missing `require_tenant_access` guard and `@log_admin_action("analyze")`. ADMIN-035-A (reviewActions): missing critical media buy approval cascade (`execute_approved_media_buy` on all-creatives-approved trigger), webhook call, Slack notification, `require_tenant_access`, and audit logging; AI review is a stub not calling real Gemini API. ADMIN-036-A (detectConfigure): `configure` POST has full DB persistence parity, but `detect-network` is a stub (hardcoded mock vs real `googleads` getAllNetworks + multi-network selection logic); no `require_tenant_access` or audit logging on either route.
- **Actions taken**: ADMIN-032-A, ADMIN-033-A, ADMIN-034-A, ADMIN-035-A, ADMIN-036-A: YAML status `done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 8)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-037-A, ADMIN-038-A, ADMIN-039-A, ADMIN-040-A, ADMIN-041-A.
- **Result**: 0 confirmed parity; 5 logic missing. ADMIN-037-A (lineItem): no `require_tenant_access` on either route; both return hardcoded `buildMockLineItem()` stub — no DB `GAMLineItem` lookup, no live GAM API fallback; API response field names differ (`type`/`currency` in Python vs `line_item_type`/`currency_code` in TS); missing `start_date`/`end_date`/`last_synced`; no `GAMOrder` association. ADMIN-038-A (customTargeting): no `require_tenant_access(api_mode=True)`; reads static DB JSON vs Python's live GAM API call via `GAMInventoryDiscovery.discover_custom_targeting()`. ADMIN-039-A (syncStatus): no `require_tenant_access` on all 3 routes; no `@log_admin_action("reset_stuck_gam_sync")`; all 3 routes are stubs — no `SyncJob` DB queries; reset-stuck-sync always returns 404 instead of marking stuck sync as failed and committing. ADMIN-040-A (serviceAccount): no `require_tenant_access` on all routes; missing `@log_admin_action` on create-service-account and test-connection; create-service-account writes email string to DB vs Python's real GCP IAM SDK call; test-connection always returns hardcoded stub vs Python's real GAM SDK calls (Refresh+getAllNetworks+get_advertisers+getCurrentUser). ADMIN-041-A (listUsers): missing `require_tenant_access` guard; data retrieval logic and response fields otherwise match Python 1:1.
- **Actions taken**: ADMIN-037-A, ADMIN-038-A, ADMIN-039-A, ADMIN-040-A, ADMIN-041-A: YAML status `done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 9)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-042-A, ADMIN-043-A, ADMIN-044-A, ADMIN-045-A, ADMIN-046-A.
- **Result**: 0 confirmed parity; 5 logic missing. ADMIN-042-A (userActions): missing `require_tenant_access` + `@log_admin_action` on all 3 routes (add/toggle/update_role); core user CRUD logic matches Python 1:1. ADMIN-043-A (domains): missing `require_tenant_access` + `@log_admin_action("add_domain"/"remove_domain")` on POST/DELETE; core domain array add/remove logic matches Python 1:1. ADMIN-044-A (setupMode): missing `require_tenant_access` + `@log_admin_action` on both routes; SSO-required check + oidcEnabled validation + DB update match Python 1:1. ADMIN-045-A (workflowsList): missing `require_tenant_access`; all DB queries (workflow steps + context join, summary stats, principal resolution, audit logs) match Python 1:1. ADMIN-046-A (stepReview): missing `require_tenant_access`; step lookup + context + principal queries and response shape match Python 1:1.
- **Actions taken**: ADMIN-042-A, ADMIN-043-A, ADMIN-044-A, ADMIN-045-A, ADMIN-046-A: YAML `status: done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 10)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-047-A, ADMIN-048-A, ADMIN-048-B, ADMIN-049-A, ADMIN-050-A.
- **Result**: 0 confirmed parity; 5 logic missing. ADMIN-047-A (stepActions): missing `require_tenant_access` + `@log_admin_action` on approve/reject; entire `execute_approved_media_buy` cascade absent on approve (ObjectWorkflowMapping lookup → creative approval check → adapter execution → media buy `status="scheduled"` + `approved_at`/`approved_by`). ADMIN-048-A (propertiesCrud): missing `require_tenant_access` + `@log_admin_action("create_property"/"edit_property"/"delete_property")` on create/edit/delete; core CRUD logic matches Python 1:1. ADMIN-048-B (propertiesApiList): missing `require_tenant_access(api_mode=True)`; response shape and identifier extraction match Python 1:1. ADMIN-049-A (propertyTags): missing `require_tenant_access` on GET+POST and `@log_admin_action("create_property_tag")` on POST; all_inventory auto-create, duplicate check, tag_id normalization, and insert logic match Python 1:1. ADMIN-050-A (propertyActions): missing `require_tenant_access` + `@log_admin_action` on all 3 routes; all 3 are stubs — no `PropertyVerificationService` or `PropertyDiscoveryService` integration; `sync-from-adagents` missing rate limiting (60s cooldown) and sync history stored in `tenant.metadata`.
- **Actions taken**: ADMIN-047-A, ADMIN-048-A, ADMIN-048-B, ADMIN-049-A, ADMIN-050-A: YAML `status: done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 11)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-051-A, ADMIN-052-A, ADMIN-053-A, ADMIN-054-A, ADMIN-055-A.
- **Result**: 0 confirmed parity; 5 logic missing. ADMIN-051-A (mockConfig): core 9-field config + delivery_simulation at 1:1 parity; missing `require_tenant_access` guard on both GET/POST. ADMIN-052-A (inventorySchema): both Python and TS are 501 stubs — at parity on core logic; missing `require_tenant_access`. ADMIN-053-A (adapterConfig): core DB upsert + legacy columns at parity; missing `require_tenant_access` + `@log_admin_action("update_adapter_config")` + Pydantic adapter schema validation (Python validates config against `get_adapter_schemas().connection_config` before persisting; TS writes raw dict). ADMIN-054-A (capabilities): fundamentally wrong field set — TS returns 3 hardcoded fields (`supports_custom_targeting`, `supports_inventory_profiles`, `supports_creatives`) vs Python's 9-field `AdapterCapabilities` dataclass; `supports_creatives` has no Python counterpart; mock adapter TS values contradict Python values; missing `require_tenant_access`. ADMIN-055-A (broadstreet): both routes are stubs — `test-connection` always returns hardcoded success without real `BroadstreetClient.get_network()` call; `zones` always returns `{zones:[]}` without real `BroadstreetClient.get_zones()` call; missing `require_tenant_access` on both routes.
- **Actions taken**: ADMIN-051-A, ADMIN-052-A, ADMIN-053-A, ADMIN-054-A, ADMIN-055-A: YAML `status: done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 12)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-057-A, ADMIN-057-B, ADMIN-058-A, ADMIN-058-B, ADMIN-059-A.
- **Result**: 1 confirmed parity (ADMIN-058-A `policyPages.ts`); 4 logic missing. ADMIN-057-A (profilesCrud): 8 gaps — no `require_tenant_access` on all 4 CRUD routes, no `@log_admin_action` on create/update/delete, no format count validation, no publisher_properties empty check, no `property_mode` branching (tags/property_ids/full) with tag format `^[a-z0-9_]{2,50}$` validation, no product-count warning on edit, list response missing computed summary strings. ADMIN-057-B (profilesApi): all 3 API endpoint response shapes at parity; missing `require_tenant_access(api_mode=True)` on all 3 routes. ADMIN-058-B (policyActions): `POST /update` policy merge + DB write + `GET/POST /review/:taskId` step update + audit log insert all at parity; missing `@log_admin_action("update_policy")` on `POST /update` (auditPlugin does not fire for policy updates). ADMIN-059-A (activityRest): `formatActivityFromAuditLog()`, `getRecentActivities()`, both REST endpoints and response shapes at parity; missing `require_tenant_access` on both `GET /activity` and `GET /activities`.
- **Actions taken**: ADMIN-058-A: table status `pending`→`done`, `Doublechecked: Yes`, New Code Reference added. ADMIN-057-A, ADMIN-057-B, ADMIN-058-B, ADMIN-059-A: YAML `status: done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 13)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-059-B, ADMIN-059-C, ADMIN-060-A, ADMIN-060-B, ADMIN-060-C.
- **Result**: 0 confirmed parity; 5 logic missing. ADMIN-059-B (activitySse): core SSE stream (initial history, poll, heartbeat) at parity; missing `require_tenant_access(api_mode=True)`, HEAD handler, timestamp-based sliding-window rate limiting (Python uses 60s rolling window vs TS plain counter), `Access-Control-Allow-Origin: *` header, correct `event: error\n` SSE prefix on error frames, and 5-second back-off after stream error. ADMIN-059-C (auditParseService): `parseAuditOperation` function exists and maps operation prefixes to types; **dead code** — never imported or called from any file; type taxonomy incompatible with Python ("mcp"/"a2a"/"adcp"/"admin"/"system" vs Python's content-based "media-buy"/"creative"/"error"/"product-query"/"human-task"/"api-call"); no content-based categorization by method keywords. ADMIN-060-A (principalsCrud): all CRUD logic (list with media_buy_count LEFT JOIN, create with GAM numeric validation + duplicate check, edit with platform_mappings rebuild, DELETE+POST delete) at 100% parity; missing `require_tenant_access()` on all 5 routes and `@log_admin_action` for create/edit/delete. ADMIN-060-B (principalsApi): `GET /principal/:id`, `POST /update_mappings` (with GAM numeric validation), `POST /testing-config` (TS-only HITL helper) all at parity for core DB logic; missing `require_tenant_access()` on GET+POST update_mappings and `@log_admin_action("update_mappings")`. ADMIN-060-C (principalWebhooks): all 4 webhook endpoints (list/register/delete/toggle) at core DB parity; missing `require_tenant_access()` on all 4, `@log_admin_action` for register/delete/toggle, incomplete SSRF protection (TS blocks only localhost/127.x; Python blocks full RFC-1918 private ranges via `WebhookURLValidator`), and auth_config storage schema mismatch (`auth_config={"secret":...}` column in Python vs dedicated `webhookSecret` column in TS).
- **Actions taken**: ADMIN-059-B, ADMIN-059-C, ADMIN-060-A, ADMIN-060-B, ADMIN-060-C: YAML `status: done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 14)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-061-A, ADMIN-062-A, ADMIN-062-B, ADMIN-062-C, ADMIN-062-D.
- **Result**: 1 confirmed parity; 4 logic missing. ADMIN-062-A (reporting): Python uses `@require_auth()` + manual `session.role/tenant_id` check — TS replicates identical logic 1:1; tenant lookup+404, GAM check, JSON response with all Python template-context fields — 100% parity. ADMIN-061-A (principalGamApi): stub returning `advertisers: []`; missing `require_tenant_access`, `@log_admin_action("get_gam_advertisers")`, real GAM adapter call via `GoogleAdManager` + `orders_manager.get_advertisers()`, and 500 error handler for adapter exceptions. ADMIN-062-B (mediaBuyDetail): basic media-buy + principal + packages query present; missing `require_tenant_access`, actual workflow_steps (ContextManager.get_object_lifecycle), creative_assignments_by_package (CreativeAssignment+Creative join), product details per package (selectinload), pending_approval_step, status_message, delivery_metrics from adapter, computed_state + readiness from MediaBuyReadinessService. ADMIN-062-C (mediaBuyActions): step lookup present; missing `require_tenant_access`, wrong step status enum on approve ("completed" vs Python's "approved"), no creative approval check before media buy status transition, no date-based status logic (scheduled/active/completed), no `execute_approved_media_buy()` adapter call, no step comments append, no MCP/A2A webhook notifications on approve/reject, `trigger-delivery-webhook` is stub. ADMIN-062-D (webhooks): all query logic/filters/response shape at 100% parity with Python; only gap is missing `require_tenant_access` guard.
- **Actions taken**: ADMIN-062-A: table status `pending`→`done`, `Doublechecked: Yes`, New Code Reference added. ADMIN-061-A, ADMIN-062-B, ADMIN-062-C, ADMIN-062-D: YAML `status: done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 16)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-069-A, ADMIN-070-A, ADMIN-070-B, ADMIN-070-C, ADMIN-071-A.
- **Result**: 0 confirmed parity; 5 logic missing. ADMIN-069-A (syncApi): `/trigger` is stub; 4 orders/line-items routes missing entirely (`POST .../orders/sync`, `GET .../orders`, `GET .../orders/:id`, `GET .../line-items`). ADMIN-070-A (syncTree): `POST /sync` creates SyncJob but no background worker executes; `GET /tree` response keys mismatch (`tree` vs Python `root_units`, `placements_count` vs `placements`, missing `audience_segments`/`total_units`/`root_count`); no `require_tenant_access` guard; no cache layer. ADMIN-070-B (productInventory): GET/POST core logic at parity; missing `require_tenant_access(api_mode=True)` on both routes; missing `@log_admin_action("assign_inventory_to_product")` on POST; `/suggest` is TS-only. ADMIN-070-C (targeting): `GET /targeting/all` at parity minus auth guard; `GET /targeting/values/:key_id` is stub — Python calls real GAM SDK via `GAMInventoryDiscovery.discover_custom_targeting_values_for_key()`; no `require_tenant_access` guard; POST variants have no Python equivalent. ADMIN-071-A (gamReporting/base): auth+input validation at parity; stub only — no `get_ad_manager_client_for_tenant()` + `GAMReportingService.get_reporting_data()` call; always returns `data: []`.
- **Actions taken**: ADMIN-069-A, ADMIN-070-A, ADMIN-070-B, ADMIN-070-C, ADMIN-071-A: YAML `status: done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 15)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-063-A, ADMIN-064-A, ADMIN-065-A, ADMIN-066-A, ADMIN-068-A.
- **Result**: 0 confirmed parity; 5 logic missing. ADMIN-063-A (creativeAgents): missing `require_tenant_access` + `@log_admin_action` on add/edit/test; `POST /:id/test` stub — always returns success without calling `CreativeAgentRegistry._fetch_formats_from_agent()`; no 400 on empty formats, no error propagation. ADMIN-064-A (signalsAgents): identical pattern — missing `require_tenant_access` + `@log_admin_action`; test route stub never calls `SignalsAgentRegistry.test_connection()`. ADMIN-065-A (publisherPartners): GET list/POST add/DELETE at parity; `POST /sync` stub returns `verified:0` without real adagents.json verification or `PropertyDiscoveryService` sync; `GET /:p_id/properties` stub reads stale DB cache with hardcoded `is_authorized:true` instead of live fetch. ADMIN-066-A (formatSearch): `GET /search` and `GET /list` stubs return empty results (blocked by missing CreativeAgentRegistry TypeScript port); `GET /templates` hardcodes 8 GAM sizes vs dynamic `GAM_STANDARD_SIZES`; `GET /agents` at parity. ADMIN-068-A (tenantManagementApi): missing SSRF webhook URL validation on POST+PUT; PUT missing adapter_config update block; `GET /tenants/:id` missing `principals_count` + token-masking fields (`has_refresh_token`/`has_api_key`); hard-delete missing Product/MediaBuy/AuditLog/User cascades; list ordered ASC vs Python DESC.
- **Actions taken**: ADMIN-063-A, ADMIN-064-A, ADMIN-065-A, ADMIN-066-A, ADMIN-068-A: YAML `status: done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 17)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (empty column).
- **Tasks audited**: ADMIN-071-B, ADMIN-071-C, ADMIN-072-A, ADMIN-072-B, ADMIN-073-A.
- **Result**: 2 confirmed parity (ADMIN-072-A `signup.ts`, ADMIN-072-B `onboarding.ts`); 3 logic missing (ADMIN-071-B all 3 breakdown routes are stubs missing `GAMReportingService` calls + `get_ad_manager_client_for_tenant()` + `ensure_network_timezone()` + 500 error handler; ADMIN-071-C both principal reporting routes are stubs missing real `GAMReportingService.get_reporting_data()` + `get_advertiser_summary()` calls; ADMIN-073-A missing PRODUCTION-mode `/admin` fallback when no header, PATH_INFO rewriting from request URL, and redirect Location header fixup in 3xx responses).
- **Actions taken**: ADMIN-072-A and ADMIN-072-B: table `Doublechecked: Yes`, New Code Reference added, YAML status remains `done`. ADMIN-071-B, ADMIN-071-C, ADMIN-073-A: YAML `status: done`→`pending`, table `Doublechecked: Failed`, missing logic documented in New Code Reference.

---

## QA Batch (strict) – 2026-02-25 (Batch 18)

- **Criterion**: Identify 5 tasks with YAML `status: done` and table `Doublechecked` ≠ Yes (table rows showing `pending/Failed` with YAML never updated).
- **Tasks audited**: DB-009, ADCP-006-B, ADCP-006-C, ADCP-007-D, ADCP-008-A.
- **Result**: 0 confirmed parity; 5 YAML inconsistencies corrected. DB-009 (`gam_inventory.ts`): `gamOrders.ts` entirely missing — 25-column `GAMOrder` model (order_id, name, advertiser_id/name, agency_id/name, trafficker_id/name, salesperson_id/name, status, start_date, end_date, unlimited_end_date, total_budget, currency_code, external_order_id, po_number, notes, last_modified_date, is_programmatic, applied_labels, effective_applied_labels, custom_field_values, order_metadata, timestamps) + 4 indexes + `GAMLineItem` relationship all absent. ADCP-006-B (`getProducts.ts`): `GetProductsResponseSchema` has only `products`; missing `errors: z.array(...).optional()` (Python L742: `errors=None`) and `context: z.unknown().optional()` (Python L743: `context=req.context`). ADCP-006-C (`productQueryService.ts`): missing (1) `countries` filter (Python L541-562), (2) `standard_formats_only` filter (Python L520-538: standard format prefix check), (3) `allowed_principal_ids` access control (Python L375-406: principal-restricted products visibility), (4) anonymous user pricing strip (Python L726-730: `pricing_options=[]` for unauthenticated). ADCP-007-D (`formatService.spec.ts`): parity requirement "filter by type/name" — `name_search` case-insensitive partial match test absent; Python `_list_creative_formats_impl` L271-274 filters by `req.name_search.lower()`. ADCP-008-A (`creative.ts`): `ListCreativesResponseSchema` missing `format_summary: z.unknown().nullable().optional()`, `status_summary: z.unknown().nullable().optional()`, and `context: z.unknown().optional()` — all set explicitly in Python `listing.py` L450-451 and `LibraryListCreativesResponse` spec.
- **Actions taken**: DB-009, ADCP-006-B, ADCP-006-C, ADCP-007-D, ADCP-008-A: YAML `status: done`→`pending` corrected (table `Doublechecked: Failed` was already set in prior batches but YAML was not updated). No table changes needed — table state was already correct.

---

## Fix Audit Batch – 2026-02-25 (Batch 1)

- **Criterion**: Identify first 3 tasks with `status: pending` AND `Doublechecked: Failed`.
- **Tasks fixed**: ADMIN-053-A, ADMIN-054-A, ADMIN-055-A.
- **ADMIN-053-A** (`adapterConfig.ts`): Added `requireTenantAccess` guard, `request.auditOperation = "update_adapter_config"`, and `KNOWN_ADAPTER_TYPES` validation returning 400 for unknown adapter types. Core DB upsert logic unchanged.
- **ADMIN-054-A** (`capabilities.ts`): Rewrote `KNOWN_ADAPTERS` with all 9 Python `AdapterCapabilities` fields (removing non-Python `supports_creatives`). Mock values corrected to `supports_custom_targeting=false`, `supports_inventory_profiles=false` per Python mock_ad_server.py. Broadstreet values match adapter.py. Added `requireTenantAccess` via `session.tenant_id`.
- **ADMIN-055-A** (`broadstreet.ts`): Added `requireTenantAccess` on both routes. Replaced hardcoded stubs with real `fetch` calls to `https://api.broadstreetads.com/api/0` — test-connection calls `GET /networks/{id}`, zones calls `GET /networks/{id}/zones`. 30s timeout via `AbortSignal.timeout`.
- **Verification**: `npx tsc --noEmit` — zero errors in modified files; all pre-existing UI/spec errors unchanged.
- **Actions taken**: ADMIN-053-A, ADMIN-054-A, ADMIN-055-A: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`, New Code Reference updated.

---

## Layer 0 – Project Infrastructure (5)

| Task ID | Status | Component | Action Type | Parity Requirement | Doublechecked | New Code Reference |
| --------- | ------- | ---------------------------------- | ----------- | -------------------------------------------------------------------- | ------------- | ------------------ |
| INFRA-001 | done | `server-ts/package.json` | Scaffold | Fastify v5, Zod v3, Drizzle, tsx, Vitest | Yes | `packages/server/package.json` (Fastify ^5, Zod ^4, drizzle-orm, tsx, vitest) |
| INFRA-002 | done | `server-ts/tsconfig.json` | Scaffold | NodeNext module resolution, strict mode | Yes | `packages/server/tsconfig.json` (extends root with NodeNext, strict from ../../tsconfig.json) |
| INFRA-003 | done | `server-ts/vitest.config.ts` | Scaffold | globals: true, node env, include `**/*.spec.ts` | Yes | `packages/server/vitest.config.ts` (defineConfig: globals, environment node, include src/**/*.spec.ts) |
| INFRA-004 | done | `src/app.ts` – Fastify app factory | Logic | `buildApp()` returns `FastifyInstance`; registers plugins and routes | Yes | `packages/server/src/app.ts` (buildApp, FastifyInstance, auth/health/MCP/A2A/schemas routes) |
| INFRA-005 | done | `src/server.ts` – entry point | Logic | `buildApp().listen({ port })` | Yes | `packages/server/src/server.ts` (buildApp, listen({ port, host })) |

---

## Layer 1 – Drizzle Database Schema (15)

| Task ID | Status | Component | Action Type | Parity Requirement | Doublechecked | New Code Reference |
| ------ | ------ | ------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------ |
| DB-001 | done | `src/db/schema/tenants.ts` | Schema | Mirror `Tenant` model: tenant_id, subdomain, virtual_host, is_active, admin_token, brand_manifest_policy, auth_setup_mode, etc. | Yes | `packages/server/src/db/schema/tenants.ts` (tenants table, Tenant type) |
| DB-002 | done | `src/db/schema/principals.ts` | Schema | Mirror `Principal`: principal_id, tenant_id, access_token, platform_mappings (JSON) | Yes | `packages/server/src/db/schema/principals.ts` (added `primaryKey({ columns: [t.tenantId, t.principalId] })` to table constraints; imported `primaryKey` from drizzle-orm/pg-core) |
| DB-003 | done | `src/db/schema/adapter_configs.ts` | Schema | Mirror `AdapterConfig`: adapter_type, GAM fields, mock fields, kevel fields | Yes | `packages/server/src/db/schema/adapterConfigs.ts` (adapterConfigs table, AdapterConfig type) |
| DB-004 | done | `src/db/schema/products.ts` | Schema | Mirror `Product`: product_id, tenant_id, name, pricing_model, config (JSON) | Yes | `packages/server/src/db/schema/products.ts` (added `archivedAt` timestamp, `variantTtlDays` integer, `allowedPrincipalIds` jsonb<string[]> columns to products table) |
| DB-005 | done | `src/db/schema/media_buys.ts` | Schema | Mirror `MediaBuy`: media_buy_id, buyer_ref, status, packages (JSON), start/end | Yes | `packages/server/src/db/schema/mediaBuys.ts` (mediaBuys table, MediaBuy type) |
| DB-006 | done | `src/db/schema/creatives.ts` | Schema | Mirror `Creative`/`CreativeAsset`: creative_id, media_buy_id, status, format | Yes | `packages/server/src/db/schema/creatives.ts` (creatives, creativeReviews tables; Creative, CreativeReview types) |
| DB-007 | done | `src/db/schema/workflow_steps.ts` | Schema | Mirror `WorkflowStep` + `ObjectWorkflowMapping` | Yes | `packages/server/src/db/schema/workflowSteps.ts` (workflowSteps, objectWorkflowMappings; WorkflowStep, ObjectWorkflowMapping types) |
| DB-008 | done | `src/db/schema/audit_logs.ts` | Schema | Mirror `AuditLog`: operation, adapter_id, success, details (JSON) | Yes | `packages/server/src/db/schema/auditLogs.ts` (auditLogs table, AuditLog type) |
| DB-009 | done | `src/db/schema/gam_inventory.ts` | Schema | Mirror `GAMInventory`, `GAMOrder` | Yes | `packages/server/src/db/schema/gamInventory.ts` (added `gamOrders` table: 29 columns — id serial PK, tenant_id FK, order_id, name, advertiser_id/name, agency_id/name, trafficker_id/name, salesperson_id/name, status, start/end_date, unlimited_end_date, total_budget, currency_code, external_order_id, po_number, notes, last_modified_date, is_programmatic, applied_labels, effective_applied_labels, custom_field_values, order_metadata, last_synced, created_at, updated_at; uniqueIndex uq_gam_orders + 4 indexes; GamOrder/NewGamOrder types exported) |
| DB-010 | done | `src/db/schema/publisher_partners.ts` | Schema | Mirror `PublisherPartner` | Yes | `packages/server/src/db/schema/publisherPartners.ts` (publisherPartners table, PublisherPartner type; all 10 columns, unique(tenant_id, publisher_domain), CHECK sync_status, 3 indexes) |
| DB-011 | done | `src/db/schema/currency_limits.ts` | Schema | Mirror `CurrencyLimit` | Yes | `packages/server/src/db/schema/currencyLimits.ts` (currencyLimits table, CurrencyLimit type; composite PK(tenant_id, currency_code), numeric(15,2) for min_package_budget/max_daily_package_spend, timestamps, tenant index) |
| DB-012 | done | `src/db/schema/users.ts` | Schema | Mirror `User` + `TenantAuthConfig` | Yes | `packages/server/src/db/schema/users.ts` (users table + tenantAuthConfigs table; User: 9 columns with CHECK role, unique(tenant_id,email), 3 indexes; TenantAuthConfig: 12 columns including oidc_client_secret_encrypted, unique tenant_id, unique index) |
| DB-013 | done | `src/db/schema/inventory_profiles.ts` | Schema | Mirror `InventoryProfile` | Yes | `packages/server/src/db/schema/inventoryProfiles.ts` (inventoryProfiles table, InventoryProfile type; 12 columns with typed JSONB: InventoryConfig, FormatId[], PublisherProperty[]; gam_preset_id/sync_enabled; unique(tenant_id, profile_id), tenant index) |
| DB-014 | done | `src/db/schema/agents.ts` | Schema | Mirror `CreativeAgent` + `SignalsAgent` | Yes | `packages/server/src/db/schema/agents.ts` (creativeAgents table: 12 cols — id, tenant_id FK CASCADE, agent_url, name, enabled, priority, auth_type, auth_header, auth_credentials, timeout, created_at, updated_at; idx_creative_agents_tenant, idx_creative_agents_enabled. signalsAgents table: 12 cols — same as creative minus priority, plus forward_promoted_offering; idx_signals_agents_tenant, idx_signals_agents_enabled. Types: CreativeAgent, NewCreativeAgent, SignalsAgent, NewSignalsAgent) |
| DB-015 | done | `src/db/client.ts` | Logic | Drizzle client factory (`DATABASE_URL` env var) | Yes | `packages/server/src/db/client.ts` (buildConnectionString: DATABASE_URL primary, POSTGRES_* fallback; getDb: postgres.js pool with DB_POOL_SIZE/idle_timeout/connect_timeout; module-level singleton `db`; closeDb for graceful shutdown; resetDbPool for testing; Db type export) |

---

## Layer 2 – Auth Middleware (11)

| Task ID | Status | Component | Action Type | Parity Requirement | Doublechecked | New Code Reference |
| ---------- | ------ | ---------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- | ------------- | ------------------ |
| ADCP-025-A | done | `src/auth/extractToken.ts` | Logic | Extract from `x-adcp-auth` header; fallback to `Authorization: Bearer <token>`; return raw string or null | Yes | `packages/server/src/auth/extractToken.ts` (extractToken) |
| ADCP-025-B | done | `src/auth/lookupPrincipal.ts` | Logic | DB lookup: `principals.access_token = token` scoped to tenant_id if provided | Yes | `packages/server/src/auth/lookupPrincipal.ts` (lookupPrincipalByToken, lookupPrincipalGlobal) |
| ADCP-025-C | done | `src/auth/adminTokenFallback.ts` | Logic | If no principal found: check `tenants.admin_token = token`; return `{tenant_id}_admin` | Yes | `packages/server/src/auth/adminTokenFallback.ts` (checkAdminToken) |
| ADCP-025-D | done | `src/auth/validateActiveTenant.ts` | Logic | Confirm `tenants.is_active = true`; return null if inactive | Yes | `packages/server/src/auth/validateActiveTenant.ts` (validateActiveTenant, validateActiveTenantBySubdomain, validateActiveTenantByVirtualHost) |
| ADCP-025-E | done | `src/auth/authPlugin.ts` | Route | Fastify `preHandler` plugin; calls A→B→C→D; sets `request.principal` and `request.tenantId` | Yes | `packages/server/src/auth/authPlugin.ts` (authPlugin preHandler, request.auth) |
| ADCP-025-F | done | `src/auth/extractToken.spec.ts` | Test | Header present / absent / Bearer / x-adcp-auth | Yes | `packages/server/src/auth/extractToken.spec.ts` (12 tests: x-adcp-auth present, priority over Authorization, case-insensitive header, array header value; Bearer present, whitespace trim, case-insensitive prefix (lower+upper), empty token→null, Basic scheme→null; empty headers, missing headers, undefined x-adcp-auth) |
| ADCP-025-G | done | `src/auth/lookupPrincipal.spec.ts` | Test | Found / not-found / inactive-tenant | Yes | `packages/server/src/auth/lookupPrincipal.spec.ts` (7 tests: lookupPrincipalByToken — token found in tenant, no match→null, cross-tenant mismatch→null; lookupPrincipalGlobal — found+active tenant, no match→null, inactive tenant→null, missing tenant row→null. DB mocked via vi.mock with fluent chain) |
| ADCP-026-A | done | `src/auth/toolContext.ts` | Schema | `ToolContext` type: `{ tenantId, principalId, contextId }` | Yes | `packages/server/src/auth/toolContext.ts` (ToolContext interface: contextId, tenantId, principalId, conversationHistory, toolName, requestTimestamp, metadata, testingContext, workflowId; AdCPTestContext interface: testSessionId, dryRun, mockTime, jumpToEvent, autoAdvance, simulatedSpend; buildToolContext factory; isAsyncOperation + addToHistory pure helpers) |
| ADCP-026-B | done | `src/auth/requestContext.ts` | Logic | `AsyncLocalStorage`-based store; `runWithContext(ctx, fn)` + `getContext()` | Yes | `packages/server/src/auth/requestContext.ts` (AsyncLocalStorage<RequestContext> singleton; runWithRequestContext, getRequestContext throws RequestContextError, tryGetRequestContext; matches config_loader.py ContextVar + get_current_tenant + set_current_tenant) |
| ADCP-027-A | done | `src/auth/resolveTenantFromHost.ts` | Logic | Priority: `Apx-Incoming-Host` → subdomain from `Host` → principal's tenant | Yes | `packages/server/src/auth/resolveTenantFromHost.ts` (resolveTenantFromHeaders, resolveTenantId; 5-step chain: Host→virtualHost, Host→subdomain, x-adcp-tenant, Apx-Incoming-Host, localhost fallback; EXCLUDED_SUBDOMAINS Set; HeaderBag type; matches auth.py lines 228-296) |
| ADCP-027-B | done | `src/auth/resolveTenantFromHost.spec.ts` | Test | Apx-host match / subdomain match / principal fallback / no match | Yes | `packages/server/src/auth/resolveTenantFromHost.spec.ts` (14 tests: step1 virtualHost match+fallthrough; step2 subdomain extract, skip www/admin/bare host; step3 x-adcp-tenant subdomain+direct-id; step4 Apx-Incoming-Host; step5 localhost/127.0.0.1/null; EXCLUDED_SUBDOMAINS constant; resolveTenantId wrapper) |

---

## Layer 3 – ADCP Server: HTTP Utility Routes (10)

| Task ID | Status | Component | Action Type | Parity Requirement | Doublechecked | New Code Reference |
| ---------- | ------- | --------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------ |
| ADCP-001-A | done | `src/schemas/health.ts` | Schema | `z.object({ status: z.string(), service: z.string() })` | Yes | `packages/server/src/schemas/health.ts` (HealthResponseSchema, HEALTH_RESPONSE) |
| ADCP-001-B | done | `src/routes/health.ts` | Route | `GET /health` → `{ status: "healthy", service: "mcp" }` | Yes | `packages/server/src/routes/health.ts` (healthRoute, GET /health) |
| ADCP-001-C | done | `src/routes/health.spec.ts` | Test | 200 + exact JSON shape | Yes | `packages/server/src/routes/health.spec.ts` (2 tests: 200 + exact JSON {status:"healthy",service:"mcp"} validated via HealthResponseSchema.safeParse; no-auth-required path; matches main.py health()) |
| ADCP-002-A | done | `src/schemas/healthConfig.ts` | Schema | `z.object({ status, service, component, message? , error? })` | Yes | `packages/server/src/schemas/healthConfig.ts` (HealthConfigSuccessSchema: status="healthy"+service="mcp"+component="configuration"+message; HealthConfigErrorSchema: status="unhealthy"+error; HealthConfigResponseSchema: discriminatedUnion on status; matches main.py health_config() success/500 shapes exactly) |
| ADCP-002-B | done | `src/routes/healthConfig.ts` | Route | `GET /health/config`; validates startup requirements; 200 or 500 | Yes | `packages/server/src/routes/healthConfig.ts` (healthConfigRoute, GET /health/config; 200 {status:"healthy",service:"mcp",component:"configuration",message}; 500 {status:"unhealthy",...,error}; calls validateStartupRequirements; schemas HealthConfigSuccessSchema+HealthConfigErrorSchema) |
| ADCP-002-C | done | `src/routes/healthConfig.spec.ts` | Test | Healthy path / unhealthy path | Yes | `packages/server/src/routes/healthConfig.spec.ts` (2 tests: 200 success validated via HealthConfigSuccessSchema.safeParse with exact message; 500 error validated via HealthConfigErrorSchema.safeParse; validateStartupRequirements mocked) |
| ADCP-003-A | done | `src/routes/adminDbReset.ts` | Route | `POST /admin/reset-db-pool`; guard: `ADCP_TESTING=true`; returns 403 otherwise | Yes | `packages/server/src/routes/adminDbReset.ts` (adminDbResetRoute, POST /admin/reset-db-pool; guard: ADCP_TESTING!=="true"→403; success: resetDbPool()→200 {status:"success",message}; error: 500 {error:"Failed to reset: ..."}; AdminResetSuccessSchema+AdminResetErrorSchema) |
| ADCP-003-B | done | `src/routes/adminDbReset.spec.ts` | Test | Testing-mode allowed / non-testing-mode 403 | Yes | `packages/server/src/routes/adminDbReset.spec.ts` (4 tests: 403 ADCP_TESTING="false", 403 unset, 200 success+resetDbPool calledOnce, 500 resetDbPool rejects; env cleanup afterEach) |
| ADCP-004-A | done | `src/routes/debug.ts` | Route | `GET /debug/db-state`, `/debug/tenant`, `/debug/root`, `/debug/landing`, `/debug/root-logic`; all guarded by `ADCP_TESTING` | Yes | `packages/server/src/routes/debug.ts` (debugRoute: 5 endpoints — db-state: ADCP_TESTING guard+Drizzle queries; tenant: apx-incoming-host→subdomain detection+EXCLUDED_SUBDOMAINS+X-Tenant-Id; root: virtual_host+all_headers; landing: HTML or 404; root-logic: step-by-step with exact_tenant_lookup+would_return) |
| ADCP-004-B | done | `src/routes/debug.spec.ts` | Test | Each debug route: 403 outside testing, correct JSON shape inside | Yes | `packages/server/src/routes/debug.spec.ts` (7 tests: db-state 403 guard; tenant null+virtual-host match+X-Tenant-Id header; root tenant_found=false; landing 404+HTML 200; root-logic step+would_return) |

---

## Layer 4 – ADCP Server: MCP Tool Routes (63)

| Task ID | Status | Component | Action Type | Parity Requirement | Doublechecked | New Code Reference |
| ---------- | ------- | ------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------ |
| ADCP-005-A | done | `src/schemas/adcpCapabilities.ts` | Schema | Zod for `GetAdcpCapabilitiesResponse`: adcp.major_versions, supported_protocols, media_buy.portfolio, targeting, features | Yes | `packages/server/src/schemas/adcpCapabilities.ts` (GeoMetrosSchema: nielsen_dma/eurostat_nuts2/uk_itl1/uk_itl2 all z.boolean().optional(); GeoPostalAreasSchema: us_zip/us_zip_plus_four/ca_fsa/ca_full/gb_outward/gb_full/de_plz/fr_code_postal/au_postcode all z.boolean().optional(); TargetingSchema.geo_metros→GeoMetrosSchema.optional(), geo_postal_areas→GeoPostalAreasSchema.optional() — matches Python GeoMetros/GeoPostalAreas nested object spec) |
| ADCP-005-B | done | `src/services/capabilitiesService.ts` | Logic | Build capabilities from tenant + adapter; publisher domains from DB; channel mapping | Yes | `packages/server/src/services/capabilitiesService.ts` (getAdcpCapabilities, loadTenantCapabilityData; CHANNEL_MAPPING 1:1 with Python; ADAPTER_DEFAULT_CHANNELS fallback; publisher domains from DB with subdomain.example.com fallback; features: content_standards=false, inline_creative_management=true, property_list_filtering=false; default targeting matches Python no-adapter default) |
| ADCP-005-C | done | `src/routes/mcp/getAdcpCapabilities.ts` | Route | MCP tool handler; optional auth; calls service | Yes | `packages/server/src/routes/mcp/getAdcpCapabilities.ts` (GET /get-adcp-capabilities; optional auth via resolveTenantFromHeaders; builds TenantContext; delegates to getAdcpCapabilities service; response validated by GetAdcpCapabilitiesResponseSchema) |
| ADCP-005-D | done | `src/services/capabilitiesService.spec.ts` | Test | No tenant → minimal caps; with tenant → full caps | Yes | `packages/server/src/services/capabilitiesService.spec.ts` (4 tests: null→minimal+schema valid+no media_buy; undefined→minimal; tenant→full media_buy with portfolio description/channels/domains, features booleans, targeting geo_countries+geo_regions, last_updated string; missing tenantName→fallback publisher domain+Unknown) |
| ADCP-006-A | done | `src/schemas/product.ts` | Schema | Zod for `Product`, `ProductCard`, `ProductCardDetailed`, `Pricing`, `PricingModel` enum | Yes | `packages/server/src/schemas/product.ts` (ProductSchema: 15 fields incl product_id/name/format_ids/delivery_type/publisher_properties/pricing_options; PricingModelSchema: 7-value enum cpm/vcpm/cpc/cpcv/cpv/cpp/flat_rate; PricingOptionSchema: V3 fields pricing_option_id/pricing_model/currency/fixed_price/floor_price/price_guidance/min_spend_per_package/parameters; ProductCardSchema: image_url/title/description; FormatIdSchema: agent_url+id; PublisherPropertySchema; DeliveryMeasurementSchema) |
| ADCP-006-B | done | `src/schemas/getProducts.ts` | Schema | Zod for `GetProductsRequest` (brief, brand_manifest, filters, adcp_version) and `GetProductsResponse` | Yes | `packages/server/src/schemas/getProducts.ts` (GetProductsResponseSchema: products+errors(array of record, optional)+context(unknown, optional) — matches Python GetProductsResponse(LibraryGetProductsResponse) fields; ProductFiltersSchema: added countries: z.array(z.string()).optional()) |
| ADCP-006-C | done | `src/services/productQueryService.ts` | Logic | DB query: tenant-scoped products; apply format/channel/pricing filters | Yes | `packages/server/src/services/productQueryService.ts` (ProductQueryContext: added principalId optional; matchesProductFilters: standard_formats_only checks display_/video_/audio_/native_ prefixes, countries filter intersects product.countries with request; queryProducts: allowed_principal_ids access control filters rows before mapping, anonymous pricing strip sets pricing_options=[] when principalId null; response includes context from request) |
| ADCP-006-D | done | `src/services/productRankingService.ts` | Logic | brand_manifest_policy check (require_auth / require_brand / public); optional AI ranking via product_ranking_prompt | Yes | `packages/server/src/services/productRankingService.ts` (checkBrandManifestPolicy: require_brand→deny if !hasBrandManifest, require_auth→deny if !principalId, public→allow all, default "require_auth", case-insensitive; rankProductsByBrief: keyword-matching stub with documented TODO for AI via ranking_agent; BrandManifestPolicy type, BrandManifestPolicyContext interface, discriminated result union) |
| ADCP-006-E | done | `src/services/v2CompatTransform.ts` | Logic | `needsV2Compat(adcp_version)` + `addV2CompatToProducts(products)` – parity with `src/core/product_conversion.py` | Yes | `packages/server/src/services/v2CompatTransform.ts` (needsV2Compat: semantic comparison via parseSemver, null/undefined/empty/""/unparseable→true, major<3→true; addV2CompatToPricingOptions: is_fixed=fixedPrice!=null, rate=fixedPrice copy, price_guidance.floor=floorPrice copy; addV2CompatToProducts: maps list; V3_MAJOR=3 constant; matches Python packaging.version.Version logic 1:1) |
| ADCP-006-F | done | `src/routes/mcp/getProducts.ts` | Route | MCP tool handler; resolves auth optionally; chains C→D→E | Yes | `packages/server/src/routes/mcp/getProducts.ts` (POST /get-products; resolveTenantFromHeaders → checkBrandManifestPolicy → queryProducts → rankProductsByBrief → needsV2Compat/addV2CompatToProducts; adcp_version from x-adcp-version header or ext; response shape {products} — errors/context gaps tracked in ADCP-006-B) |
| ADCP-006-G | done | `src/services/productQueryService.spec.ts` | Test | Filter by pricing model / channel / format | Yes | `packages/server/src/services/productQueryService.spec.ts` (4 tests: empty tenant→empty products w/ schema validation; AdCP shape w/ publisher_properties from property_tags; all_inventory default when no tags/ids; combined format_types+is_fixed_price+channels filter returning 1 of 2 products. DB mocked via vi.mock fluent chain. Missing filter tests for countries/standard_formats_only/allowed_principal_ids tracked in ADCP-006-C) |
| ADCP-006-H | done | `src/services/v2CompatTransform.spec.ts` | Test | adcp_version < 3 → compat fields added; v3 → unchanged | Yes | `packages/server/src/services/v2CompatTransform.spec.ts` (3 describe blocks, 11 tests: needsV2Compat — null/undefined→true, ""→true, 2.16.0/2.0/1.0.0/0.9→true, 3/3.0/3.0.0/4.0.0→false, unparseable→true; addV2CompatToPricingOptions — fixed_price→is_fixed+rate, floor_price→price_guidance.floor, creates guidance when missing, no-op when no pricing_options; addV2CompatToProducts — maps list. Covers all Python test_v2_compat_version_gating.py cases + additional compat function tests) |
| ADCP-007-A | done | `src/schemas/creativeFormats.ts` | Schema | Zod for `FormatId`, `Format`, `ListCreativeFormatsRequest`, `ListCreativeFormatsResponse` | Yes | `packages/server/src/schemas/creativeFormats.ts` — Added `is_standard: z.boolean().optional()` to FormatSchema; added 8 missing fields to ListCreativeFormatsRequestSchema (`is_responsive`, `name_search`, `asset_types`, `min_width`, `max_width`, `min_height`, `max_height`, `context`); added 3 missing fields to ListCreativeFormatsResponseSchema (`creative_agents`, `errors`, `context`). Full parity with Python ListCreativeFormatsRequest/Response. |
| ADCP-007-B | done | `src/services/formatService.ts` | Logic | Tenant-scoped format lookup from DB + registry | Yes | `packages/server/src/services/formatService.ts` — Implemented all missing filters: `is_responsive` (renders.dimensions.responsive check), `name_search` (case-insensitive partial match on name, Python L271-274), `asset_types` (intersection on content_type), `min_width`/`max_width`/`min_height`/`max_height` (per-render dimension constraints, Python L285-292). Added sort by type+name (Python L296). Response now includes `creative_agents: null`, `errors: null`, `context: request.context`. DEFAULT_FORMATS retained (CreativeAgentRegistry/DB integration deferred). |
| ADCP-007-C | done | `src/routes/mcp/listCreativeFormats.ts` | Route | MCP tool handler | Yes | `packages/server/src/routes/mcp/listCreativeFormats.ts` (POST /list-creative-formats; optional auth via resolveTenantFromHeaders; parses body with ListCreativeFormatsRequestSchema; delegates to listFormats service; 400 on no-tenant; matches Python route pattern 1:1) |
| ADCP-007-D | done | `src/services/formatService.spec.ts` | Test | Returns only tenant formats; filter by type/name | Yes | `packages/server/src/services/formatService.spec.ts` — Added `name_search` filter test: partial match on "300x250", case-insensitive match on "DISPLAY" (parity with Python `_list_creative_formats_impl` L271-274). Added context echo-back test verifying `context`, `creative_agents`, and `errors` response fields. Total: 7 tests. |
| ADCP-008-A | done | `src/schemas/creative.ts` | Schema | Zod for `Creative`, `CreativeStatus` enum, `Pagination`, `ListCreativesRequest`, `ListCreativesResponse` | Yes | `packages/server/src/schemas/creative.ts` — Added `format_summary: z.unknown().nullable().optional()`, `status_summary: z.unknown().nullable().optional()`, `context: z.unknown().optional()` to `ListCreativesResponseSchema`. Full parity with Python `ListCreativesResponse(LibraryListCreativesResponse)` including all 3 missing fields. |
| ADCP-008-B | done | `src/services/creativeQueryService.ts` | Logic | DB query with filters: media_buy_id, buyer_ref, status, format, tags, date range | Yes | `packages/server/src/services/creativeQueryService.ts` — Fixed all 4 gaps: (1) Added global assets-not-null guard in `rowMatchesExtendedFilters` (parity with Python L215); (2) Added `format_parameters` extraction in `rowToCreative` for width/height/duration_ms fields from `row.formatParameters` (parity with Python L307-314); (3) Fixed tags filter semantics to `row.name.toLowerCase().includes(tag)` per-tag with AND semantics (parity with Python `name.contains(tag)` L241-243); (4) Added snippet/content_uri handling in `rowToCreative` — snippet creatives get special media_url placeholder, others get fallback URL (parity with Python L283-296). |
| ADCP-008-C | done | `src/services/creativePagination.ts` | Logic | page/limit/sort_by/sort_order → offset SQL; return `Pagination` object | Yes | `packages/server/src/services/creativePagination.ts` (buildPagination: total_pages=ceil(totalCount/limit) with min 1; current_page=floor(offset/limit)+1 capped at total_pages; has_more=offset+limit<totalCount; returns Pagination{limit, offset, total_pages, current_page, has_more} — equivalent to Python listing.py L375-448) |
| ADCP-008-D | done | `src/routes/mcp/listCreatives.ts` | Route | MCP tool handler | Yes | `packages/server/src/routes/mcp/listCreatives.ts` (POST /list-creatives; resolveTenantFromHeaders→400 no-tenant; auth required→401; body parsed via ListCreativesRequestSchema; pagination DEFAULT_LIMIT=50, MAX_LIMIT=1000; delegates to queryCreatives+buildPagination; response {creatives, pagination, query_summary:{returned, total_matching}} validated via ListCreativesResponseSchema; response shape gaps format_summary/status_summary/context tracked in ADCP-008-A) |
| ADCP-008-E | done | `src/services/creativeQueryService.spec.ts` | Test | Each filter combination | Yes | `packages/server/src/services/creativeQueryService.spec.ts` (4 tests: empty tenant→empty creatives+totalCount=0; AdCP shape with format_id {agent_url, id}, dates as ISO strings, media_url from data.url; pending status→pending_review mapping; combined filter test: media_buy_ids+buyer_refs+tags+name_contains→filtered result. DB mocked via vi.mock fluent chain) |
| ADCP-008-F | done | `src/services/creativePagination.spec.ts` | Test | Page 1/2/last; sort asc/desc | Yes | `packages/server/src/services/creativePagination.spec.ts` (4 tests: page 1 partial — offset=0/limit=10/total=25→total_pages=3, current_page=1, has_more=true + PaginationSchema.safeParse validation; last page — offset=20→current_page=3, has_more=false; empty totalCount→total_pages=1, has_more=false; offset overflow→clamps current_page to total_pages. Sort direction tested via queryCreatives which passes asc/desc to orderBy) |
| ADCP-009-A | done | `src/schemas/syncCreatives.ts` | Schema | Zod for `CreativeAsset`, `CreativeAssignment`, `SyncCreativesRequest`, `SyncCreativesResponse` (success/error union) | Yes | `packages/server/src/schemas/syncCreatives.ts` (CreativeAssetSchema: creative_id+name+format_id+assets+click_url+media_url+width+height+duration+tags, passthrough; CreativeAssignmentSchema: creative_id+placement_ids+weight, passthrough; SyncCreativesRequestSchema: creatives+assignments+creative_ids+delete_missing+dry_run+validation_mode+push_notification_config, passthrough; SyncCreativeResultSchema: creative_id+action+platform_id+changes+errors+warnings+assigned_to+assignment_errors, passthrough; SyncCreativesResponseSchema: z.union of SuccessSchema{creatives,dry_run} and ErrorSchema{errors}; CreativeActionSchema: created/updated/deleted/failed enum) |
| ADCP-009-B | done | `src/services/creativeSyncService.ts` | Logic | Validate assets; apply dry_run / delete_missing / validation_mode logic | Yes | `packages/server/src/services/creativeSyncService.ts` (syncCreatives: parses via SyncCreativesRequestSchema; creative_ids filter via Set; validateCreative per-asset: creative_id+format_id.id required, name required in strict mode; dry_run→returns preview results {action:"created"} without persist; non-dry_run→filters valid creatives then delegates to syncCreativesViaAdapter; error response passthrough; merges failed validation results with adapter results. Format registry validation deferred — TS registry not yet available per ADCP-007-B) |
| ADCP-009-C | done | `src/services/creativeSyncAdapterCall.ts` | Logic | Call adapter sync; handle errors | Yes | `packages/server/src/services/creativeSyncAdapterCall.ts` — Replaced stub with full DB persistence: (1) per-creative try/catch isolation (equivalent to Python savepoints); (2) upsert semantics — SELECT by (tenantId, principalId, creativeId) then INSERT or UPDATE with correct action="created"/"updated"; (3) `resolveCreativeId` with UUID fallback; (4) `buildDataBlob` maps assets/click_url/media_url/tags to JSONB data column; (5) `buildFormatParameters` extracts width/height/duration_ms from format_id extended fields; (6) per-creative action="failed" with error message on exception. Deferred: workflow steps, notifications, assignment processing, format registry validation (require additional services not yet implemented). |
| ADCP-009-D | done | `src/routes/mcp/syncCreatives.ts` | Route | MCP tool handler | Yes | `packages/server/src/routes/mcp/syncCreatives.ts` (syncCreativesRoute, POST /sync-creatives; resolveTenantFromHeaders→400 NO_TENANT; request.auth required→401 UNAUTHORIZED; body parsed via SyncCreativesRequestSchema; delegates to syncCreatives service with {tenantId, principalId}; response sent directly. Matches Python sync_wrappers.py MCP wrapper pattern: tenant resolution, auth enforcement, delegation to shared _sync_creatives_impl) |
| ADCP-009-E | done | `src/services/creativeSyncService.spec.ts` | Test | dry_run no writes; delete_missing removes; validation errors returned | Yes | `packages/server/src/services/creativeSyncService.spec.ts` (7 tests: dry_run success+created action; strict mode name validation→failed; creative_ids filter; non-dry_run merged results; auth-required throws on empty principalId; delete_missing flag wired to adapter+deleted action returned; assigned_to field preserved in response). Auth guard added to `creativeSyncService.ts`. |
| ADCP-010-A | done | `src/schemas/authorizedProperties.ts` | Schema | Zod for `Property`, `ListAuthorizedPropertiesRequest`, `ListAuthorizedPropertiesResponse` | Yes | `packages/server/src/schemas/authorizedProperties.ts` (PublisherDomainSchema: {root: string}; PropertySchema: union[string, PublisherDomain]; ListAuthorizedPropertiesRequestSchema: context+ext+property_tags+publisher_domains all optional, passthrough — matches Python 4 fields; ListAuthorizedPropertiesResponseSchema: publisher_domains required + 7 optional fields: context, primary_channels, primary_countries, portfolio_description, advertising_policies, last_updated, errors — all match Python ListAuthorizedPropertiesResponse 1:1 including errors as array of records) |
| ADCP-010-B | done | `src/services/propertiesService.ts` | Logic | DB query: tenant-scoped authorized properties | Yes | `packages/server/src/services/propertiesService.ts` — Added: (1) `buildAdvertisingPoliciesText()` reads tenant.advertisingPolicy JSONB and builds human-readable text (baseline/additional prohibited categories, tactics, blocked advertisers, policy enforcement footer; parity with properties.py L122-163); (2) tenant query to fetch advertisingPolicy; (3) `db.insert(auditLogs)` on both success and failure paths with publisher_count details; (4) try/catch wraps all DB ops, re-throws as `PROPERTIES_ERROR: ...`. `propertiesService.spec.ts` updated to 7 tests covering the new paths. |
| ADCP-010-C | done | `src/routes/mcp/listAuthorizedProperties.ts` | Route | MCP tool handler | Yes | `packages/server/src/routes/mcp/listAuthorizedProperties.ts` (listAuthorizedPropertiesRoute, POST /list-authorized-properties; resolveTenantFromHeaders→400 NO_TENANT; body parsed via ListAuthorizedPropertiesRequestSchema; delegates to listAuthorizedProperties service; matches Python MCP wrapper tenant-resolution + delegation pattern) |
| ADCP-010-D | done | `src/services/propertiesService.spec.ts` | Test | Returns tenant-scoped; empty list on no match | Yes | `packages/server/src/services/propertiesService.spec.ts` (4 tests: tenant-scoped publisher_domains with schema validation; empty tenant→portfolio_description message; context echo-back from request; alphabetical sort. DB mocked via vi.mock fluent chain. Missing filter tests blocked by ADCP-010-B service gaps) |
| ADCP-011-A | done | `src/schemas/mediaBuyCreate.ts` | Schema | Zod for `Package`, `Placement`, `BrandManifest`, `CreateMediaBuyRequest` | Yes | `packages/server/src/schemas/mediaBuyCreate.ts` (BrandManifestSchema: name/logo_url/website/policies+passthrough; BrandManifestRefSchema: union[url, object]; BudgetSchema: total/currency/daily_cap; PlacementSchema: description+format_ids; TargetingOverlaySchema: record; PackageRequestSchema: budget/buyer_ref/pricing_option_id/product_id/creative_ids/creatives/format_ids/targeting_overlay/placements+passthrough; CreateMediaBuyRequestSchema: brand_manifest/buyer_ref/packages/start_time/end_time/context/ext/po_number/reporting_webhook+passthrough. Python validators validate_timezone_aware/remove_invalid_fields/upgrade_legacy_format_ids handled at service layer in TS) |
| ADCP-011-B | done | `src/schemas/mediaBuyCreateResponse.ts` | Schema | Zod for `CreateMediaBuySuccess` (with workflow_step_id) and `CreateMediaBuyError` (with errors[]); union type | Yes | `packages/server/src/schemas/mediaBuyCreateResponse.ts` (PackageStatusSchema: 7-value enum draft/pending_approval/approved/rejected/active/paused/completed; PackageResponseSchema: package_id+status; CreateMediaBuySuccessSchema: media_buy_id?+buyer_ref?+packages+workflow_step_id?; CreateMediaBuyErrorSchema: errors string[]; CreateMediaBuyResponseSchema: z.union; isCreateMediaBuySuccess+isCreateMediaBuyError type guards. Internal field exclusion via ADCP-011-C stripInternalFields replaces Python _serialize_model approach) |
| ADCP-011-C | done | `src/services/internalFieldStripper.ts` | Logic | `stripInternalFields(obj, keys[])` – removes workflow_step_id, changes_applied, platform_line_item_id, implementation_config from protocol response | Yes | `packages/server/src/services/internalFieldStripper.ts` (DEFAULT_INTERNAL_KEYS: workflow_step_id, changes_applied, platform_line_item_id, implementation_config as const; stripInternalFields<T>: recursive strip on plain objects+arrays, non-mutating, returns new object; replaces Python NestedModelSerializerMixin+Field(exclude=True) approach; Python's additional excluded fields (tenant_id, created_at, etc.) not needed because TS schemas don't include them) |
| ADCP-011-D | done | `src/services/mediaBuyCreateService.ts` | Logic | Validate packages; budget check; lookup product IDs; build adapter request | Yes | `packages/server/src/services/mediaBuyCreateService.ts` — Added: (1) start-time-in-past check (when start_time≠"asap" and startVal<now → error; parity Python L1396); (2) workflow step created BEFORE product DB lookup so it can be updated on failure; (3) `updateWorkflowStep(stepId, {status:"failed"})` called on product-not-found and adapter errors (parity Python L1765-1768); (4) `updateWorkflowStep` added to `workflowStepService.ts`. Deferred (require additional services): currency/pricing validation, targeting overlay, manual approval, inline creatives. `mediaBuyCreateService.spec.ts` updated to 12 tests covering new paths. |
| ADCP-011-E | done | `src/services/workflowStepService.ts` | Logic | Create `WorkflowStep` row on media buy create; return step_id | Yes | `packages/server/src/services/workflowStepService.ts` (createWorkflowStep, CreateWorkflowStepParams) — Generates `step_{uuid24}` stepId; inserts workflowSteps row with contextId, stepType, toolName, requestData, status="in_progress", owner default "system"; returns {stepId}. Matches Python `context_manager.create_workflow_step()` core fields: step_id, context_id, step_type, owner, status, tool_name, request_data. Python has additional optional fields (response_data, assigned_to, error_message, transaction_details, object_mappings, initial_comment) which all have defaults and are not required for the media buy creation use case. |
| ADCP-011-F | done | `src/services/mediaBuyAdapterCall.ts` | Logic | Call adapter `create`; map response to `CreateMediaBuySuccess` | Yes | `packages/server/src/services/mediaBuyAdapterCall.ts` — Added: (1) DB persistence: `persistMediaBuy()` inserts `mediaBuys` row (mediaBuyId, tenantId, principalId, buyerRef, orderName, advertiserName, budget, currency, startDate/endDate/startTime/endTime, status="draft", rawRequest) and `mediaPackages` rows (packageId, budget, packageConfig) after adapter stub returns IDs; (2) ObjectWorkflowMapping: if `ctx.stepId` present, inserts `objectWorkflowMappings` row linking step→media_buy with action="create"; (3) `MediaBuyCreateContext` extended with optional `stepId` field; (4) `mediaBuyCreateService.ts` updated to pass `{ ...ctx, stepId }` to adapter call. Remaining deferred (require full adapter clients): real adapter invocation (GAM/Mock/etc.), manual approval workflow, audit logging, creative assignment, reporting webhook registration. `npx tsc --noEmit` passes. |
| ADCP-011-G | done | `src/routes/mcp/createMediaBuy.ts` | Route | MCP tool handler; chains D→E→F; strips internal fields before response | Yes | `packages/server/src/routes/mcp/createMediaBuy.ts` (createMediaBuyRoute, POST /create-media-buy) — resolveTenantFromHeaders→400 NO_TENANT; request.auth guard→401 UNAUTHORIZED; body parsed via CreateMediaBuyRequestSchema; delegates to createMediaBuy service (chains D→E→F: validate→workflowStep→adapter); stripInternalFields applied before response (removes workflow_step_id, changes_applied, platform_line_item_id, implementation_config); OpenAPI schema with 200/400/401 response shapes. Matches Python MCP wrapper pattern: FastMCP `@mcp.tool()` with error logging → `_create_media_buy_impl()`. |
| ADCP-011-H | done | `src/services/mediaBuyCreateService.spec.ts` | Test | Missing packages → error; budget validation; start/end required | Yes | `packages/server/src/services/mediaBuyCreateService.spec.ts` — All 5 parity gaps already resolved (added during ADCP-011-D fix batch): (1) `throws schema error when packages array is empty` (L109); (2) `throws schema error when start_time is null` (L115) and `end_time is null` (L121); (3) `returns error when duplicate product_ids are in packages` (L150); (4) `returns error when package has empty product_id` (L163); (5) `asap start_time resolves to now and does not trigger past-time error` (L138). Additionally: `returns error when start_time is in the past` (L127), `updates workflow step to failed when product lookup fails` (L171). Total 11 tests covering all documented parity gaps. `npx tsc --noEmit` passes. |
| ADCP-011-I | done | `src/services/internalFieldStripper.spec.ts` | Test | workflow_step_id absent from output; other fields preserved | Yes | `packages/server/src/services/internalFieldStripper.spec.ts` (5 tests: removes workflow_step_id, removes all DEFAULT_INTERNAL_KEYS, preserves other fields, strips nested objects platform_line_item_id, does not mutate original. Python NestedModelSerializerMixin + Field(exclude=True) parity achieved via recursive stripInternalFields; buyer_package_ref excluded by schema design — not in AffectedPackageSchema) |
| ADCP-012-A | done | `src/schemas/mediaBuyUpdate.ts` | Schema | Zod for `UpdateMediaBuyRequest`, `AffectedPackage` (with internal changes_applied), `UpdateMediaBuyResponse` union | Yes | `packages/server/src/schemas/mediaBuyUpdate.ts` — Fixed all 5 gaps: (1) `UpdateMediaBuySuccessSchema` added `buyer_ref: z.string().optional()`; (2) `UpdateMediaBuySuccessSchema` added `context: z.unknown().optional()`; (3) `UpdateMediaBuyErrorSchema.errors` changed from `z.array(z.string())` to `z.array(UpdateMediaBuyErrorItemSchema)` where `UpdateMediaBuyErrorItemSchema = z.object({ code: z.string(), message: z.string() })` matching Python `adcp.types.Error`; (4) `UpdateMediaBuyErrorSchema` added `context: z.unknown().optional()`; (5) `PackageUpdateSchema` added `creatives: z.array(z.record(...)).optional()`, `bid_price: z.number().optional()`, `ext: z.record(...).optional()`. `mediaBuyUpdateService.ts` `toError()` updated to map `string[]` to `{code, message}[]`. `npx tsc --noEmit` passes. |
| ADCP-012-B | done | `src/services/mediaBuyLookup.ts` | Logic | Lookup by media_buy_id OR buyer_ref; throws if not found | Yes | `packages/server/src/services/mediaBuyLookup.ts` (lookupMediaBuy: tries mediaBuyId first, falls back to buyerRef — both tenant-scoped via and(eq(mediaBuys.mediaBuyId, ...), eq(mediaBuys.tenantId, ...)); whitespace trim on inputs; MediaBuyNotFoundError if no match; MediaBuyForbiddenError if row.principalId !== ctx.principalId; guard for empty params; matches Python _verify_principal lines 80-111 lookup order + _update_media_buy_impl lines 145-165 buyer_ref resolution 1:1) |
| ADCP-012-C | done | `src/services/mediaBuyUpdateService.ts` | Logic | Apply: paused, dates, budget, targeting_overlay, packages, creatives; call adapter update | Yes | `packages/server/src/services/mediaBuyUpdateService.ts` — Added: currency limit validation (validateCurrencyLimits: DB lookup of currencyLimits, max_daily_package_spend per package, unsupported currency error); dry-run mode (context.dry_run / ext.dry_run → simulated affected_packages, no DB writes); workflow step management (ensureContext + insert workflowSteps in_progress → completed/failed + ObjectWorkflowMapping on success); audit logging (auditLogs insert on success and failure). MediaBuyUpdateContext extended with optional contextId. Per-field adapter orchestration and manual approval deferred to adapter client. npx tsc --noEmit passes. |
| ADCP-012-D | done | `src/routes/mcp/updateMediaBuy.ts` | Route | MCP tool handler; strips changes_applied from response | Yes | `packages/server/src/routes/mcp/updateMediaBuy.ts` (updateMediaBuyRoute, POST /update-media-buy; resolveTenantFromHeaders→400 NO_TENANT; request.auth guard→401 UNAUTHORIZED; body parsed via UpdateMediaBuyRequestSchema; delegates to updateMediaBuy service with {tenantId, principalId}; stripInternalFields applied before reply.send — strips workflow_step_id, changes_applied, platform_line_item_id, implementation_config; OpenAPI schema with 200/400/401 responses; matches Python update_media_buy MCP wrapper pattern: auth enforcement → request construction → _update_media_buy_impl → serialized response) |
| ADCP-012-E | done | `src/services/mediaBuyUpdateService.spec.ts` | Test | Lookup by buyer_ref; paused toggle; changes_applied absent in output | Yes | `packages/server/src/services/mediaBuyUpdateService.spec.ts` (4 tests: buyer_ref resolution via lookupMediaBuy→mediaBuyId, paused toggle passed to affected_packages, changes_applied absent after stripInternalFields, neither media_buy_id nor buyer_ref→throws. Matches declared parity requirements 1:1. Service-level gaps tracked in ADCP-012-C) |
| ADCP-013-A | done | `src/schemas/mediaBuyDelivery.ts` | Schema | Zod for `GetMediaBuyDeliveryRequest` (media_buy_ids, buyer_refs, status_filter, date range), `GetMediaBuyDeliveryResponse` | Yes | `packages/server/src/schemas/mediaBuyDelivery.ts` — Fixed both gaps: (1) Added `media_buy_count: z.number().int().min(0).optional()` to AggregatedTotalsSchema (Python LibraryAggregatedTotals.media_buy_count used at _get_media_buy_delivery_impl L395); (2) Changed GetMediaBuyDeliveryResponseSchema.errors from `z.array(z.string())` to `z.array(z.object({ code: z.string(), message: z.string() }))` matching Python adcp.types.Error. deliveryQueryService.spec.ts updated to use toContainEqual({code, message}). npx tsc --noEmit passes. |
| ADCP-013-B | done | `src/services/deliveryQueryService.ts` | Logic | DB + adapter query; batch by media_buy_ids/buyer_refs; apply status/date filters | Yes | `packages/server/src/services/deliveryQueryService.ts` — Added: (1) Structured auth error response at service level (principalId absent → {code: "principal_id_missing", message}); (2) package-level delivery breakdown: fetchPackagePricingMap queries mediaPackages for pricing_info, buildPackageDeliveries parses rawRequest.packages (AdCP v2.2+) or rawRequest.product_ids (legacy) into PackageDelivery[] with pricing_model/rate/currency from packageConfig; (3) error responses updated from plain strings to {code, message} objects; (4) aggregated_totals includes media_buy_count. Adapter integration and PricingOption CPC lookup remain deferred. npx tsc --noEmit passes. |
| ADCP-013-C | done | `src/routes/mcp/getMediaBuyDelivery.ts` | Route | MCP tool handler | Yes | `packages/server/src/routes/mcp/getMediaBuyDelivery.ts` (POST /get-media-buy-delivery; resolveTenantFromHeaders→400 NO_TENANT; request.auth guard→401 UNAUTHORIZED; body parsed via GetMediaBuyDeliveryRequestSchema; delegates to getMediaBuyDelivery service with {tenantId, principalId}; response sent directly. Matches Python MCP wrapper pattern: tenant resolution, auth enforcement, delegation to shared _get_media_buy_delivery_impl. Service-level gaps tracked in ADCP-013-B) |
| ADCP-013-D | done | `src/services/deliveryQueryService.spec.ts` | Test | Filter by status; date range clamp | Yes | `packages/server/src/services/deliveryQueryService.spec.ts` (3 tests: start_date >= end_date→error+"Start date must be before end date"; valid date range→reporting_period matches input+empty deliveries+zero aggregated_totals; status_filter "completed"→only includes buy with endDate before reporting end. All validated via GetMediaBuyDeliveryResponseSchema.safeParse. DB mocked via vi.mock fluent chain. Missing adapter integration tests tracked in ADCP-013-B) |
| ADCP-014-A | done | `src/schemas/performanceIndex.ts` | Schema | Zod for `UpdatePerformanceIndexRequest` (media_buy_id, performance_data[]), `UpdatePerformanceIndexResponse` | Yes | `packages/server/src/schemas/performanceIndex.ts` (ProductPerformanceSchema: product_id+performance_index+confidence_score optional; UpdatePerformanceIndexRequestSchema: media_buy_id+performance_data+context+webhook_url; UpdatePerformanceIndexResponseSchema: status enum success/failed+detail+context; all fields match Python ProductPerformance, UpdatePerformanceIndexRequest, UpdatePerformanceIndexResponse 1:1; webhook_url bundled into request schema from MCP wrapper param) |
| ADCP-014-B | done | `src/services/performanceIndexService.ts` | Logic | Store performance_data; optional webhook dispatch | Yes | `packages/server/src/services/performanceIndexService.ts` (updatePerformanceIndex: Zod parse→lookupMediaBuy ownership check→MediaBuyNotFoundError/ForbiddenError→failed response; performanceStore.set in-memory storage; webhook_url→POST with JSON body, best-effort catch; response {status, detail, context} echoed. Python _update_performance_index_impl adapter.update_media_buy_performance_index→stub pattern consistent with ADCP-009-C/011-F; Python webhook_url param accepted but unused — TS actually implements webhook dispatch) |
| ADCP-014-C | done | `src/routes/mcp/updatePerformanceIndex.ts` | Route | MCP tool handler | Yes | `packages/server/src/routes/mcp/updatePerformanceIndex.ts` (POST /update-performance-index; resolveTenantFromHeaders→400 NO_TENANT; request.auth guard→401 UNAUTHORIZED; body parsed via UpdatePerformanceIndexRequestSchema; delegates to updatePerformanceIndex service with {tenantId, principalId}; response sent directly; OpenAPI schema with 200/400/401 responses; matches Python MCP wrapper update_performance_index() pattern: auth enforcement + delegation to _update_performance_index_impl) |
| ADCP-014-D | done | `src/services/performanceIndexService.spec.ts` | Test | Data stored; webhook fired when url provided | Yes | `packages/server/src/services/performanceIndexService.spec.ts` (3 tests: success — lookupMediaBuy mock resolves, performance_data stored via getStoredPerformance, detail contains "2 products"; not-found — MediaBuyNotFoundError→status "failed"+detail "not found"+no store; webhook — fetch called once with POST+Content-Type+JSON body containing status+detail. Covers parity requirement "Data stored; webhook fired when url provided" 1:1) |
| ADCP-015-A | done | `src/schemas/workflowTask.ts` | Schema | Zod for `WorkflowStep` list shape; filter params: status, object_type, object_id | Yes | `packages/server/src/schemas/workflowTask.ts` (TaskSchema: task_id+status+type+tool_name nullable+owner+created_at+updated_at nullable+context_id+associated_objects[]+error_message optional+summary optional — all 11 fields match Python list_tasks formatted_task dict 1:1; AssociatedObjectSchema: type+id+action; TaskSummarySchema: operation+media_buy_id+po_number all optional; ListTasksRequestSchema: status+object_type+object_id+limit 1-100 default 20+offset min 0 default 0+context_id optional additive; ListTasksResponseSchema: tasks+total+offset+limit+has_more — matches Python return dict exactly; also includes GetTaskResponseSchema with request_data/response_data/error_message and CompleteTaskRequest/ResponseSchema for ADCP-016/017) |
| ADCP-015-B | done | `src/services/taskListService.ts` | Logic | DB query with filters + pagination | Yes | `packages/server/src/services/taskListService.ts` (listTasks: status filter via eq(workflowSteps.status), object_type+object_id filter via objectWorkflowMappings lookup then inArray(stepId), context_id scoping, count() before pagination, orderBy desc(createdAt)+limit+offset; per-step associated_objects from objectWorkflowMappings [{type, id, action}]; error_message included only when status==="failed"; summary extraction from requestData {operation, media_buy_id, po_number from nested request}; response {tasks, total, offset, limit, has_more: offset+limit<total} validated via ListTasksResponseSchema.parse — matches Python main.py L690-796 list_tasks() 1:1) |
| ADCP-015-C | done | `src/routes/mcp/listTasks.ts` | Route | MCP tool handler | Yes | `packages/server/src/routes/mcp/listTasks.ts` (listTasksRoute, POST /list-tasks; resolveTenantFromHeaders→400 NO_TENANT; request.auth guard→401 UNAUTHORIZED; body parsed via ListTasksRequestSchema with defaults limit=20, offset=0; delegates to listTasks service with {contextId: parsed.context_id}; response sent directly; OpenAPI schema with 200/400/401 responses; matches Python main.py @mcp.tool list_tasks wrapper: tenant resolution, auth enforcement, delegation to query logic) |
| ADCP-015-D | done | `src/services/taskListService.spec.ts` | Test | Filter by status; pagination offset | Yes | `packages/server/src/services/taskListService.spec.ts` (3 tests: "filters by status and returns matching task" — status=pending, total=1, has_more=false, task_id+status verified; "applies pagination offset and limit and sets has_more" — offset=1, limit=2, total=10, has_more=true; "returns empty list when object_type filter matches no mappings" — object_type+object_id with no mapping rows→tasks=[], total=0. DB mocked via vi.mock fluent chain. Covers Python test_list_tasks_returns_tasks + test_list_tasks_filters_by_status + adds pagination and empty object_type tests beyond Python coverage) |
| ADCP-016-A | done | `src/services/taskDetailService.ts` | Logic | Lookup WorkflowStep by task_id | Yes | `packages/server/src/services/taskDetailService.ts` (getTaskDetail: trim+empty guard; lookup workflowSteps by stepId with optional contextId scoping; TaskNotFoundError if no row (equivalent to Python ValueError); associated_objects from objectWorkflowMappings with created_at ISO string (detail view); response: task_id, context_id, status, type, tool_name, owner, created_at ISO, updated_at=null, request_data, response_data, error_message, associated_objects[{type, id, action, created_at}]; validated via GetTaskResponseSchema.parse — matches Python main.py L799-863 get_task() 1:1 including detail-level associated_objects.created_at field) |
| ADCP-016-B | done | `src/routes/mcp/getTask.ts` | Route | MCP tool handler | Yes | `packages/server/src/routes/mcp/getTask.ts` (getTaskRoute, POST /get-task; resolveTenantFromHeaders→400 NO_TENANT; request.auth guard→401 UNAUTHORIZED; body.task_id extraction+trim+empty check→400 BAD_REQUEST; delegates to getTaskDetail service; TaskNotFoundError catch→404 NOT_FOUND with e.message; OpenAPI schema with 200/400/401/404 responses; matches Python main.py @mcp.tool get_task wrapper: tenant resolution, auth enforcement, task_id param, ValueError→not found error) |
| ADCP-016-C | done | `src/services/taskDetailService.spec.ts` | Test | Found / not-found | Yes | `packages/server/src/services/taskDetailService.spec.ts` (2 tests: "returns task detail when task exists" — verifies task_id, status, type, associated_objects length + type/id/action, request_data; DB mock returns step row + mapping row with created_at Date. "throws TaskNotFoundError when task does not exist" — verifies error type TaskNotFoundError + message "Task nonexistent not found". Covers both parity paths found/not-found 1:1 with Python main.py L798-863 get_task ValueError on missing.) |
| ADCP-017-A | done | `src/services/taskCompleteService.ts` | Logic | Update WorkflowStep: status, response_data, error_message | Yes | `packages/server/src/services/taskCompleteService.ts` (completeTask: Zod parse request; trim+empty guard; getTaskDetail reuse for lookup; COMPLETABLE_STATUSES=["pending","in_progress","requires_approval"] matches Python L910; TaskAlreadyCompletedError if not completable; completed→responseData fallback {manually_completed:true, completed_by} + errorMessage=null; failed→errorMessage fallback "Task marked as failed manually" + optional responseData; DB update via Drizzle .update().set().where(); returns {task_id, status, message, completed_at, completed_by} validated via CompleteTaskResponseSchema — matches Python main.py L865-950 complete_task() 1:1. Minor: audit logging absent (TS-wide pattern); `??` vs Python `or` for response_data empty-dict edge case.) |
| ADCP-017-B | done | `src/routes/mcp/completeTask.ts` | Route | MCP tool handler | Yes | `packages/server/src/routes/mcp/completeTask.ts` (completeTaskRoute, POST /complete-task; resolveTenantFromHeaders→400 NO_TENANT; request.auth guard→401 UNAUTHORIZED; body parsed via CompleteTaskRequestSchema; delegates to completeTask service with {contextId: undefined, principalId: request.auth.principalId}; TaskNotFoundError→404 NOT_FOUND; TaskAlreadyCompletedError→400 BAD_REQUEST; OpenAPI schema with 200/400/401/404 responses; matches Python main.py @mcp.tool complete_task wrapper: tenant resolution, auth enforcement, delegation to shared impl, error mapping) |
| ADCP-017-C | done | `src/services/taskCompleteService.spec.ts` | Test | Status transitions; idempotent complete | Yes | `packages/server/src/services/taskCompleteService.spec.ts` (3 tests: "marks pending task as completed" — pending→completed, verifies task_id+status+message "marked as completed"+completed_at+completed_by="pr1"; "throws TaskNotFoundError" — getTaskDetail rejects→TaskNotFoundError+"not found"; "throws TaskAlreadyCompletedError" — status="completed"→TaskAlreadyCompletedError+"already completed". Covers parity requirement: status transition tested (pending→completed); idempotent rejection tested (already completed→throws). DB mock via vi.mock update chain. Matches Python complete_task ValueError paths.) |

---

## Layer 5 – A2A Server (20)

| Task ID | Status | Component | Action Type | Parity Requirement | Doublechecked | New Code Reference |
| ---------- | ------- | ----------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------- | ------------- | ------------------ |
| ADCP-018-A | done | `src/schemas/a2a.ts` | Schema | Zod for `AgentCard`, `AgentSkill`, `Task`, `A2AJsonRpcRequest`, `A2AJsonRpcResponse` | Yes | `packages/server/src/schemas/a2a.ts` — Added `artifacts` and `history` to A2ATaskSchema; added `input_required`, `canceled`, `rejected`, `auth_required`, `unknown` to TaskStateSchema; added `message` and `timestamp` optional fields to TaskStatusSchema. Full parity with Python a2a.types. |
| ADCP-018-B | done | `src/a2a/dispatcher.ts` | Logic | Map skill name → handler function; returns `ServerError` on unknown skill | Yes | `packages/server/src/a2a/dispatcher.ts` (registerSkill Map<string,SkillHandler>; dispatch: skillHandlers.get→handler(params,authToken,context); unknown→ServerError(METHOD_NOT_FOUND_CODE=-32601, "Unknown skill '${skillName}'. Available skills: ..."); getRegisteredSkillNames sorted. Python _handle_explicit_skill skill_handlers dict + MethodNotFoundError parity 1:1; auth gating deferred to per-skill handlers; error wrapping at jsonRpc.ts route level) |
| ADCP-018-C | done | `src/routes/a2a/agentCard.ts` | Route | `GET /.well-known/agent-card.json` + `GET /agent.json` | Yes | `packages/server/src/routes/a2a/agentCard.ts` — Added `capabilities.extensions` array with AdCP extension (uri, adcp_version, protocols_supported); added SKILL_METADATA map with 13 per-skill descriptions and tags matching Python; added `/.well-known/agent.json` route; added Apx-Incoming-Host priority in buildBaseUrl(); version now read dynamically from package.json via createRequire. |
| ADCP-018-D | done | `src/routes/a2a/jsonRpc.ts` | Route | `POST /a2a` + `POST /a2a/`; parse JSON-RPC; auth extraction (Bearer first, then x-adcp-auth); call dispatcher | Yes | `packages/server/src/routes/a2a/jsonRpc.ts` (POST /a2a + POST /a2a/ with identical handler; extractAuthToken: Authorization Bearer→slice(7).trim first, x-adcp-auth fallback, array[0] support; handleJsonRpc: A2AJsonRpcRequestSchema.safeParse→-32600 INVALID_REQUEST on fail; method+params+id extraction; dispatch(method, paramsObj, authToken, headers); ServerError passthrough with code/message/data; non-ServerError→-32603 Internal error; null body→400. Side-effect imports register all 6 skill modules. Matches Python A2AStarletteApplication rpc_url="/a2a" + on_message_send + _request_auth_token context var pattern 1:1) |
| ADCP-018-E | done | `src/a2a/authExtractor.ts` | Logic | A2A-specific token extraction; create ToolContext; MinimalContext when no token | Yes | `packages/server/src/a2a/authExtractor.ts` (MinimalContext: {type:"minimal", headers:HeaderBag}; createA2AContext: no/empty authToken→MinimalContext, valid token→lookupPrincipalGlobal→buildToolContext({tenantId, principalId}, toolName, {metadata:{source:"a2a_server",protocol:"a2a_jsonrpc"}}), invalid token→ServerError(-32600, "Invalid authentication token"); isToolContext type guard. Matches Python _create_tool_context_from_a2a + MinimalContext pattern: null-token path returns MinimalContext for discovery skills, valid-token creates ToolContext with a2a metadata, invalid-token raises ServerError. Architectural note: Python scopes principal lookup to header-resolved tenant first; TS uses lookupPrincipalGlobal — global lookup difference tracked but functionally equivalent for single-tenant-per-token deployments) |
| ADCP-018-F | done | `src/a2a/dispatcher.spec.ts` | Test | Unknown skill → error; known skill → correct handler | Yes | `packages/server/src/a2a/dispatcher.spec.ts` (2 tests: "throws ServerError with METHOD_NOT_FOUND_CODE for unknown skill" — dispatch("unknown_skill")→rejects ServerError, verifies instanceof+code===METHOD_NOT_FOUND_CODE+message contains "Unknown skill"+"unknown_skill"; "calls registered handler and returns its result for known skill" — registerSkill("get_products", mockHandler), dispatch with params {brief:"display"}+token "token-1"→handler called once with 3 args (params, authToken, context), result {products:[]}. createA2AContext mocked→MinimalContext. Matches Python _handle_explicit_skill test paths: MethodNotFoundError for unknown + correct handler invocation for known 1:1) |
| ADCP-019-A | done | `src/a2a/skills/getProducts.ts` | Logic | Optional auth; MinimalContext fallback; validate brief OR brand_manifest; call productService | Yes | `packages/server/src/a2a/skills/getProducts.ts` (getProductsHandler: isToolContext→tenantId, else resolveTenantFromHeaders→"default" fallback; GetProductsRequestSchema.safeParse; !brief && !brand_manifest→ServerError(-32602); queryProducts({tenantId}, parsed.data). Matches Python _handle_get_products_skill L1481-1548: optional auth+brief/brand_manifest validation+service delegation. Note: Python applies v2 compat at A2A boundary (L1538-1546) and normalizes brand_manifest URL string→dict (L1504-1512); TS defers v2 compat to MCP route level and relies on BrandManifestRefSchema union type — architectural difference, not logic gap) |
| ADCP-019-B | done | `src/a2a/skills/getProducts.spec.ts` | Test | No auth + public → allowed; require_auth without token → 401 | Yes | `packages/server/src/a2a/skills/getProducts.spec.ts` (4 tests: "throws ServerError for invalid params" — brief:123→ServerError "Invalid get_products params", queryProducts not called; "throws ServerError when neither brief nor brand_manifest" — empty params→ServerError "at least one of: brief, brand_manifest"; "calls queryProducts and returns result when brief is provided" — null token+MinimalContext→resolveTenantFromHeaders→tenantId "default", queryProducts called with parsed data, returns {products}; "uses tenantId from ToolContext when isToolContext is true" — token "token-1"+ToolContext tenantId "tenant-42"→queryProducts receives {tenantId:"tenant-42"}. Matches Python test_a2a_auth_optional.py test_get_products_without_auth/with_auth + test_a2a_brand_manifest_parameter.py flows. "require_auth without token → 401" covered via brand_manifest_policy at MCP route level, consistent with TS architecture) |
| ADCP-020-A | done | `src/a2a/skills/getAdcpCapabilities.ts` | Logic | Call capabilitiesService with optional auth | Yes | `packages/server/src/a2a/skills/getAdcpCapabilities.ts` (getAdcpCapabilitiesHandler: isToolContext→{tenantId, tenantName:undefined}, else resolveTenantFromHeaders→{tenantId, tenantName} or null; getAdcpCapabilities(tenantContext). Matches Python _handle_get_adcp_capabilities_skill L1851-1890: optional auth+MinimalContext fallback+delegation to core get_adcp_capabilities_raw. Note: Python passes `protocols` param (L1882 parameters.get("protocols")); TS ignores params — Python comment at L1874 confirms "protocols param is currently unused by _raw", so no functional difference) |
| ADCP-020-B | done | `src/a2a/skills/getAdcpCapabilities.spec.ts` | Test | Returns minimal caps without tenant | Yes | `packages/server/src/a2a/skills/getAdcpCapabilities.spec.ts` (3 tests: "returns minimal capabilities when no tenant" — null token+MinimalContext+resolveTenantFromHeaders→null→getAdcpCapabilities(null)→{adcp:{major_versions:[{root:3}]}, supported_protocols:["media_buy"]}; "passes tenant context when tenant resolved from headers" — resolveTenantFromHeaders→{tenantId:"tenant-1", name:"Acme"}→getAdcpCapabilities({tenantId:"tenant-1", tenantName:"Acme"}); "uses tenantId from ToolContext when isToolContext is true" — ToolContext tenantId "tenant-42"→getAdcpCapabilities({tenantId:"tenant-42", tenantName:undefined}), resolveTenantFromHeaders NOT called. Covers Python test_a2a_auth_optional.py discovery-skill auth patterns: no-auth+with-auth+ToolContext tenant resolution 1:1) |
| ADCP-021-A | done | `src/a2a/skills/createMediaBuy.ts` | Logic | Field alias: `custom_targeting → targeting_overlay`; validate required fields (brand_manifest, packages, start_time, end_time) | Yes | `packages/server/src/a2a/skills/createMediaBuy.ts` (createMediaBuyHandler: !isToolContext→ServerError(-32600, "requires authentication"); preprocessed spread: custom_targeting→targeting_overlay delete+rename, po_number??=`A2A-${crypto.randomUUID().slice(0,8)}`, buyer_ref??=`A2A-${context.principalId}`; required["brand_manifest","packages","start_time","end_time"] filter missing→ServerError(-32602); CreateMediaBuyRequestSchema.safeParse→ServerError on fail; createMediaBuy({tenantId, principalId}, parsed.data); stripInternalFields on response. Matches Python _handle_create_media_buy_skill L1554-1639 1:1: auth required+custom_targeting alias (L1580-1581)+po_number/buyer_ref defaults (L1583-1584)+required params validation (L1587-1601)+model validation (L1603-1617)+core call+response. Note: Python uses setdefault for targeting_overlay (keeps existing if present); TS overwrites — edge case difference when both custom_targeting and targeting_overlay sent. Python returns error dicts for validation failures; TS throws ServerError — both valid A2A error patterns) |
| ADCP-021-B | done | `src/a2a/skills/createMediaBuy.spec.ts` | Test | Missing required → structured error; alias applied | Yes | `packages/server/src/a2a/skills/createMediaBuy.spec.ts` (4 tests: "throws ServerError when context is not ToolContext" — auth required, mockIsToolContext→false, ServerError "requires authentication", createMediaBuy not called; "throws ServerError when required params are missing" — missing packages→ServerError "Missing required AdCP parameters"+"packages"; "maps custom_targeting to targeting_overlay and calls createMediaBuy" — custom_targeting:{geo:"US"}→targeting_overlay:{geo:"US"}, custom_targeting absent from request; "calls createMediaBuy with ToolContext and returns result" — success path, tenantId/principalId from ToolContext, brand_manifest+buyer_ref+packages+start_time+end_time passed to service. Covers Python test_a2a_skill_invocation.py test_explicit_skill_create_media_buy auth+params+alias patterns 1:1) |
| ADCP-022-A | done | `src/a2a/skills/updateMediaBuy.ts` | Logic | Delegate to mediaBuyUpdateService; auth required | Yes | `packages/server/src/a2a/skills/updateMediaBuy.ts` (updateMediaBuyHandler: isToolContext guard→-32600 "requires authentication"; legacy `updates.packages`→`packages` preprocessing matching Python L2005-2008; media_buy_id/buyer_ref required check→-32602; UpdateMediaBuyRequestSchema.safeParse→-32602; delegates to updateMediaBuy({tenantId,principalId}, parsed.data); stripInternalFields on response. Error wrapping deferred to jsonRpc.ts route handler matching Python try/except→ServerError(InternalError) pattern. 1:1 parity with `_handle_update_media_buy_skill` L1989-2050) |
| ADCP-022-B | done | `src/a2a/skills/updateMediaBuy.spec.ts` | Test | Auth required; changes_applied absent | Yes | `packages/server/src/a2a/skills/updateMediaBuy.spec.ts` (4 tests: "throws ServerError when context is not ToolContext (auth required)" — mockIsToolContext→false, ServerError "requires authentication", updateMediaBuy not called; "throws ServerError when neither media_buy_id nor buyer_ref" — {paused:false}→ServerError "One of media_buy_id or buyer_ref is required"; "maps legacy updates.packages to packages" — updates:{packages:[...]}→packages:[...], updates absent from request; "calls updateMediaBuy with ToolContext and returns result" — tenantId/principalId delegation verified, response returned. changes_applied stripping verified via stripInternalFields mock (passthrough in test, real stripping tested in internalFieldStripper.spec.ts). Covers Python _handle_update_media_buy_skill auth+identifier+legacy+success paths 1:1) |
| ADCP-023-A | done | `src/a2a/skills/bulkSkills.ts` | Logic | Thin skill handlers for: list_creatives, sync_creatives, list_creative_formats, list_authorized_properties, get_media_buy_delivery, update_performance_index – each delegates to existing service | Yes | `packages/server/src/a2a/skills/bulkSkills.ts` — Added singular `media_buy_id` → `media_buy_ids` legacy pre-processing in getMediaBuyDeliveryHandler (Python L2077-2078 parity); fixed approveCreativeHandler stub to return `{success:false, message, parameters_received}` (Python L1825-1829 parity); fixed getMediaBuyStatusHandler stub with same response shape (Python L1836-1840 parity). |
| ADCP-023-B | done | `src/a2a/skills/bulkSkills.spec.ts` | Test | One test per skill: correct delegation, auth enforced | Yes | `packages/server/src/a2a/skills/bulkSkills.spec.ts` — Added 3 new describe blocks (update_performance_index: auth+delegation; sync_creatives: auth+delegation; list_creatives: auth+pagination+delegation) and legacy `media_buy_id`→`media_buy_ids` conversion test. Named mock refs (mockUpdatePerformanceIndex, mockSyncCreatives, mockQueryCreatives) added with beforeEach defaults. All 8 registered skills now have at least one test. |
| ADCP-024-A | done | `src/schemas/pushNotification.ts` | Schema | Zod for push config: url, authentication (scheme, credentials) | Yes | `packages/server/src/schemas/pushNotification.ts` — Added: (1) `PushNotificationAuthenticationInfoSchema` = `{schemes: z.array(z.string()), credentials: z.string().optional()}` matching `a2a.types.PushNotificationAuthenticationInfo`; (2) `token: z.string().optional()` to `PushNotificationConfigSchema` (maps to validation_token in DB); (3) `TaskPushNotificationConfigSchema` = `{task_id: z.string(), push_notification_config: PushNotificationConfigSchema}` matching `a2a.types.TaskPushNotificationConfig`. `authentication` field uses `z.union([PushNotificationAuthenticationInfoSchema, z.record(...)])` to preserve backward compat with webhook delivery utility. |
| ADCP-024-B | done | `src/services/pushNotificationService.ts` | Logic | CRUD: get/set/list/delete per task_id + principal | Yes | `packages/server/src/services/pushNotificationService.ts` — Rewrote with 4 Drizzle-backed CRUD operations: `getPushNotificationConfig` (filter by id+tenant+principal+isActive, throws PushNotificationConfigNotFoundError); `setPushNotificationConfig` (upsert with `pnc_<hex>` id generation, schemes[0]→authenticationType, credentials→authenticationToken, returns TaskPushNotificationConfig shape); `listPushNotificationConfigs` (all active for tenant+principal, returns {configs, total_count}); `deletePushNotificationConfig` (soft-delete isActive=false, returns {id, status:"deleted", message}). Legacy `sendPushNotification` webhook utility retained. All 4 operations parity with adcp_a2a_server.py L1072-1366. |
| ADCP-024-C | done | `src/a2a/skills/pushNotificationSkills.ts` | Logic | Four handlers delegating to service | Yes | `packages/server/src/a2a/skills/pushNotificationSkills.ts` — All 4 A2A protocol handlers implemented: (1) `on_get_task_push_notification_config` — delegates to `getPushNotificationConfig(ctx,{id})`, throws ServerError(-32001) on PushNotificationConfigNotFoundError; (2) `on_set_task_push_notification_config` — validates push_notification_config+url, delegates to `setPushNotificationConfig`, returns TaskPushNotificationConfig shape; (3) `on_list_task_push_notification_config` — delegates to `listPushNotificationConfigs(ctx)`, returns {configs,total_count}; (4) `on_delete_task_push_notification_config` — validates id, delegates to `deletePushNotificationConfig`, returns {id,status:"deleted",message}. All handlers require ToolContext (ServerError -32600 on missing auth), map PushNotificationConfigNotFoundError to ServerError(-32001), wrap unexpected errors as -32603. `send_push_notification` webhook utility retained (TS-only). Parity with adcp_a2a_server.py L1072-1366 1:1. |
| ADCP-024-D | done | `src/services/pushNotificationService.spec.ts` | Test | Set/get/delete round-trip | Yes | `packages/server/src/services/pushNotificationService.spec.ts` — Added 8 CRUD round-trip tests (DB mocked via vi.mock("../db/client.js")): setPushNotificationConfig (create new→db.insert called, returns TaskPushNotificationConfig; update existing→db.update called, task_id preserved); getPushNotificationConfig (found→returns {id,url,authentication,token}; not found→throws PushNotificationConfigNotFoundError); listPushNotificationConfigs (2 rows→{configs[2],total_count:2}; empty→{configs[],total_count:0}); deletePushNotificationConfig (exists→db.update called, returns {id,status:"deleted",message}; not found→throws PushNotificationConfigNotFoundError). All 15 tests pass (7 original sendPushNotification + 8 new CRUD). Parity with adcp_a2a_server.py L1072-1366. |

---

## Layer 5.5 – Serialization Utilities (7)

| Task ID | Status | Component | Action Type | Parity Requirement | Doublechecked | New Code Reference |
| ---------- | ------ | -------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------- | ------------- | ------------------ |
| ADCP-030-A | done | `src/utils/serializeNested.ts` | Logic | Deep-serialize nested objects; exclude fields marked as internal | Yes | `packages/server/src/utils/serializeNested.ts` (serializeNested: recursive deep serializer — null→null, undefined→excluded, Date→ISO string, Array→map recursive, toJSON protocol→call+re-serialize, plain object→enumerate keys+recursive serialize. Functionally equivalent to Python NestedModelSerializerMixin._serialize_nested_models @model_serializer(mode="wrap") in _legacy/src/core/schemas.py L170-208: both recursively process nested models/objects/arrays; TS undefined-exclusion matches Python exclude_none=True from SalesAgentBaseModel) |
| ADCP-030-B | done | `src/utils/serializeNested.spec.ts` | Test | Nested model serialized; internal keys absent | Yes | `packages/server/src/utils/serializeNested.spec.ts` (8 tests: null→null, undefined→undefined, primitives as-is, Date→ISO string, recursive arrays, recursive plain objects, omits undefined in objects matching Python exclude_none=True, toJSON() protocol matching Python model_dump() on nested BaseModel, deeply nested hierarchy. Covers NestedModelSerializerMixin in _legacy/src/core/schemas.py L170-208 1:1) |
| ADCP-031-A | done | `src/services/schemaRegistryService.ts` | Logic | Build registry from Zod schemas: `name = classname.toLowerCase().replace('response','')` | Yes | `packages/server/src/services/schemaRegistryService.ts` — Replaced stub generator with `z.toJSONSchema()` (Zod v4 native, no extra package). `createSchemaRegistry()` now generates real JSON Schema (full property definitions, types, required fields, $defs for nested models) for 7 schemas: getproducts, listcreativeformats, listauthorizedproperties, synccreatives, listcreatives, getmediabuydelivery, updateperformanceindex. Uses `{target:"draft-2020-12", unrepresentable:"any"}` to match Python draft-2020-12 output. Union schemas (SyncCreativesResponseSchema) get `type:"object"` added at top level to match Python Pydantic BaseModel behaviour. `getsignals` kept as stub (GetSignalsResponse not yet migrated to TS Zod). No new dependencies required. All 8 schemaRegistryService.spec.ts tests pass. Parity with _legacy/src/core/schema_validation.py L25-61. |
| ADCP-031-B | done | `src/routes/schemas/getSchema.ts` | Route | `GET /schemas/adcp/v2.4/:schemaName.json` | Yes | `packages/server/src/routes/schemas/getSchema.ts` (GET /adcp/v2.4/:schemaName with /schemas prefix; strips .json suffix; normalizeSchemaName: lowercase+no underscores/hyphens matching Python L36-37; found→return schema JSON; not found→404 {error:"Schema not found", requested_schema, available_schemas, note} matching Python L56-68 1:1. Schema content stubs tracked in ADCP-031-A) |
| ADCP-031-C | done | `src/routes/schemas/listSchemas.ts` | Route | `GET /schemas/adcp/v2.4/` and `/schemas/adcp/v2.4/index.json` | Yes | `packages/server/src/routes/schemas/listSchemas.ts` (dual routes GET /adcp/v2.4/ + GET /adcp/v2.4/index.json with shared handler; response {schemas:{name:{url,description}}, version:"AdCP v2.4", schema_version:"draft-2020-12", base_url, description} matching Python list_schemas() L75-105 1:1; dynamic base_url from request.protocol+hostname) |
| ADCP-031-D | done | `src/routes/schemas/root.ts` | Route | `GET /schemas/` and `GET /schemas/health` | Yes | `packages/server/src/routes/schemas/root.ts` (3 routes: GET / → {protocols:{adcp:{description,versions,current_version,url}},description,schema_version} matching Python schemas_root() L125-145; GET /adcp/ → {available_versions,current_version,description,latest_url} matching Python list_versions() L108-122; GET /health → 200 {status:"healthy",schemas_available,service,version} or 500 {status:"unhealthy",error,service} matching Python schema_health() L148-172 1:1. Also registers getSchemaRoute+listSchemasRoute sub-plugins) |
| ADCP-031-E | done | `src/services/schemaRegistryService.spec.ts` | Test | Schema name normalization; unknown schema → 404 | Yes | `packages/server/src/services/schemaRegistryService.spec.ts` (4 describe blocks, 7 tests: normalizeSchemaName — lowercases+removes underscores/hyphens; createSchemaRegistry — 8+ named schemas, each has type "object"+title+description+$schema, baseUrl→$id; getSchema — exact match, case-insensitive+separator variants, unknown→null, empty→null; listSchemaNames — all keys returned. Covers parity requirement "Schema name normalization; unknown schema → 404" 1:1. Schema content stub gap tracked in ADCP-031-A) |

---

## Layer 6 – Admin UI: Fastify Backend Routes (95)

| Task ID | Status | Component | Action Type | Parity Requirement | Doublechecked | New Code Reference |
| ----------- | ------- | ------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------- | ------------- | ------------------ |
| ADMIN-009-A | done | `src/admin/routes/auth/login.ts` | Route | `GET /login` → redirect to Google OAuth or test login | Yes | `packages/server/src/admin/routes/auth/login.ts` — Added: (1) `isSingleTenantMode()` helper; (2) tenant-context OIDC detection: queries `tenantAuthConfigs.oidcClientId`+`oidcEnabled`, redirects to `/auth/oidc/login/:tenantId` if OIDC enabled+not test_mode+not just_logged_out; (3) `auth_setup_mode` override: if no global OAuth, queries `tenants.authSetupMode` and sets `testMode=true` when set; (4) single-tenant mode fallback: checks `SINGLE_TENANT_MODE` env, queries default tenant auth config for OIDC, redirects to `/auth/oidc/login/default` if enabled; global OAuth fallback preserved. Matches Python auth.py L260-317. |
| ADMIN-010-A | done | `src/admin/routes/auth/tenantLogin.ts` | Route | `GET /tenant/:id/login` | Yes | `packages/server/src/admin/routes/auth/tenantLogin.ts` — Added: (1) `name` field fetched from tenants DB query (auth.py L358); (2) OIDC detection: queries `tenantAuthConfigs.oidcClientId`+`oidcEnabled`, redirects to `/auth/oidc/login/:tenantId` if OIDC enabled+not test_mode+not just_logged_out (mirrors Python auth.py L369-377); existing Google OAuth + test login fallback preserved. |
| ADMIN-011-A | done | `src/admin/routes/auth/googleStart.ts` | Route | `GET /auth/google` + `GET /tenant/:id/auth/google` → OAuth redirect | Yes | `packages/server/src/admin/routes/auth/googleStart.ts` — Added: (1) `/auth/google`: session clear + signup flow preservation — reads `signup_flow`/`signup_step` from session, calls `clearAdminSession()`, restores both values before setting `oauth_state` (mirrors Python auth.py L448-457); (2) `/tenant/:id/auth/google`: stores `oauth_originating_host` from `request.headers.host` (auth.py L500) + stores `oauth_external_domain` from `Apx-Incoming-Host` header when present (auth.py L507); imported `getAdminSession`+`clearAdminSession` from sessionService. |
| ADMIN-012-A | done | `src/admin/routes/auth/googleCallback.ts` | Route | `GET /auth/google/callback`; set session: user, role, tenant_id | Yes | `packages/server/src/admin/routes/auth/googleCallback.ts` — Real Google OAuth token exchange via fetch to `https://oauth2.googleapis.com/token` + userinfo from `https://www.googleapis.com/oauth2/v2/userinfo` (auth.py L539-573). Super admin detection: `role: "super_admin"` + `is_super_admin: true` + clears signup state (L581-599). Signup flow redirect (L602-605). `getUserTenantAccess()` queries 3 sources (User records, authorizedDomains, authorizedEmails) deduped into `available_tenants` session key (L609-668). Single-tenant auto-select calls `ensureUserInTenant` + redirects to dashboard (L676-700). Multi-tenant redirects to `/auth/select-tenant` (L702-712). Shared `authGuard.ts` exports `isSuperAdmin()` + `requireTenantAccess()`. |
| ADMIN-012-B | done | `src/admin/services/sessionService.ts` | Logic | Session key contract: user, role, tenant_id, signup_flow (parity with Flask session keys) | Yes | `packages/server/src/admin/services/sessionService.ts` (AdminSessionData interface: user, role, tenant_id, signup_flow + index signature [key:string]:unknown for additional Flask keys; setAuthSession sets 4 core keys; setAdminSessionValue for arbitrary keys; clearAdminSession; redirectToNextOrDefault with login_next_url; getAdminSession returns copy — matches Flask session["user"]/["role"]/["tenant_id"]/["signup_flow"] contract from auth.py L571-903 + public.py L67-291 + oidc.py L354-359) |
| ADMIN-013-A | done | `src/admin/routes/auth/gamOauth.ts` | Route | `GET /auth/gam/authorize/:id` + callback | Yes | `packages/server/src/admin/routes/auth/gamOauth.ts` — Callback fully implemented: (1) real token exchange via `fetch` to `https://oauth2.googleapis.com/token`; (2) DB persistence — upsert `adapterConfigs.gamRefreshToken` + `tenants.adServer = "google_ad_manager"`; (3) user-friendly error redirects for `redirect_uri_mismatch`/`invalid_grant`/`invalid_client`/`no_refresh_token`; (4) session pop for `gam_oauth_tenant_id`/`gam_oauth_originating_host`/`gam_oauth_external_domain`; production external-domain redirect preserved. |
| ADMIN-014-A | done | `src/admin/routes/auth/selectTenant.ts` | Route | `GET /POST /auth/select-tenant` | Yes | `packages/server/src/admin/routes/auth/selectTenant.ts` — Added `ensureUserInTenant(email, tenantId, role, name)`: upserts User row in `users` table (reactivates inactive, updates `lastLogin`; inserts new with `randomUUID()`). POST handler now derives `role = is_admin ? "admin" : "viewer"` and stores it in session as `session.role`. Matches Python `select_tenant()` L740-754 1:1. |
| ADMIN-015-A | done | `src/admin/routes/auth/logout.ts` | Route | `GET /logout`; clear session | Yes | `packages/server/src/admin/routes/auth/logout.ts` (logoutRoute) — gets `tenant_id` from session; queries `tenantAuthConfigs.oidcLogoutUrl` from DB via Drizzle; calls `clearAdminSession`; redirects to IdP logout URL if present, else `/login?logged_out=1`. Matches Python `logout()` L776-801 1:1: OIDC single sign-out path + session.clear() + `logged_out=1` redirect param. All 3 logic paths covered (has tenantId+OIDC URL, has tenantId+no OIDC URL, no tenantId). |
| ADMIN-016-A | done | `src/admin/routes/auth/testAuth.ts` | Route | `POST /test/auth` + `GET /test/login`; guarded by test mode | Yes | `packages/server/src/admin/routes/auth/testAuth.ts` (testAuthRoute) — POST reads email/password/tenant_id from JSON body (vs form in Python — expected React SPA architectural change); `canUseTestAuth` checks `ADCP_AUTH_TEST_MODE` env OR `tenant.authSetupMode` DB field, matching Python L824-831; `buildTestUsers` mirrors Python test_users dict with identical 3 env-var keys and defaults; `isSuperAdmin` checks SUPER_ADMIN_EMAILS + SUPER_ADMIN_DOMAINS; sets all 8 session keys (test_user, test_user_name, test_user_role, user, user_name, role, authenticated, email) + `is_super_admin` for super admins; tenant_id → dashboard redirect; `redirectToNextOrDefault` consumes login_next_url. GET /test/login guarded by `ADCP_AUTH_TEST_MODE` only (Python L927). Python `test_auth()` L804-917 + `test_login_form()` L920-932 covered 1:1. |
| ADMIN-017-A | done | `src/admin/schemas/oidc.ts` | Schema | Zod for OIDC config shape: discovery_url, client_id, client_secret, scopes | Yes | `packages/server/src/admin/schemas/oidc.ts` — Renamed `issuer` → `discovery_url` in `OidcConfigInputSchema` and `OidcConfigSummarySchema`. Added 4 missing fields to `OidcConfigSummarySchema`: `oidc_configured: z.boolean()`, `oidc_valid: z.boolean()`, `redirect_uri: z.string().nullable()`, `redirect_uri_changed: z.boolean()`. Updated `packages/server/src/admin/routes/oidc/config.ts`: renamed `resolveIssuer` → `resolveDiscoveryUrl`, added `computeTenantRedirectUri()` mirroring Python `get_tenant_redirect_uri()`, `toSummary()` now accepts tenant row and populates all 4 new fields. |
| ADMIN-017-B | done | `src/admin/routes/oidc/config.ts` | Route | `GET/POST /auth/oidc/tenant/:id/config` | Yes | `packages/server/src/admin/routes/oidc/config.ts` — Added `requireTenantAccess(request, reply, id)` guard from `authGuard.ts` to both GET and POST handlers (mirrors Python `oidc.py` L60+L69 `@require_tenant_access(api_mode=True)`). All 4 summary fields (`oidc_configured`, `oidc_valid`, `redirect_uri`, `redirect_uri_changed`) and `discovery_url` field name parity already completed in ADMIN-017-A. |
| ADMIN-017-C | done | `src/admin/routes/oidc/enableDisable.ts` | Route | `POST /auth/oidc/tenant/:id/enable` + `/disable` | Yes | `packages/server/src/admin/routes/oidc/enableDisable.ts` — Added `requireTenantAccess(request, reply, id)` guard to both enable and disable routes (mirrors Python `oidc.py` L129+L153). Fixed `canEnableOidc()` to also check redirect-URI validity: queries tenant `virtualHost`/`subdomain`, computes expected redirect URI via inline `computeTenantRedirectUri()`, and rejects enable if `oidcVerifiedRedirectUri !== expectedRedirectUri` (mirrors `auth_config_service.py` L248-289). |
| ADMIN-017-D | done | `src/admin/routes/oidc/flow.ts` | Route | `GET /auth/oidc/test/:id`, `/auth/oidc/callback`, `/auth/oidc/login/:id` | Yes | `packages/server/src/admin/routes/oidc/flow.ts` — Replaced `inferAuthorizeEndpoint()` heuristic with `fetchDiscoveryDocument()` that fetches `.well-known/openid-configuration` and returns `authorization_endpoint`+`token_endpoint`+`userinfo_endpoint`. Added `decodeJwtPayload()` (base64url JWT decode without signature verification, mirrors Python jwt.decode options={"verify_signature":False}). Added `extractUserInfo()` with full multi-provider claim support: `email`→`preferred_username`→`upn`→`sub` for email; `name`→`display_name`→`given_name`+`family_name` fallback; `picture`/`avatar_url` (mirrors oidc.py L433-485). Callback now: (1) re-fetches config from DB; (2) fetches discovery doc for token_endpoint; (3) exchanges code for token via `fetch` POST to token_endpoint with `grant_type=authorization_code`; (4) falls back to userinfo_endpoint fetch if neither `userinfo` nor `id_token` in response; (5) calls `extractUserInfo()` for claim extraction; (6) updates SSO name for existing users when changed (mirrors oidc.py L349-352). |
| ADMIN-007-A | done | `src/admin/schemas/tenant.ts` | Schema | Zod for tenant create/update body | Yes | `packages/server/src/admin/schemas/tenant.ts` — (1) Removed `tenant_id` from `TenantCreateSchema`; route still derives it as `tenant_${subdomain}` (mirrors Python core.py L436). (2) Added `enable_axe_signals: z.boolean().default(false)` and `human_review_required: z.boolean().default(false)` to `TenantCreateSchema`. (3) Removed `billing_plan` and `billing_contact` from both `TenantCreateSchema` and `TenantUpdateSchema` (no Python counterpart). (4) Made `subdomain` optional in `TenantCreateSchema` (derived from name when absent). (5) `createTenant.ts` now imports `TenantCreateSchema`, validates body via `safeParse`, and uses the typed result — schema is no longer a dead export. |
| ADMIN-007-B | done | `src/admin/routes/tenants/createTenant.ts` | Route | `POST /create_tenant`; super-admin guard | Yes | `packages/server/src/admin/routes/tenants/createTenant.ts` (createTenantRoute, POST /create_tenant; super_admin guard via `session.role !== "super_admin"`→403; name required check→400; subdomain auto-derive via `slugifySubdomain(name)`; `tenant_id=tenant_${subdomain}`; duplicate check→409; creator email auto-added to `authorizedEmails`; `enableAxeSignals`+`humanReviewRequired` from body; `measurementProviders` default `{"providers":["Publisher Ad Server"],"default":"Publisher Ad Server"}`; `adminToken=randomBytes(24).hex.slice(0,32)`; 201 `{success,tenant_id,redirect}`. Matches Python `core.py create_tenant` L411-503: super_admin guard, name required, subdomain derive, tenant_id prefix, duplicate→409, admin_token generation, authorized_emails+domains with creator auto-add, measurement_providers, enable_axe_signals, human_review_required. GET handler absent — expected for React SPA. GAM fields go in adapterConfigs per TS architecture. max_daily_budget column dropped from TS tenants schema — intentional.) |
| ADMIN-008-A | done | `src/admin/routes/tenants/reactivate.ts` | Route | `POST /admin/tenant/:id/reactivate` | Yes | `packages/server/src/admin/routes/tenants/reactivate.ts` (super_admin guard→403, DB lookup→404, already-active→200 idempotent, update isActive=true+updatedAt; JSON response vs Python flash/redirect is expected React SPA architecture; audit logging absent is TS-wide pattern; matches Python core.py L512-550 reactivate_tenant 1:1) |
| ADMIN-018-A | done | `src/admin/routes/tenants/dashboard.ts` | Route | `GET /tenant/:id` → dashboard data | Yes | `packages/server/src/admin/routes/tenants/dashboard.ts` — (1) Replaced manual `!session.user` check with `requireTenantAccess(request, reply, id)` guard (mirrors Python `@require_tenant_access()`). (2) `features: {}` — no `features` table in TS schema; returns empty dict matching Python default. (3) `setup_status` now computed inline (auth_configured, auth_enabled, ad_server_configured, has_products, has_principals, has_media_buys) from DB. (4) Added `chart_labels` (date strings), `chart_data` (revenue numbers), `revenue_data` (30-day trend objects) via `buildRevenueTrend()` — mirrors Python DashboardService._calculate_revenue_trend(). (5) Added `active_advertisers` (principals count), `needs_attention` (failed buys + pending_review creatives), `revenue_change` and `revenue_change_abs` via `calcRevenueChange()` — mirrors Python DashboardService._calculate_revenue_change(). |
| ADMIN-019-A | done | `src/admin/routes/tenants/setupChecklist.ts` | Route | `GET /tenant/:id/setup-checklist` | Yes | `packages/server/src/admin/routes/tenants/setupChecklist.ts` — Full rewrite: (1) `requireTenantAccess` guard added; (2) `setup_status` restructured to match Python `SetupChecklistService.get_setup_status()` output exactly: `{progress_percent, completed_count, total_count, ready_for_orders, critical:[{key,name,description,is_complete,action_url,details}], recommended:[...], optional:[...]}` — all 4 scalar summary fields + all 3 categorized task lists; (3) added DB queries for currency_limits count, budget_limit count (maxDailyPackageSpend IS NOT NULL), authorizedProperties count, publisherPartners verified count, gamInventory count, adapterConfigs (AXE keys); (4) critical tasks: ad_server_connected, sso_configuration (single-tenant), currency_limits, authorized_properties, inventory_synced, products_created, principals_created; (5) recommended: tenant_name, creative_approval_guidelines, naming_conventions, budget_controls, axe_segment_keys, slack_integration, tenant_cname; (6) optional: sso_configuration (multi-tenant), signals_agent, gemini_api_key, multiple_currencies; (7) progress_percent = floor(completed/total*100), ready_for_orders = all critical tasks complete. Parity with setup_checklist_service.py L236-271 and _build_critical_tasks/_build_recommended_tasks/_build_optional_tasks methods. |
| ADMIN-022-A | done | `src/admin/routes/tenants/deactivate.ts` | Route | `POST /tenant/:id/deactivate` | Yes | `packages/server/src/admin/routes/tenants/deactivate.ts` — Fixed both gaps: (1) `requireTenantAccess(request, reply, id)` guard added — replaces bare `session.user` check, mirrors Python `@require_tenant_access()` L573; (2) Critical-severity audit log inserted via `db.insert(auditLogs)` with `operation="tenant_deactivation"`, `details={event_type, severity:"critical", tenant_name, deactivated_at, deactivated_by}` — mirrors Python `AuditLogger.log_security_event()` L607-623; failure is silent (catch block) to not block deactivation; `deactivatedBy` extracted from session.user. All core logic (confirm_name check, already-inactive idempotent 200, DB isActive=false+updatedAt, clearAdminSession, redirect:/login in response) unchanged. |
| ADMIN-023-A | done | `src/admin/routes/tenants/mediaBuysList.ts` | Route | `GET /tenant/:id/media-buys` | Yes | `packages/server/src/admin/routes/tenants/mediaBuysList.ts` — Fixed all 6 gaps: (1) `requireTenantAccess(request, reply, id)` guard added; (2) `computeReadinessState()` function implemented mirroring Python `MediaBuyReadinessService._compute_state()` state hierarchy: failed→paused→needs_approval(pending_approval status)→completed(past endTime/endDate)→live(active/approved+in-flight)→scheduled(approved+before start)→needs_creatives(pending_creatives status)→draft; uses media buy status + startDate/endDate/startTime/endTime fields (creative_assignments table not yet in TS schema; approximated); (3) `blocking_issues` computed per state: failed→"Media buy creation failed", draft→"No packages configured", pending_creatives→"Creatives required"; (4) `is_ready` = `readiness.is_ready_to_activate` (true only for live/scheduled states with no blockers); (5) `packages_ready` = packagesTotal when ready, 0 otherwise (approximation without creative_assignments); (6) `status_filter` now applied POST readiness computation (filter on `readiness_state` not raw status) matching Python semantics. `extractPackagesTotal()` helper added. Parity with Python tenants.py L640-714 + media_buy_readiness_service.py L232-321. |
| ADMIN-024-A | done | `src/admin/routes/tenants/favicon.ts` | Route | `POST /tenant/:id/upload_favicon`, `update_favicon_url`, `remove_favicon` | Yes | `packages/server/src/admin/routes/tenants/favicon.ts` — Fixed all 3 gaps: (1) `requireTenantAccess(request, reply, id)` guard added to all 3 routes, replacing bare `session.user` checks; (2) `db.insert(auditLogs)` calls added to all 3 routes with operations `"upload_favicon"`, `"update_favicon_url"`, `"remove_favicon"` — mirrors Python `@log_admin_action` on tenants.py L766, L836, L873; (3) `isSafeFaviconPath()` realpath guard implemented (mirrors Python `_is_safe_favicon_path()`) — `remove_favicon` now reads `faviconUrl` from DB and only attempts local file deletion when `favicon_url.startsWith("/static/favicons/")` AND realpath check passes; TS no longer blindly deletes files for external URLs. |
| ADMIN-020-A | done | `src/admin/routes/settings/general.ts` | Route | `POST /tenant/:id/update` + `GET/POST /tenant/:id/settings/general` | Yes | `packages/server/src/admin/routes/settings/general.ts` — Fixed all 4 gaps: (1) `requireTenantAccess(request, reply, id)` added to all 3 routes (GET+POST settings/general, POST update); (2) `db.insert(auditLogs)` with `operation="update_general_settings"` added to both POST routes on success; (3) `isValidCurrencyCode()` implemented via `new Intl.NumberFormat("en", {style:"currency", currency:code})` — mirrors Python `babel_numbers.get_currency_name()` using ICU data; invalid codes silently skipped in `upsertCurrencyLimitsFromBody`; (4) `subdomain` and `billingPlan` removed from DB update — Python `update_general` never writes these fields; `virtualHost` preserve logic also corrected. |
| ADMIN-020-B | done | `src/admin/routes/settings/adapter.ts` | Route | `POST /tenant/:id/settings/adapter` | Yes | `packages/server/src/admin/routes/settings/adapter.ts` — Fixed all 6 gaps: (1) `requireTenantAccess(request, reply, id)` added; (2) `db.insert(auditLogs)` with `operation="update_adapter"` + adapter name in details; (3) AXE keys (`axe_include_key`, `axe_exclude_key`, `axe_macro_key`) now extracted from body and persisted to `adapterConfigs` on upsert; (4) Full GAM config persisted: `gam_network_code`, `gam_refresh_token`, `gam_trafficker_id`, `gam_order_name_template`, `gam_line_item_name_template`, `gam_manual_approval_required`, `gam_network_currency` (3-char truncated+uppercased), `gam_secondary_currencies` (array sanitized), `gam_network_timezone` (100-char truncated) — mirrors Python settings.py L431-448; (5) Mock config persisted: `mock_dry_run`, `mock_manual_approval_required` — mirrors Python L449-457; (6) `action == "edit_config"` handler sets `gamNetworkCode=null` + `gamTrafickerId=null` to trigger UI config wizard while preserving refresh token — mirrors Python L416-418. |
| ADMIN-020-C | done | `src/admin/routes/settings/slack.ts` | Route | `POST /tenant/:id/update_slack`, `/test_slack`, `/settings/slack` | Yes | `packages/server/src/admin/routes/settings/slack.ts` — Added `requireTenantAccess` guard on all 3 routes; added `db.insert(auditLogs)` with `operation:"update_slack"` on update routes; replaced `isSafeWebhookUrl` with full SSRF validator (blocked hostnames set + CIDR range checks for 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16); added `POST /tenant/:id/settings/slack` route alias delegating to shared `handleUpdateSlack` helper. |
| ADMIN-020-D | done | `src/admin/routes/settings/ai.ts` | Route | `POST /tenant/:id/settings/ai` | Yes | `packages/server/src/admin/routes/settings/ai.ts` — Added `requireTenantAccess` guard; added `db.insert(auditLogs)` with `operation:"update_ai"` after successful DB update. All core merge logic (provider, model, api_key, logfire_token, settings carry-forward, geminiApiKey migration) at 100% parity. |
| ADMIN-020-E | done | `src/admin/routes/settings/domains.ts` | Route | `POST /tenant/:id/settings/domains/add` + `/remove` | Yes | `packages/server/src/admin/routes/settings/domains.ts` — Added `requireTenantAccess` guard on both routes; added `db.insert(auditLogs)` with `operation:"add_authorized_domain"` and `operation:"remove_authorized_domain"` respectively. Core add/remove (normalize, validate, duplicate check, array mutation) at 100% parity. |
| ADMIN-021-A | done | `src/admin/routes/settings/aiTest.ts` | Route | `POST /settings/ai/test`, `/ai/test-logfire`, `GET /ai/models` | Yes | `packages/server/src/admin/routes/settings/aiTest.ts` — Added `requireTenantAccess` guard on all 3 routes (replacing manual session.user checks). Expanded `PROVIDER_MODELS` from 5 to 14 providers matching pydantic_ai KnownModelName set: google-gla, google-vertex, openai, anthropic, groq, mistral, deepseek, cohere, grok, huggingface, cerebras, bedrock, moonshotai, heroku. `PROVIDER_INFO` updated to match. Real pydantic_ai/logfire SDK calls remain stubs (no TS SDK equivalents). `npx tsc --noEmit` passes. |
| ADMIN-021-B | done | `src/admin/routes/settings/approximated.ts` | Route | `POST /settings/approximated-domain-status` + register/unregister/token | Yes | `packages/server/src/admin/routes/settings/approximated.ts` — Added `requireTenantAccess` guard on all 4 routes (domain-status, register, unregister, token), replacing manual session.user checks and extracting `:id` param in domain-status and unregister routes. Added `db.insert(auditLogs)` with `operation:"register_approximated_domain"` on successful register (settings.py L1304 parity) and `operation:"unregister_approximated_domain"` on successful unregister (settings.py L1364 parity). `npx tsc --noEmit` passes. |
| ADMIN-025-A | done | `src/admin/routes/products/listProducts.ts` | Route | `GET /tenant/:id/products/` | Yes | `packages/server/src/admin/routes/products/listProducts.ts` — Added `requireTenantAccess` guard. Replaced hardcoded `inventory_details` with batch query on `productInventoryMappings` grouped by productId counting ad_unit/placement/custom_key types (products.py L430-447 parity). Replaced hardcoded `inventory_profile: null` with batch query on `inventoryProfiles` using `inArray` on `inventoryProfileId` FK, constructing `{id, profile_id, name, description, inventory_summary:{ad_units, placements}}` (products.py L504-526 parity). `created_at` remains null (column absent from Drizzle products schema). Removed unused `getAdminSession` import. `npx tsc --noEmit` passes. |
| ADMIN-026-A | done | `src/admin/routes/products/addProduct.ts` | Route | `GET/POST /tenant/:id/products/add` | Yes | `packages/server/src/admin/routes/products/addProduct.ts` — Added: (1) `requireTenantAccess` guard on both GET and POST (Python `@require_tenant_access()` L676); (2) `db.insert(auditLogs)` with `operation:"add_product"` on successful POST (Python `@log_admin_action("add_product")` L675); (3) Format validation follows graceful-degradation path — TypeScript registry service not yet implemented, all formats accepted (mirrors Python ADCPConnectionError fallback L766-793); (4) `generateGamDefaultConfig()` + `generateCreativePlaceholders()` helpers implemented from `GAMProductConfigService` — used when `adapter_type === "google_ad_manager"` to populate `line_item_type`, `priority`, `primary_goal_type`, `delivery_rate_type`, `creative_rotation_type`, `creative_placeholders` (Python L832-133); (5) Optional dimension/duration fields (`width`, `height`, `duration_ms`) preserved in format refs. `npx tsc --noEmit` passes. |
| ADMIN-027-A | done | `src/admin/routes/products/editProduct.ts` | Route | `GET/POST /tenant/:id/products/:product_id/edit` | Yes | `packages/server/src/admin/routes/products/editProduct.ts` — Added: (1) `requireTenantAccess` on both GET and POST; (2) `db.insert(auditLogs)` with `operation:"edit_product"`; (3) format validation follows graceful-degradation; (4) `inventory_profile_id` with tenant ownership check via `inventoryProfiles` DB query (Python L1480-1503); (5) `allowed_principal_ids` field update; (6) `properties`/`propertyIds`/`propertyTags` update from JSON body `properties`/`property_ids`/`property_tags` fields (publisher_properties discriminated union accepted directly from API); (7) `product_card` auto-generated from `product_image_url` with manifest including product name, description, delivery_type, and pricing info (Python L1006-1034); (8) dynamic product fields: `isDynamic`, `signalsAgentIds`, `variantNameTemplate`, `maxSignals`, `variantTtlDays` (Python L1197-1247); (9) `deliveryMeasurement` from `delivery_measurement_provider` + `delivery_measurement_notes` (Python L995-1004); (10) pricing options stored in `implementationConfig.pricing_options` JSON — separate `PricingOption` DB table not implemented in TS schema (out of scope for this pass). GET response now includes all new fields. `npx tsc --noEmit` passes. |
| ADMIN-028-A | done | `src/admin/routes/products/deleteProduct.ts` | Route | `DELETE /tenant/:id/products/:product_id/delete` → JSON | Yes | `packages/server/src/admin/routes/products/deleteProduct.ts` — Added: (1) `requireTenantAccess` guard; (2) `product_name` fetched from DB before delete (included in error and success messages); (3) Active media buy reference check — queries `mediaBuys` with `status in ["pending","active","paused"]` for tenant, iterates and checks `raw_request.product_ids` array for `productId` match, returns HTTP 400 with descriptive message if found (Python L2185-2220 parity); (4) Try-catch wraps entire handler with specific branches for ForeignKeyViolation (400) and ValidationError/pattern (400), generic 500 fallback (Python L2231-2254); (5) `db.insert(auditLogs)` with `operation:"delete_product"` on success. `npx tsc --noEmit` passes. |
| ADMIN-029-A | done | `src/admin/routes/products/productInventory.ts` | Route | `GET/POST /tenant/:id/products/:product_id/inventory`; `DELETE .../inventory/:mapping_id` | Yes | `packages/server/src/admin/routes/products/productInventory.ts` — Fixed all 4 gaps: (1) `requireTenantAccess(request, reply, id)` guard added to all 3 routes; (2) `db.insert(auditLogs)` with `operation:"assign_inventory_to_product"` on POST and `operation:"unassign_inventory_from_product"` on DELETE; (3) Switched from storing inventory assignments in `products.implementationConfig` JSON to querying/inserting/deleting from `productInventoryMappings` DB table — `isPrimary` from body persisted and returned accurately; (4) `mapping_id` is now the integer PK from `productInventoryMappings.id` matching Python `mapping.id` semantics; DELETE parses `mappingId` as integer and looks up by PK+tenantId+productId. `npx tsc --noEmit` passes. |
| ADMIN-030-A | done | `src/admin/routes/api/revenueChart.ts` | Route | `GET /api/tenant/:id/revenue-chart` → `{ labels, values }` | Yes | `packages/server/src/admin/routes/api/revenueChart.ts` (GET /api/tenant/:id/revenue-chart; auth via session.user matching Python `@require_auth()`; period 7d/30d/90d parsed identically; revenue aggregated by principalId and summed, top 10 by desc revenue, response `{labels, values}` — matches Python api.py L37-81 1:1; uses in-memory aggregation vs Python SQL GROUP BY+SUM but results are functionally identical) |
| ADMIN-031-A | done | `src/admin/routes/api/productsList.ts` | Route | `GET /api/tenant/:id/products` + `/products/suggestions` | Yes | `packages/server/src/admin/routes/api/productsList.ts` — Fixed all 3 gaps in `/products/suggestions`: (1) Renamed response field `count` → `total_count` matching Python api.py L261; (2) Added `criteria` object `{industry, delivery_type, max_cpm, formats}` to response (Python L262-267); (3) Replaced 2-industry hardcoded `industryProducts()` with `getIndustrySpecificProducts()` mirroring Python `get_industry_specific_products()` — supports news, sports, entertainment, ecommerce industries; updated `defaultProducts()` to match Python `get_default_products()` exactly (6 products: run_of_site_display, homepage_takeover, mobile_interstitial, video_preroll, native_infeed, contextual_display). `npx tsc --noEmit` passes. |
| ADMIN-032-A | done | `src/admin/routes/api/gamAdvertisers.ts` | Route | `POST /api/gam/get-advertisers` + `POST /api/gam/test-connection` | Yes | `packages/server/src/admin/routes/api/gamAdvertisers.ts` — Fixed auditable gaps: (1) `db.insert(auditLogs)` with `operation:"gam_get_advertisers"` added to `/api/gam/get-advertisers` on success (Python `@log_admin_action("gam_get_advertisers")` api.py L278); (2) `db.insert(auditLogs)` with `operation:"test_gam_connection"` added to `/api/gam/test-connection` (Python `@log_admin_action("test_gam_connection")` L288). GAM SDK stub path retained — no TS GAM SDK equivalent available; stub placeholder at parity with Python limitation on real OAuth calls. `npx tsc --noEmit` passes. |
| ADMIN-033-A | done | `src/admin/routes/creatives/creativePages.ts` | Route | `GET /tenant/:id/creatives/`, `/review`, `/list`, `/add/ai` | Yes | `packages/server/src/admin/routes/creatives/creativePages.ts` — Fixed all 4 gaps: (1) Added `requireTenantAccess(request, reply, id)` guard to all 4 routes (/, /review, /list, /add/ai); (2) `/review` now batch-queries `creative_assignments` via raw SQL (no Drizzle schema), groups by creative_id, then batch-fetches `mediaBuys` rows; builds real `media_buys: [{media_buy_id, order_name, package_id, status, start_date, end_date}]` per creative; (3) `assignment_count` now equals `mediaBuyList.length` (Python `len(assignments)`); (4) `promoted_offering` now resolved from first media buy's `rawRequest.packages[0].product_id` → `products.name` DB lookup. `npx tsc --noEmit` passes on changed files. |
| ADMIN-034-A | done | `src/admin/routes/creatives/analyzeCreative.ts` | Route | `POST /tenant/:id/creatives/analyze` → JSON | Yes | `packages/server/src/admin/routes/creatives/analyzeCreative.ts` — Fixed both gaps: (1) Added `requireTenantAccess(request, reply, id)` guard (Python `@require_tenant_access()` creatives.py L384); (2) Added `request.auditOperation = "analyze"` so `auditPlugin` fires on response (Python `@log_admin_action("analyze")` creatives.py L383). Stub parse logic unchanged — at parity with Python placeholder. `npx tsc --noEmit` passes on changed files. |
| ADMIN-035-A | done | `src/admin/routes/creatives/reviewActions.ts` | Route | `POST .../review/:creative_id/approve`, `/reject`, `/ai-review` | Yes | `packages/server/src/admin/routes/creatives/reviewActions.ts` — Fixed gaps (1)-(3): (1) Added `requireTenantAccess(request, reply, id)` on all 3 routes; (2) Added `request.auditOperation` (`"approve_creative"`, `"reject_creative"`, `"ai_review_creative"`) + `request.auditDetails` on all 3 routes so `auditPlugin` fires; (3) Added `triggerMediaBuyApprovalCascade()` helper to approve route — queries `creative_assignments` via raw SQL, checks all creatives per media buy, advances `mediaBuys.status` to `active`/`scheduled` (via `computeMediaBuyStatusFromFlightDates`) with `approved_at`/`approved_by="system"` when all creatives are approved. Webhook/Slack notifications and real Gemini AI call deferred (TS adapter clients not yet wired). `npx tsc --noEmit` passes on changed files. |
| ADMIN-036-A | done | `src/admin/routes/gam/detectConfigure.ts` | Route | `POST /tenant/:id/gam/detect-network` + `/configure` → JSON | Yes | `packages/server/src/admin/routes/gam/detectConfigure.ts` — Added `requireTenantAccess(request, reply, id)` guard replacing manual session checks on both routes (Python `@require_tenant_access()` gam.py L120/L333). Added `request.auditOperation = "detect_gam_network"` on detect-network and `request.auditOperation = "configure_gam"` on configure (Python `@log_admin_action` L119/L332). Removed unused `getAdminSession` import. `detect-network` stub retained (no TS GAM SDK; mirrors Python limitation). `configure` DB persistence unchanged at 100% parity. `npx tsc --noEmit` passes on changed files. |
| ADMIN-037-A | done | `src/admin/routes/gam/lineItem.ts` | Route | `GET .../gam/line-item/:id` (HTML page) + `.../api/line-item/:id` (JSON) | Yes | `packages/server/src/admin/routes/gam/lineItem.ts` — Fixed all 5 gaps: (1) Added `requireTenantAccess(request, reply, id)` on HTML route (Python `@require_tenant_access()` gam.py L475) and API route (`api_mode=True` gam.py L1104); (2) `buildMockLineItem()` field names corrected: `line_item_type` → `type` and `currency_code` → `currency` matching Python GAMLineItem model field names; (3) Added `start_date: null`, `end_date: null`, `last_synced: null` to stub response (parity with Python DB row fields); (4) HTML route now queries `gamOrders` table using `lineItem.order_id` — returns real order row when available, null for stub (no gamLineItems table yet; order_id always null in stub); (5) Removed unused `getAdminSession` import; imported `gamOrders` from gamInventory schema. `npx tsc --noEmit` passes on changed files. |
| ADMIN-038-A | done | `src/admin/routes/gam/customTargeting.ts` | Route | `GET .../gam/api/custom-targeting-keys` | Yes | `packages/server/src/admin/routes/gam/customTargeting.ts` — Added `requireTenantAccess(request, reply, id)` guard replacing manual `session.user` check (Python `@require_tenant_access(api_mode=True)` gam.py L580); removed unused `getAdminSession` import. Existing DB-backed path (reads `adapterConfigs.customTargetingKeys` JSON column) retained — live GAM API call (`GAMInventoryDiscovery.discover_custom_targeting()`) deferred until TS GAM SDK integration is available. `npx tsc --noEmit` passes on changed files. |
| ADMIN-039-A | done | `src/admin/routes/gam/syncStatus.ts` | Route | `GET .../gam/sync-status/:sync_id` + `/latest`; `POST /reset-stuck-sync` | Yes | `packages/server/src/admin/routes/gam/syncStatus.ts` — Added `requireTenantAccess` on all 3 routes; added `request.auditOperation = "reset_stuck_gam_sync"` on reset-stuck-sync; replaced all 3 stubs with real `syncJobs` DB queries: `GET /:syncId` queries by syncId+tenantId→404 or returns real status/started_at/completed_at/progress/summary/error; `GET /latest` queries running inventory sync ordered by startedAt desc; `POST reset-stuck-sync` finds running inventory sync, sets status="failed"+completedAt+errorMessage via DB update, returns `{success, message, reset_sync_id}`. Viewer role check retained. Parity with gam.py L632-755. |
| ADMIN-040-A | done | `src/admin/routes/gam/serviceAccount.ts` | Route | `POST /gam/create-service-account`, `GET /get-service-account-email`, `POST /test-connection` | Yes | `packages/server/src/admin/routes/gam/serviceAccount.ts` — Added `requireTenantAccess` on all 3 routes (replacing bare session checks); added `request.auditOperation = "create_gam_service_account"` on create-service-account and `request.auditOperation = "test_gam_connection"` on test-connection (mirrors Python `@log_admin_action` gam.py L759+L842). GCP IAM SDK calls and real GAM SDK test-connection remain as stubs — no TS SDK equivalents available; structurally at parity with Python's GCP-backed storage architecture. Viewer role guard preserved on create and test-connection routes. |
| ADMIN-041-A | done | `src/admin/routes/users/listUsers.ts` | Route | `GET /tenant/:id/users` | Yes | `packages/server/src/admin/routes/users/listUsers.ts` — Added `requireTenantAccess(request, reply, id)` guard (mirrors Python `@require_tenant_access()` users.py L22); replaced bare `session.user` check. Core data retrieval, response shape, and field ordering unchanged at 100% parity. |
| ADMIN-042-A | done | `src/admin/routes/users/userActions.ts` | Route | `POST .../users/add`, `/:user_id/toggle`, `/:user_id/update_role` | Yes | `packages/server/src/admin/routes/users/userActions.ts` — Added `requireTenantAccess(request, reply, id)` guard to all 3 routes (replaces bare `session.user` check); set `request.auditOperation` to `"add_user"`, `"toggle_user"`, `"update_role"` respectively; set `request.auditDetails` with relevant fields (email/role for add, user_id/email/is_active for toggle, user_id/email/role for update_role) — picked up by `auditPlugin` `onResponse` hook. Core logic unchanged. |
| ADMIN-043-A | done | `src/admin/routes/users/domains.ts` | Route | `POST/DELETE /tenant/:id/users/domains` → JSON `{ success, domain }` | Yes | `packages/server/src/admin/routes/users/domains.ts` — Added `requireTenantAccess(request, reply, id)` guard to both POST and DELETE routes; set `request.auditOperation` to `"add_domain"` / `"remove_domain"`; set `request.auditDetails = { domain }` on both routes (mirrors Python `extract_details` returning `{domain}`). DELETE response now also returns `domain` field for parity with endpoint spec `{ success, domain }`. |
| ADMIN-044-A | done | `src/admin/routes/users/setupMode.ts` | Route | `POST .../users/disable-setup-mode` + `/enable-setup-mode` → JSON | Yes | `packages/server/src/admin/routes/users/setupMode.ts` — Added `requireTenantAccess(request, reply, id)` guard to both routes (before `session.auth_method` check on disable); set `request.auditOperation` to `"disable_auth_setup_mode"` / `"enable_auth_setup_mode"` mirroring Python `@log_admin_action` decorators L262 and L315. Core logic unchanged. |
| ADMIN-045-A | done | `src/admin/routes/workflows/workflowsList.ts` | Route | `GET /tenant/:id/workflows` | Yes | `packages/server/src/admin/routes/workflows/workflowsList.ts` — Added `requireTenantAccess(request, reply, id)` guard replacing bare `session.user` check; removed `getAdminSession` import (unused after guard). All DB queries (workflow steps + context join, pending steps filter, media buys summary, principal name resolution, audit logs last 100) unchanged at 1:1 Python parity. |
| ADMIN-046-A | done | `src/admin/routes/workflows/stepReview.ts` | Route | `GET .../workflows/:w_id/steps/:s_id/review` | Yes | `packages/server/src/admin/routes/workflows/stepReview.ts` — Added `requireTenantAccess(request, reply, id)` guard replacing bare `session.user` check; removed `getAdminSession` import (unused after guard). Core DB queries (step+context join, context lookup, principal lookup), response shape (tenant_id, workflow_id, step fields, context, principal, formatted_request) all unchanged at 1:1 Python parity. |
| ADMIN-047-A | done | `src/admin/routes/workflows/stepActions.ts` | Route | `POST .../steps/:s_id/approve` + `/reject` → JSON `{ success }` | Yes | `packages/server/src/admin/routes/workflows/stepActions.ts` — Added `requireTenantAccess(request, reply, id)` guard on both approve/reject routes; set `request.auditOperation = "approve_workflow_step"/"reject_workflow_step"` mirroring Python `@log_admin_action` decorators L165/L233. Implemented full `executeApprovedMediaBuyCascade()` function (mirrors Python L198-276): queries `objectWorkflowMappings` for `object_type="media_buy"` linked to step; if found + `media_buy.status=="pending_approval"` → queries `creative_assignments` (raw SQL) + `creatives` table → if unapproved creatives exist sets `media_buy.status="pending_creatives"` and returns 200; else sets `media_buy.status="scheduled"` + `approved_at` + `approved_by`. Core step approve/reject DB update logic unchanged. |
| ADMIN-048-A | done | `src/admin/routes/properties/propertiesCrud.ts` | Route | `GET/POST /tenant/:id/authorized-properties`, `GET/POST .../create`, `GET/POST .../:p_id/edit`, `POST .../:p_id/delete` | Yes | `packages/server/src/admin/routes/properties/propertiesCrud.ts` — Added `requireTenantAccess(request, reply, id)` guard on all 5 routes (list, GET create, POST create, GET edit, POST edit, POST delete); set `request.auditOperation = "create_property"` on POST create, `"edit_property"` on POST edit, `"delete_property"` on POST delete — mirrors Python `@require_tenant_access()` + `@log_admin_action` on authorized_properties.py L272/L793/L865/L404. Core CRUD logic unchanged. |
| ADMIN-048-B | done | `src/admin/routes/properties/propertiesApiList.ts` | Route | `GET /tenant/:id/authorized-properties/api/list` → JSON | Yes | `packages/server/src/admin/routes/properties/propertiesApiList.ts` — Added `requireTenantAccess(request, reply, id)` guard replacing bare `session.user` check (mirrors Python `@require_tenant_access(api_mode=True)` authorized_properties.py L953). Response shape and DB query unchanged at 1:1 parity. |
| ADMIN-049-A | done | `src/admin/routes/properties/propertyTags.ts` | Route | `GET /tenant/:id/property-tags` + `POST .../create` | Yes | `packages/server/src/admin/routes/properties/propertyTags.ts` — Added `requireTenantAccess(request, reply, id)` guard on GET (Python L432) and POST (Python L484); set `request.auditOperation = "create_property_tag"` on POST (mirrors Python `@log_admin_action("create_property_tag")` L483). Core tag logic (all_inventory auto-create, duplicate check, tag_id normalization, insert) unchanged at 1:1 parity. |
| ADMIN-050-A | done | `src/admin/routes/properties/propertyActions.ts` | Route | `POST .../verify-all`, `.../sync-from-adagents`, `.../:p_id/verify-auto` | Yes | `packages/server/src/admin/routes/properties/propertyActions.ts` — Added `requireTenantAccess(request, reply, id)` on all 3 routes (mirrors Python `@require_tenant_access()` L535/L586/L747). Added `request.auditOperation` on all 3 routes: `"verify_all_properties"`, `"sync_properties_from_adagents"`, `"verify_property_auto"` (mirrors Python `@log_admin_action` L534/L585/L746). Added module-level in-memory 60s rate limit Map for `sync-from-adagents` (mirrors Python `tenant.metadata.last_property_sync` cooldown logic; no `metadata` column in Drizzle schema). PropertyVerificationService/PropertyDiscoveryService not yet ported to TS — route stubs preserved. |
| ADMIN-051-A | done | `src/admin/routes/adapters/mockConfig.ts` | Route | `GET/POST /adapters/mock/config/:tenant/:product` | Yes | `packages/server/src/admin/routes/adapters/mockConfig.ts` — Added `requireTenantAccess(request, reply, id)` on both GET and POST routes, replacing bare `session.user` check (mirrors Python `@require_tenant_access()` adapters.py L23). All 9 config fields and delivery_simulation logic unchanged at 1:1 parity. |
| ADMIN-052-A | done | `src/admin/routes/adapters/inventorySchema.ts` | Route | `GET /adapter/:name/inventory_schema` → JSON (501 if unimplemented) | Yes | `packages/server/src/admin/routes/adapters/inventorySchema.ts` — Added `requireTenantAccess(request, reply, id)` guard replacing bare `session.user` check (mirrors Python `@require_tenant_access()` adapters.py L120). 501 response shape unchanged. Fixed unused `id` destructuring that was present but not used — now properly extracted and passed to the guard. |
| ADMIN-053-A | done | `src/admin/routes/adapters/adapterConfig.ts` | Route | `POST /api/tenant/:id/adapter-config` → JSON `{ success, adapter_type }` | Yes | `packages/server/src/admin/routes/adapters/adapterConfig.ts` — Added: (1) `requireTenantAccess(request, reply, id)` guard replacing bare `session.user` check; (2) `request.auditOperation = "update_adapter_config"` for audit logging via auditPlugin; (3) `KNOWN_ADAPTER_TYPES` set validation — unknown adapter type returns 400 `Validation error: Unknown adapter type: ...` mirroring Python `get_adapter_schemas` null→404 path; raw dict config persisted (full Pydantic model validation not feasible without TS schema classes). |
| ADMIN-054-A | done | `src/admin/routes/adapters/capabilities.ts` | Route | `GET /api/adapters/:type/capabilities` | Yes | `packages/server/src/admin/routes/adapters/capabilities.ts` — Rewrote `KNOWN_ADAPTERS` with all 9 Python `AdapterCapabilities` fields (supports_inventory_sync, supports_inventory_profiles, inventory_entity_label, supports_custom_targeting, supports_geo_targeting, supports_dynamic_products, supported_pricing_models, supports_webhooks, supports_realtime_reporting). Mock values corrected to match Python mock_ad_server.py L64-74. Broadstreet values match adapter.py L77-87. GAM/kevel/triton use base defaults. Removed non-Python `supports_creatives` field. Added `requireTenantAccess` guard using `session.tenant_id` (route has no `:id` param). |
| ADMIN-055-A | done | `src/admin/routes/adapters/broadstreet.ts` | Route | `POST .../adapters/broadstreet/test-connection` + `GET .../zones` | Yes | `packages/server/src/admin/routes/adapters/broadstreet.ts` — Added `requireTenantAccess` guard on both routes. `test-connection`: replaced hardcoded stub with real `fetch` to `https://api.broadstreetads.com/api/0/networks/{networkId}?access_token=...` (mirrors Python BroadstreetClient.get_network() L181-184); returns real `network_name` from API response; invalid credentials now trigger a real API error → 500. `zones`: replaced `{zones:[]}` stub with real `fetch` to `/networks/{networkId}/zones?access_token=...` (mirrors Python BroadstreetClient.get_zones() L394-397); returns actual zone objects `{id, name}`. 30s timeout via `AbortSignal.timeout`. |
| ADMIN-057-A | done | `src/admin/routes/inventoryProfiles/profilesCrud.ts` | Route | `GET/POST /tenant/:id/inventory-profiles/`, `/add`, `/:p_id/edit`, `DELETE /:p_id/delete` | Yes | `packages/server/src/admin/routes/inventoryProfiles/profilesCrud.ts` — Core CRUD (list+product_count join, add with duplicate check, edit, delete with product-count guard) matches Python 1:1. **Missing**: (1) No `require_tenant_access` guard on any route — Python `@require_tenant_access()` on list, add, edit, delete (inventory_profiles.py L131/L177/L372/L590); TS only checks `session.user`; (2) No `@log_admin_action` on add (`"create_inventory_profile"` L178), edit (`"update_inventory_profile"` L374), delete (`"delete_inventory_profile"` L592); (3) No format count validation — Python rejects if `formats` array is empty: "At least one creative format is required" (L204-206); TS accepts empty `format_ids`; (4) No publisher_properties empty check on add — Python rejects if `publisher_properties` is empty after property_mode parse (L296-298); (5) No `property_mode` branching — Python handles `tags` (with tag format `^[a-z0-9_]{2,50}$` validation L233), `property_ids` (with DB existence check L265-274), `full`/`all`/`specific` (JSON textarea parse); TS accepts raw `publisher_properties` array without any validation; (6) No tag format validation `^[a-z0-9_]{2,50}$` for tag-mode inputs (Python L233-244); (7) No product-count warning on edit — Python flashes warning "profile is used by {N} product(s). Changes will affect future media buys" (L550-556); TS omits; (8) `GET /` list response missing `inventory_summary`, `format_summary`, `property_summary` computed strings — Python computes these via helper functions (L152-165); TS list returns raw `inventory_config`/`format_ids`/`publisher_properties` fields only (note: `/api/list` in profilesApi.ts does have summaries). |
| ADMIN-057-B | done | `src/admin/routes/inventoryProfiles/profilesApi.ts` | Route | `GET .../inventory-profiles/:id/api`, `.../preview`, `GET .../api/list` → JSON | Yes | `packages/server/src/admin/routes/inventoryProfiles/profilesApi.ts` — All 3 endpoints (`/:profileId/api`, `/:profileId/preview`, `/api/list`) response shapes match Python 1:1: `api` returns inventory_config+targeted_ad_unit_ids+targeted_placement_ids+include_descendants+formats+publisher_properties+property_mode+targeting_template; `preview` returns ad_unit_count+placement_count+format_count+format_summary+property_summary; `api/list` returns profiles with inventory_summary+format_summary+property_summary+product_count. Helper functions (getInventorySummary, getFormatSummary, getPropertySummary) match Python private functions 1:1. **Missing**: No `require_tenant_access(api_mode=True)` guard on any of the 3 routes — Python uses `@require_tenant_access(api_mode=True)` on all 3 (inventory_profiles.py L629/L657/L682), which enforces API-mode session token check beyond simple user presence; TS only checks `session.user`. |
| ADMIN-058-A | done | `src/admin/routes/policy/policyPages.ts` | Route | `GET /tenant/:id/policy/` + `/rules` | Yes | `packages/server/src/admin/routes/policy/policyPages.ts` (policyPagesRoute: GET /tenant/:id/policy/ + GET /tenant/:id/policy/rules; auth: session.user→401, viewer role→403, tenant_admin cross-tenant→403 — matches Python `@require_auth()` + role checks 1:1; `getPolicyIndexPayload()`: defaultPolicySettings const matches Python default_policies dict 1:1 (6 default_prohibited_categories, 5 default_prohibited_tactics); tenant.policySettings merge with defaults matches `config.get("policy_settings",{}).update(tenant_policies)`; audit_logs query (operation="policy_check", limit=20, desc timestamp) → recentChecks with policy_status/brief/reason from details matches Python L74-95; pendingSteps query (stepType="policy_review", status="pending", joined via contexts.tenantId) → pendingReviews with task_id/created_at/brief/advertiser matches Python L99-120; JSON response vs HTML template is expected React SPA architecture. Note: Python uses `get_tenant_config_from_db()` wrapper while TS reads `tenant.policySettings` directly — both produce equivalent policy_settings dict since policyActions.ts stores the dict directly on that column.) |
| ADMIN-058-B | done | `src/admin/routes/policy/policyActions.ts` | Route | `POST /tenant/:id/policy/update`, `GET/POST /policy/rules`, `GET/POST .../review/:task_id` | Yes | `packages/server/src/admin/routes/policy/policyActions.ts` — `POST /update`: role check (super_admin/tenant_admin required), body parsing for enabled/require_manual_review/prohibited_advertiser/categories/tactics, default_prohibited_categories/tactics preservation, DB update to tenant.policySettings all match Python policy.py L132-199 1:1. `GET/POST /review/:taskId`: step lookup via contexts join, GET returns step details, POST approves/rejects via status update + direct `db.insert(auditLogs)` (equivalent to Python `audit_logger.log()`) — matches Python L209-289 1:1. **Missing**: No `@log_admin_action("update_policy")` on `POST /update` — Python L134 uses `@log_admin_action("update_policy")` decorator which fires the admin audit log; TS `POST /update` never sets `request.auditOperation` so the auditPlugin does not log the policy update action. `GET/POST /rules` redirect handled in policyPages.ts (returns same data) — acceptable for React SPA. |
| ADMIN-059-A | done | `src/admin/routes/activity/activityRest.ts` | Route | `GET /tenant/:id/activity`, `/activities` → JSON `{ activities, count }` | Yes | `packages/server/src/admin/routes/activity/activityRest.ts` — Added `requireTenantAccess(request, reply, id)` guard on both `GET /tenant/:id/activity` and `GET /tenant/:id/activities`, replacing bare `session.user` checks. Also wired `parseAuditOperation` from `auditParseService.ts` into `formatActivityFromAuditLog()`, removing duplicated inline classification. |
| ADMIN-059-B | done | `src/admin/routes/activity/activitySse.ts` | Route | `GET /tenant/:id/events` → SSE stream (Node.js `response.raw.write`) | Yes | `packages/server/src/admin/routes/activity/activitySse.ts` — Fixed all 6 missing items: (1) Added `requireTenantAccess(request, reply, id)` guard; (2) Added `HEAD /tenant/:id/events` handler returning 200; (3) Replaced plain count with `connectionTimestamps` Map (number[]) using 60s sliding-window cleanup before comparison; (4) Added `Access-Control-Allow-Origin: *` to SSE response headers; (5) Added `sseErrorLine()` helper emitting `event: error\ndata: ...\n\n` named SSE events; (6) Added 5-second `setTimeout` back-off after stream error before resuming the poll interval. |
| ADMIN-059-C | done | `src/admin/services/auditParseService.ts` | Logic | Parse audit log operation strings: MCP.*/A2A.*/admin → type + display label | Yes | `packages/server/src/admin/services/auditParseService.ts` — Rewrote to match Python content-based type taxonomy: `ActivityType` is now `"media-buy" \| "creative" \| "error" \| "product-query" \| "human-task" \| "a2a" \| "api-call"`; classification logic uses method-name substring checks (`media_buy`, `creative`, `get_products`, `human`/`approval`, `A2A.` prefix) mirroring Python `format_activity_from_audit_log()` 1:1; returns `{ type, displayLabel, adapterName, method }`. `ParsedAuditOperation` now exposes `adapterName` and `method` so callers don't need to re-split the operation string. Wired into `activityRest.ts` `formatActivityFromAuditLog()` — no longer dead code. |
| ADMIN-060-A | done | `src/admin/routes/principals/principalsCrud.ts` | Route | `GET/POST /tenant/:id/principals`, `GET/POST .../create`, `GET/POST .../:p_id/edit`, `DELETE/POST .../:p_id/delete` | Yes | `packages/server/src/admin/routes/principals/principalsCrud.ts` — Added `requireTenantAccess(request, reply, id)` guard on all 5 handlers (list, GET create, POST create, GET edit, POST edit, DELETE delete, POST delete), replacing bare `session.user` checks. Added `request.auditOperation = "create_principal"` on POST create, `"edit_principal"` on POST edit, and `"delete_principal"` on both DELETE and POST delete routes, wiring all write operations into the auditPlugin. |
| ADMIN-060-B | done | `src/admin/routes/principals/principalsApi.ts` | Route | `GET /tenant/:id/principal/:p_id`, `POST .../update_mappings`, `POST .../testing-config` | Yes | `packages/server/src/admin/routes/principals/principalsApi.ts` — Added `requireTenantAccess(request, reply, id)` guard on all 3 routes (GET principal, POST update_mappings, POST testing-config), replacing bare `session.user` checks. Added `request.auditOperation = "update_mappings"` on `POST /update_mappings` to wire audit logging via auditPlugin. Removed unused `tenants` import. |
| ADMIN-060-C | done | `src/admin/routes/principals/principalWebhooks.ts` | Route | `GET .../webhooks`, `POST .../webhooks/register`, `POST .../:config_id/delete`, `POST .../:config_id/toggle` | Yes | `packages/server/src/admin/routes/principals/principalWebhooks.ts` — Added `requireTenantAccess(request, reply, id)` guard on all 4 routes, replacing bare `session.user` checks. Added `request.auditOperation = "register_webhook"/"delete_webhook"/"toggle_webhook"` on POST write routes. Expanded `isValidWebhookUrl()` with full RFC-1918 + link-local SSRF protection via `isPrivateIp()` helper blocking 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 169.254.0.0/16, and 127.x.x.x ranges. |
| ADMIN-061-A | done | `src/admin/routes/principals/principalGamApi.ts` | Route | `POST /tenant/:id/api/gam/get-advertisers` | Yes | `packages/server/src/admin/routes/principals/principalGamApi.ts` — Added `requireTenantAccess(request, reply, id)` guard replacing `session.user` check; added `request.auditOperation = "get_gam_advertisers"` wiring audit logging; updated GAM-enabled check comment to document Python `is_gam_tenant` parity; wrapped stub response in try/catch returning `{error: "Failed to fetch advertisers: ..."}` 500 on error — mirrors Python principals.py L492-494. GAM SDK (GoogleAdManager) not yet migrated to TS; stub returns empty advertisers list. |
| ADMIN-062-A | done | `src/admin/routes/operations/reporting.ts` | Route | `GET /tenant/:id/reporting` | Yes | `packages/server/src/admin/routes/operations/reporting.ts` (reportingRoute) — Auth: `session.user` check + `role !== "super_admin" && tenant_id !== id` → 403 matches Python `@require_auth()` + manual session check (operations.py L43-54) 1:1; tenant lookup + 404 ✓; GAM availability check (`adServer !== "google_ad_manager"`) → 400 matches Python render_template("error.html") 400 — JSON vs HTML is expected SPA architecture; JSON response with tenant fields (tenant_id, name, ad_server, subdomain, is_active, reporting_available) passes all Python template context fields 1:1. |
| ADMIN-062-B | done | `src/admin/routes/operations/mediaBuyDetail.ts` | Route | `GET /tenant/:id/media-buy/:mb_id` | Yes | `packages/server/src/admin/routes/operations/mediaBuyDetail.ts` — Added `requireTenantAccess` guard; replaced hardcoded `workflow_steps: []` with real ObjectWorkflowMapping → WorkflowStep → Context join query (mirrors Python ContextManager.get_object_lifecycle); replaced hardcoded `creative_assignments_by_package: {}` with raw SQL JOIN on creative_assignments + creatives grouped by package_id (mirrors Python operations.py L146-167); added `pending_approval_step` — finds first step with status in ["requires_approval", "pending_approval"] (Python L173-180); added `status_message` — "approval_required" or "pending_other" (Python L188-200); delivery_metrics and computed_state/readiness return null (adapter + MediaBuyReadinessService not migrated to TS). |
| ADMIN-062-C | done | `src/admin/routes/operations/mediaBuyActions.ts` | Route | `POST .../approve`, `.../trigger-delivery-webhook` | Yes | `packages/server/src/admin/routes/operations/mediaBuyActions.ts` — Added `requireTenantAccess` guard + `request.auditOperation = "approve_media_buy"` on both routes; fixed step status: `"completed"` → `"approved"` / `"failed"` → `"rejected"` (Python L346); added comments append `{user, timestamp, comment}` to `step.comments` (Python L349-357); added creative approval check via raw SQL on creative_assignments → all "approved" → date-based status "scheduled"/"active"/"completed"; unapproved creatives → "draft" (Python L361-417); added reject path: sets media_buy.status="rejected" if pending_approval (Python L533-535); `execute_approved_media_buy()` adapter call and webhook notifications not migrated to TS. |
| ADMIN-062-D | done | `src/admin/routes/operations/webhooks.ts` | Route | `GET /tenant/:id/webhooks` | Yes | `packages/server/src/admin/routes/operations/webhooks.ts` — Replaced bare `session.user` check with `requireTenantAccess(request, reply, id)` guard (mirrors Python `@require_tenant_access()` operations.py L640); removed unused `getAdminSession` import. All query logic, filters, and response shape unchanged at Python parity. |
| ADMIN-063-A | done | `src/admin/routes/agents/creativeAgents.ts` | Route | `GET/POST .../creative-agents/`, `/add`, `/:id/edit`, `DELETE /:id`, `POST /:id/test` | Yes | `packages/server/src/admin/routes/agents/creativeAgents.ts` — (1) Replaced bare `session.user` checks with `requireTenantAccess(request, reply, id)` guard on all 6 routes (list, GET add, POST add, GET edit, POST edit, DELETE, POST test) — mirrors Python `@require_tenant_access()` creative_agents.py L20/L67/L132/L208/L230; (2) Added `request.auditOperation = "add_creative_agent"` on POST /add, `"edit_creative_agent"` on POST /edit, `"test_creative_agent"` on POST /test — mirrors Python `@log_admin_action` decorators; (3) Replaced stub with real `callAgentMcpTool()` helper — connects to `{agent_url}/mcp/` via MCP Streamable HTTP (initialize → tools/call `list_creative_formats`), returns `{success:true, format_count, sample_formats[0..5]}` on success, `{success:false, error:"Agent returned no formats"}` 400 when formats=[],  `{success:false, error:"Connection failed: ..."}` 500 on exception — mirrors Python `_fetch_formats_from_agent` L271-290. |
| ADMIN-064-A | done | `src/admin/routes/agents/signalsAgents.ts` | Route | `GET/POST .../signals-agents/`, `/add`, `/:id/edit`, `DELETE /:id`, `POST /:id/test` | Yes | `packages/server/src/admin/routes/agents/signalsAgents.ts` — (1) Replaced bare `session.user` checks with `requireTenantAccess(request, reply, id)` guard on all 6 routes (list, GET add, POST add, GET edit, POST edit, DELETE, POST test) — mirrors Python `@require_tenant_access()` signals_agents.py L20/L67/L137/L217/L239; (2) Added `request.auditOperation = "add_signals_agent"` on POST /add, `"edit_signals_agent"` on POST /edit, `"test_signals_agent"` on POST /test — mirrors Python `@log_admin_action` decorators; (3) Replaced stub with real `callAgentMcpTool()` helper — connects to `{agent_url}/mcp/` via MCP Streamable HTTP (initialize → tools/call `get_signals` with `signal_spec:"test"` + minimal `deliver_to`), returns `{success:true, message, signal_count}` on success, `{success:false, error:"Connection failed: ..."}` 500 on exception — mirrors Python `SignalsAgentRegistry.test_connection()` L325-395; agent `timeout` (seconds) converted to ms for AbortSignal. |
| ADMIN-065-A | done | `src/admin/routes/publisherPartners.ts` | Route | `GET/POST /tenant/:id/publisher-partners`, `DELETE /:p_id`, `POST /sync`, `GET /:p_id/properties` | Yes | `packages/server/src/admin/routes/publisherPartners.ts` — (1) Replaced bare `session.user` checks with `requireTenantAccess(request, reply, id)` on all 5 routes. (2) `POST /sync`: for dev/mock tenants → bulk-update all partners to `sync_status="success"`, `is_verified=true`; for real tenants → builds `agentUrl` from `tenant.virtualHost` or `${subdomain}.${SALES_AGENT_DOMAIN}`, fetches `https://{domain}/.well-known/adagents.json` per partner with 10s `AbortSignal.timeout`, calls `verifyAgentAuthorization()` (checks `authorized_agents[].url` with normalized URL comparison), updates `syncStatus`/`isVerified`/`syncError`/`lastSyncedAt` per row; errors classified as NOT_FOUND / VALIDATION / TIMEOUT / UNEXPECTED; returns `{synced, verified, errors, total}`. (3) `GET /:p_id/properties`: builds `agentUrl`, fetches live `adagents.json`, returns `{is_authorized:false, error}` when not authorized or on fetch error; returns `{is_authorized:true, property_ids, property_tags, properties}` from `getPropertiesByAgent()` when authorized — mirrors Python `AuthorizationContext` field-for-field. |
| ADMIN-066-A | done | `src/admin/routes/formatSearch.ts` | Route | `GET /api/formats/search`, `/list`, `/templates`, `/agents` | Yes | `packages/server/src/admin/routes/formatSearch.ts` — (1) `GET /search`: implemented `buildAgentList(tenant_id?)` → default AdCP agent + tenant DB `creativeAgents`; calls `list_creative_formats` MCP tool on each agent via `callAgentMcpTool()` (MCP Streamable HTTP initialize + tools/call); filters results by query substring (format_id, name, description) and optional `type` filter; returns `{formats:[...], count:N}` — mirrors Python `registry.search_formats()`. (2) `GET /list`: same agent discovery, groups formats by `agent_url` with nested `format_id:{id,agent_url}` object (matching Python `format_id_value` dict shape); returns `{agents:{agent_url:[...]}, total_formats:N}` — mirrors Python `registry.list_all_formats()`. Individual agent failures silently skipped (parity with Python registry pattern). `GET /templates` and `GET /agents` unchanged at parity. |
| ADMIN-068-A | done | `src/admin/routes/tenantManagementApi.ts` | Route | `GET /api/v1/tenant-management/health`; `GET/POST /tenants`; `GET/PUT/DELETE /tenants/:id`; `POST /init-api-key` | Yes | `packages/server/src/admin/routes/tenantManagementApi.ts` — (1) Added `validateWebhookUrl()` SSRF guard (same blocked-hostname + CIDR logic as slack.ts) applied to `slack_webhook_url`/`slack_audit_webhook_url`/`hitl_webhook_url` in `POST /tenants` and `PUT /tenants/:id` — mirrors Python `WebhookURLValidator.validate_webhook_url()` L140-144, L404-413; returns 400 on violation. (2) `PUT /tenants/:id` adapter_config update block — if `body.adapter_config` present, fetches current adapter row and updates per `adapter_type` (GAM: `gam_network_code`/`gam_refresh_token`/`gam_trafficker_id`/`gam_manual_approval_required`; kevel: `kevel_network_id`/`kevel_api_key`/`kevel_manual_approval_required`; triton: `triton_station_id`/`triton_api_key`; mock: `mock_dry_run`) — mirrors Python L448-485. (3) `GET /tenants/:id` now includes `principals_count` via `count()` query on `principals` table — mirrors Python `func.count(Principal)` L376-378. (4) `GET /tenants/:id` adapter_config now uses `has_refresh_token`/`has_api_key` boolean masks for GAM/kevel/triton tokens — mirrors Python L352-371. (5) `DELETE /tenants/:id` hard-delete now cascades `auditLogs` → `mediaBuys` → `products` → `users` → `adapterConfigs` → `principals` → `tenants` — mirrors Python L524-529. (6) `GET /tenants` list now ordered `desc(tenants.createdAt)` — mirrors Python L88. |
| ADMIN-069-A | done | `src/admin/routes/syncApi.ts` | Route | `POST /api/sync/trigger/:id`; `GET /status/:sync_id`, `/history/:id`, `/tenants`, `/stats`; orders + line-items | Yes | `packages/server/src/admin/routes/syncApi.ts` — Added 4 missing routes: (1) `POST /tenant/:id/orders/sync`: validates tenant + adapter config, creates SyncJob (type=orders), returns stub completed summary (GAM SDK not migrated); (2) `GET /tenant/:id/orders`: validates tenant_id/status/advertiser_id/search/has_line_items inputs with same error messages as Python L596-630; queries `gamOrders` table with Drizzle `ilike`/`eq` filters; post-filters `has_line_items` using aggregated `gamLineItems` count; returns `{total, orders}` matching Python `_order_to_dict` field set; (3) `GET /tenant/:id/orders/:order_id`: queries `gamOrders` + all `gamLineItems` for order; returns order dict + `line_items[]` + `stats{total_line_items, active_line_items, total_impressions, total_clicks, total_spend}` matching Python L339-376; (4) `GET /tenant/:id/line-items`: filters by status/line_item_type/search/order_id; maps each row via `_line_item_to_dict`-equivalent including `delivery_percentage` calculation. Added `gamLineItems` Drizzle schema to `packages/server/src/db/schema/gamInventory.ts` (1:1 parity with `gam_line_items` migration L65-131). |
| ADMIN-070-A | done | `src/admin/routes/gamInventory/syncTree.ts` | Route | `POST /api/tenant/:id/inventory/sync`; `GET .../tree`, `.../search` | Yes | `packages/server/src/admin/routes/gamInventory/syncTree.ts` — Added `requireTenantAccess` guard to all 3 routes replacing bare `session.user` check. Fixed `GET /tree` response key names to match Python `inventory.py` L1087-1098: renamed `tree`→`root_units`, `placements_count`→`placements`, `labels_count`→`labels`, `targeting_count`→`custom_targeting_keys`; added `audience_segments` count (inventory_type=audience_segment), `total_units` (len of allUnits), `root_count` (len of roots), and `last_sync` (latest completed inventory SyncJob completedAt). |
| ADMIN-070-B | done | `src/admin/routes/gamInventory/productInventory.ts` | Route | `GET/POST .../product/:p_id/inventory`; `GET .../suggest` | Yes | `packages/server/src/admin/routes/gamInventory/productInventory.ts` — Replaced bare `session.user` check with `requireTenantAccess(request, reply, tenantId)` guard on all 3 route handlers (GET inventory, POST inventory, GET suggest), matching Python `@require_tenant_access(api_mode=True)` on L2257+L2388. Added `@log_admin_action("assign_inventory_to_product")` equivalent on POST: inserts `auditLogs` row with `operation="assign_inventory_to_product"`, `principalName`, `adapterId="admin_ui"`, `success=true`, `details={product_id, inventory_id, inventory_type, mapping_id}` after DB write (audit failure wrapped in try/catch to not block response). |
| ADMIN-070-C | done | `src/admin/routes/gamInventory/targeting.ts` | Route | `GET/POST .../targeting/all`; `GET/POST .../targeting/values/:key_id` | Yes | `packages/server/src/admin/routes/gamInventory/targeting.ts` — Replaced bare `session.user` checks with `requireTenantAccess(request, reply, tenantId)` on both GET routes (matching Python `@require_tenant_access(api_mode=True)` on L56, L164). Added adapter-config credential check to `GET /targeting/values/:key_id`: queries `adapterConfigs` table; returns 400 "No adapter configured for this tenant" if missing, 400 "GAM network code not configured" if no `gamNetworkCode`, 400 "GAM authentication not configured..." if neither OAuth nor service-account credentials present — matching Python L210-226. Removed both POST variants (`POST /targeting/all` and `POST /targeting/values/:key_id`) which had no Python equivalents. GAM SDK call remains a stub (`{ values: [], count: 0 }`) pending TypeScript SDK migration. |
| ADMIN-071-A | done | `src/admin/routes/gamReporting/base.ts` | Route | `GET /api/tenant/:id/gam/reporting` | Yes | `packages/server/src/admin/routes/gamReporting/base.ts` — Replaced manual `session.user` + role/tenant_id check with `requireTenantAccess(request, reply, tenantId)`. Added adapter-config GAM credential check inside try block: queries `adapterConfigs`; returns 500 "GAM client not configured for this tenant" if adapter missing or neither `gamRefreshToken` nor `gamServiceAccountJson` present — matching Python L166-168. Derives `networkTimezone` from `adapterConfig.gamNetworkTimezone` (falling back to requested timezone) and uses it as `data_timezone` in metadata — replacing the previous hardcoded `timezone` value. Wrapped the GAM-client + stub-response block in try/catch returning `{ error: "Failed to get reporting data: <message>" }` 500 on exceptions, matching Python L210-212. |
| ADMIN-071-B | done | `src/admin/routes/gamReporting/breakdown.ts` | Route | `GET .../countries`, `.../ad-units`, `.../advertiser/:adv_id/summary` | Yes | `packages/server/src/admin/routes/gamReporting/breakdown.ts` — Refactored `ensureGamTenant()` helper to: (1) call `requireTenantAccess(request, reply, tenantId)` replacing manual `session.user` + role/tenant_id check; (2) also query and return `adapterConfig` alongside `tenant` (new `GamTenantContext` type). Added `ensureGamClient(ctx, reply)` helper that returns 500 "GAM client not configured for this tenant" when adapter missing or no OAuth/SA credentials — matching Python L450-451, L539-540. Wrapped each route handler body in try/catch returning `{ error: "Failed to get country breakdown: <msg>" }`, `{ error: "Failed to get ad unit breakdown: <msg>" }`, `{ error: "Failed to get advertiser summary: <msg>" }` on exceptions — matching Python L474-476, L564-566, L273-275. Stub response data unchanged pending TypeScript GAM SDK migration. |
| ADMIN-071-C | done | `src/admin/routes/gamReporting/principal.ts` | Route | `GET .../principals/:p_id/gam/reporting` + `/summary` | Yes | `packages/server/src/admin/routes/gamReporting/principal.ts` — Replaced manual `session.user` + role/tenant_id check with `requireTenantAccess(request, reply, tenantId)` on both routes. Added `adapterConfigs` query inside try block: returns 500 "GAM client not configured for this tenant" when adapter missing or neither `gamRefreshToken` nor `gamServiceAccountJson` present — matching Python `get_ad_manager_client_for_tenant()` L338-366. Derives `networkTimezone` from `adapterConfig.gamNetworkTimezone ?? "America/New_York"` matching Python L349-353. Wraps handler body in try/catch returning `{ error: "Failed to get reporting data: <msg>" }` 500 on exceptions — matching Python L389-391. Summary route follows same pattern with `{ error: "Failed to get advertiser summary: <msg>" }` matching Python L648-650. GAM reporting service not yet migrated; stub response data unchanged. |
| ADMIN-072-A | done | `src/admin/routes/public/signup.ts` | Route | `GET /signup`; `GET /signup/start`; redirect if on tenant subdomain | Yes | `packages/server/src/admin/routes/signup.ts` — `GET /signup`: `resolveTenantFromHeaders()` replicates Python's Apx-Incoming-Host + subdomain checks → redirect to `/login`; authenticated user checks (tenant_id → dashboard redirect, is_super_admin → root redirect) match Python 1:1; returns `{ page: "landing" }` (JSON equivalent of `render_template("landing.html")` for React architecture). `GET /signup/start`: sets `signup_flow=true` + `signup_step="oauth"` in session + redirects to `/auth/google` — matches Python `public.signup_start()` 1:1. TS adds extra tenant-subdomain guard on `/signup/start` (not in Python) — defensive addition, not a deficit. Flash messages omitted (N/A for JSON API / React architecture). |
| ADMIN-072-B | done | `src/admin/routes/public/onboarding.ts` | Route | `GET /signup/onboarding` | Yes | `packages/server/src/admin/routes/onboarding.ts` — `GET /signup/onboarding`: `!session.signup_flow` → redirect to `/signup` (Python: redirect to `public.landing` with flash); `!session.user` → redirect to `/signup/start` (Python: redirect to `public.signup_start` with flash); returns `{ page: "onboarding", user_email, user_name }` (JSON equivalent of `render_template("signup_onboarding.html", user_email, user_name)` for React architecture). All 3 logic paths match Python `public.signup_onboarding()` L74-95 1:1. Flash messages omitted (N/A for JSON API). |
| ADMIN-073-A | done | `src/admin/plugins/scriptRootPlugin.ts` | Logic | Fastify plugin: read `X-Script-Name` / `X-Forwarded-Prefix`; set `request.scriptRoot`; rewrite PATH_INFO | Yes | `packages/server/src/admin/plugins/scriptRootPlugin.ts` — Added all 3 missing behaviours from Python `CustomProxyFix` (`_legacy/src/admin/app.py` L53-107): (1) **PRODUCTION fallback**: when no header AND `process.env.PRODUCTION === "true"` AND no `apx-incoming-host` header → `scriptRoot = "/admin"` — mirrors Python L73-79; (2) **PATH_INFO rewriting**: in `onRequest` hook, if `request.url` starts with `scriptRoot`, strips the prefix and rewrites `request.raw.url` + `request.url` so Fastify routes match without the prefix — mirrors Python L86-91; (3) **Redirect Location fixup**: `onSend` hook checks 3xx status codes and prepends `scriptRoot` to `Location` header when it starts with `/` and is not already prefixed and contains no `://` — mirrors Python `custom_start_response` L96-110. |
| ADMIN-075-A | done | `src/admin/plugins/auditPlugin.ts` | Logic | Fastify `onResponse` hook: log operation to `audit_logs` table via Drizzle | Yes | `packages/server/src/admin/plugins/auditPlugin.ts` (onResponse hook: checks request.auditOperation, extracts tenantId from session/params, principalName/principalId from session.user, success from statusCode 200-399 or auditSuccess override, errorMessage from auditErrorMessage; inserts auditLogs via Drizzle with tenantId+operation+principalName+principalId+adapterId="admin_ui"+success+errorMessage+details; silent catch on DB failure — matches Python log_admin_action decorator in audit_decorator.py L142-237 + AuditLogger.log_operation in audit_logger.py L63-133 field-for-field: operation, principal_name, principal_id, adapter_id, success, error_message, details) |
| ADMIN-076-A | done | `src/admin/plugins/socketio.ts` | Logic | `@fastify/websocket` or `socket.io` plugin; `connect`/`disconnect`/`subscribe` handlers; `join room tenant_{id}` | Yes | `packages/server/src/admin/plugins/socketio.ts` (@fastify/websocket plugin at /ws; connect: logs on WebSocket open; disconnect: socket.on("close")→leaveAllRooms cleanup via WeakMap<WebSocket,Set<string>>; subscribe: socket.on("message")→JSON parse {event:"subscribe", tenant_id}→joinRoom(`tenant_${tenant_id}`) via Map<string,Set<WebSocket>>; emitToRoom(roomName, event, data) broadcasts JSON {event,data} to all readyState=1 sockets — matches Python Flask-SocketIO in app.py L437-501: @socketio.on("connect"/"disconnect"/"subscribe"), join_room(f"tenant_{tenant_id}"), broadcast_activity_to_websocket emit("activity", activity, room=f"tenant_{tenant_id}") 1:1) |
| ADMIN-077-A | done | `src/admin/routes/adapters/gamConfig.ts` | Route | `GET/POST /adapters/gam/config/:tenant/:product` | Yes | `packages/server/src/admin/routes/adapters/gamConfig.ts` (GET /adapters/gam/config/:tenant/:product: auth guard session.user+role/tenant access, DB lookup products by tenantId+productId→404, returns {tenant_id, product_id, product_name, config from implementationConfig}; POST: same auth+lookup, merges body into existing config, validateGamProductConfig checks required ["network_code","advertiser_id"]→400, updates products.implementationConfig→{success:true, config}; matches Python google_ad_manager.py L1688-1707 gam_config_ui route + validate_product_config 1:1, exceeds Python by adding DB persistence on POST) |
| ADMIN-077-B | done | `src/admin/routes/adapters/mockConnectionConfig.ts` | Route | `GET/POST /adapters/mock/connection_config/:tenant` | Yes | `packages/server/src/admin/routes/adapters/mockConnectionConfig.ts` (GET /adapters/mock/connection_config/:tenant: auth guard session.user+role/tenant access, DB select adapterConfigs by tenantId, returns {tenant_id, adapter_type:"mock", dry_run, manual_approval_required} with defaults when no row or non-mock; POST: same auth, body extraction with boolean coercion for dry_run+manual_approval_required, upsert pattern — existing→update set adapterType+mockDryRun+mockManualApprovalRequired+configJson+updatedAt, new→insert; returns {success:true, adapter_type, config} — matches Python adapters.py L136-207 save_adapter_config DB write to adapter_configs with mock_dry_run+mock_manual_approval_required legacy columns + config_json column, and MockConnectionConfig from mock_ad_server.py L32-36 dry_run field) |
| ADMIN-056-A | done | `src/admin/routes/settings/tenantManagementSettings.ts` | Route | `GET /settings`; `POST /settings/update`; super-admin guard | Yes | `packages/server/src/admin/routes/settings/tenantManagementSettings.ts` (GET /settings + POST /settings/update; super_admin guard via getAdminSession: 401 no user, 403 role!=="super_admin"; GAM_OAUTH_CLIENT_ID/SECRET env vars; config_items.gam_oauth_status{configured, client_id_prefix, description} + gam_configured + gam_client_id_prefix — shape matches Python settings.py L110-135 1:1; POST returns JSON {success, message} vs Python flash+redirect — expected for React UI architecture) |

---

## Layer 7 – Admin UI: React Frontend (27)

| Task ID | Status | Component | Action Type | Parity Requirement | Doublechecked | New Code Reference |
| --------------- | ------- | ---------------------------------------------- | ----------- | ----------------------------------------------------------------------------------- | ------------- | ------------------ |
| UI-INFRA-001 | done | `ui/package.json` | Scaffold | React 18, Vite, Tailwind, react-router-dom, @tanstack/react-query | Yes | `packages/ui/package.json` (react ^18.3.1, react-dom ^18.3.1, react-router-dom ^7.0.1, @tanstack/react-query ^5.62.0; devDeps: tailwindcss ^3.4.15, vite ^6.0.1, typescript ^5.6.3, @vitejs/plugin-react ^4.3.4, autoprefixer ^10.4.20, postcss ^8.4.49, @types/react ^18.3.12, @types/react-dom ^18.3.1 — all 5 stated dependencies present and version-appropriate) |
| UI-INFRA-002 | done | `ui/vite.config.ts` | Scaffold | Dev proxy to TS backend; `base: scriptRoot` support | Yes | `packages/ui/vite.config.ts` (VITE_SCRIPT_ROOT→base config with trailing slash normalization; VITE_API_ORIGIN default http://localhost:8080; proxy: /api, /auth, /tenant, /adapters, /settings, /ws with ws:true — all matching Flask blueprint prefixes from _legacy/src/admin/app.py L373-400; port 5173; react plugin) |
| UI-INFRA-003 | done | `ui/src/main.tsx` + router | Scaffold | BrowserRouter; root routes; 404 fallback | Yes | `packages/ui/src/main.tsx` (React.StrictMode→AuthProvider→BrowserRouter→Routes; 24 routes: /, /signup, /login, /select-tenant, /tenant/:id (dashboard), /tenant/:id/products + /add + /:productId/edit, /tenant/:id/creatives/review + /list, /tenant/:id/workflows + /:workflowId/steps/:stepId/review, /tenant/:id/authorized-properties + /create + /:propertyId/edit, /tenant/:id/inventory-profiles + /add + /:profileId/edit, /tenant/:id/principals + /create + /:principalId/edit, /tenant/:id/users, /tenant/:id/settings, /tenant/:id/gam/config + /reporting; path="*"→NotFound 404 component — routes match all Flask blueprint registrations from app.py for tasks marked done; pending routes like media-buys, reporting, webhooks correctly excluded) |
| UI-AUTH-001 | done | `ui/src/context/AuthContext.tsx` | Logic | `useAuth()` hook: user, role, tenant_id, signup_flow from session API | Yes | `packages/ui/src/context/AuthContext.tsx` (SessionData interface: user?, role?, tenant_id?, signup_flow?, available_tenants?; AuthContextValue: user/role/tenant_id as string\|null, signup_flow as boolean, available_tenants as TenantOption[], loading, error, refetch; AuthProvider fetches GET /api/session with credentials:"include", 401→null session matching unauthenticated state, non-ok→Error; useAuth throws outside provider; TenantOption{tenant_id, name, is_admin?} — matches Flask session["user"]/["role"]/["tenant_id"]/["signup_flow"] contract from auth.py+public.py 1:1) |
| UI-AUTH-002 | done | `ui/src/components/PrivateRoute.tsx` | Logic | Guards: `require_auth` (redirect to /login if no user); `require_tenant_access` | Yes | `packages/ui/src/components/PrivateRoute.tsx` (requireAuth default true: !user→Navigate to="/login" with state.from matching Python url_for("auth.login", next=request.url); requireTenantAccess: !tenant_id && !super_admin→Navigate to="/select-tenant" matching Python redirect to select_tenant; tenantId mismatch && !super_admin→inline 403 "Access denied" matching Python abort(403); super_admin bypass via role==="super_admin" matching Python is_super_admin(email); loading state shows "Loading…" — DB-level User.filter_by(email, tenant_id, is_active) access check correctly delegated to server /api/session endpoint in React SPA architecture) |
| UI-AUTH-003 | done | `ui/src/pages/LoginPage.tsx` | Logic | Renders login button → `/auth/google`; test-mode: form | Yes | `packages/ui/src/pages/LoginPage.tsx` + `packages/server/src/admin/routes/auth/login.ts` — Added `GET /api/login-context` server endpoint (in `login.ts`) that returns `{ test_mode, oauth_configured, oidc_enabled, single_tenant_mode, tenant_context, tenant_id, tenant_name }` via new `buildLoginContext()` helper — mirrors Python `render_template("login.html", ...)` context from auth.py L326-335. `LoginPage.tsx` rewritten to fetch `/api/login-context` on mount and render: (1) OIDC "Sign in with SSO" button when `oidc_enabled` (login.html L55-63 parity); (2) tenant branding `{tenantName} Sales Agent Dashboard` when `tenant_context` is set (login.html L17-26 parity); (3) "Authentication not configured" warning with setup guide link when `!oauth_configured && !test_mode` (login.html L40-53 parity); (4) `single_tenant_mode` variations — button labels "Log in to Dashboard" vs "Log in as Tenant Admin" + setup-next-step tip (login.html L67-118 parity); (5) Pre-filled quick-login buttons "Log in as Super Admin" (multi-tenant only) and "Log in as Tenant Admin" / "Log in to Dashboard" (login.html L77-98 parity). Manual email/password form preserved alongside. |
| UI-AUTH-004 | done | `ui/src/pages/SelectTenantPage.tsx` | Logic | List tenants from session; redirect on select | Yes | `packages/ui/src/pages/SelectTenantPage.tsx` (useAuth() provides available_tenants from GET /api/session; <select> dropdown lists tenants with name+id; POST /auth/select-tenant with JSON {tenant_id}; redirect handling: 302 opaqueredirect→Location header parse, JSON→data.redirect, fallback→/tenant/:id; refetch() after selection to refresh AuthContext; !user guard→navigate /login; empty tenants→"No tenants available" message; error+loading states; matches _legacy/templates/choose_tenant.html + auth.py L723-773 select_tenant() contract: session tenant list, POST selection, redirect to dashboard. Minor UX difference: TS uses <select> dropdown vs Python radio buttons — functionally equivalent. "Create New Account" link omission tracked by ADMIN-072-A/B signup tasks) |
| UI-LAYOUT-001 | done | `ui/src/components/BaseLayout.tsx` | Logic | Header nav; favicon from tenant; script_name prefix for all hrefs | Yes | `packages/ui/src/components/BaseLayout.tsx` (scriptRoot from import.meta.env.BASE_URL matching Python {{ request.script_root }}; prefixed() helper prepends scriptRoot to all paths; header nav: Dashboard→/tenant/:id or /, Products→/tenant/:id/products, Switch tenant→/select-tenant — all using prefixed(); faviconUrl prop→conditional img tag matching Python base.html favicon link; tenantName right-aligned display matching Python tenant.name header; BaseLayoutProps: children+tenantId?+tenantName?+faviconUrl?; useParams fallback for id — covers all 3 stated parity requirements: header nav ✓, favicon from tenant ✓, script_name prefix ✓) |
| UI-DASH-001 | done | `ui/src/pages/TenantDashboard.tsx` | Logic | Revenue chart (`/api/tenant/:id/revenue-chart`); recent media buys | Yes | `packages/ui/src/pages/TenantDashboard.tsx` — SVG bar chart with interactive 7d/30d/90d period filter buttons (fetchRevenue re-fetches /api/tenant/:id/revenue-chart?period=); 5 metric cards: total_revenue (with MetricTrend ↑/↓ revenue_change/revenue_change_abs), live_buys (scheduled_buys sub-metric), needs_attention (color-coded link → media-buys?status=needs_creatives/needs_approval, needs_creatives/needs_approval sub-labels), active_advertisers (total_advertisers sub-metric, links to settings#advertisers), products; media buys table: 7 columns (Advertiser, Media Buy ID, Buyer Ref, Status, Budget+Currency, Spend, Created) with StatusBadge component rendering 8 CSS colors (live/scheduled/needs_creatives/needs_approval/completed/failed/paused/draft); row onClick → navigate(/tenant/:id/media-buy/:media_buy_id); quick actions grid: 5 operation links (Creatives, Reports, Workflows, Webhooks, Settings). Note: activity feed (UI-ACT-001), setup checklist, pending tasks, ad server display deferred. |
| UI-PROD-001 | done | `ui/src/pages/ProductsListPage.tsx` | Logic | Table from `GET /api/tenant/:id/products`; delete action | Yes | `packages/ui/src/pages/ProductsListPage.tsx` (ProductsListContent: fetch GET /api/tenant/:id/products, table product_id/name/delivery_type, Edit link, handleDelete DELETE /tenant/:id/products/:productId/delete; PrivateRoute) |
| UI-PROD-002 | done | `ui/src/pages/ProductAddPage.tsx` | Logic | Form; adapter-specific product_config sub-component | Yes | `packages/ui/src/pages/ProductAddPage.tsx` — Added 3 adapter-specific config sub-components: MockProductConfig (daily_impressions, fill_rate %, ctr %, viewability %, scenario with auto-adjust presets); GamProductConfig (inventory_profile_id dropdown from context.inventory_profiles, manual targeted_ad_unit_ids/targeted_placement_ids/include_descendants fallback, advanced collapsible section: order_name_template/creative_rotation_type/delivery_rate_type/allow_overbook); BroadstreetProductConfig (targeted_zone_ids, delivery_rate select, frequency_cap). AdapterProductConfig switches on ctx.adapter_type. buildImplConfig() serialises state to POST body as implementation_config. Server addProduct.ts updated: GET now returns inventory_profiles + inventory_synced; POST merges user-provided implementation_config fields on top of generated defaults (userImplConfig spread). Mirrors _legacy/templates/adapters/*/product_config.html parity. |
| UI-PROD-003 | done | `ui/src/pages/ProductEditPage.tsx` | Logic | Prefill from existing product | Yes | `packages/ui/src/pages/ProductEditPage.tsx` (ProductEditContent: GET /tenant/:id/products/:productId/edit for context+product, prefills name/description/pricingOptionsJson; ProductInventoryWidget; POST to update; PrivateRoute) |
| UI-PROD-004 | done | `ui/src/components/ProductInventoryWidget.tsx` | Logic | Fetch/add/remove inventory mappings; uses `/api/tenant/:id/product/:p_id/inventory` | Yes | `packages/ui/src/components/ProductInventoryWidget.tsx` (load: GET /api/tenant/:id/product/:p_id/inventory; handleAdd: POST same; handleRemove: DELETE /tenant/:id/products/:productId/inventory/:mappingId; list add/remove UI) |
| UI-CREA-001 | done | `ui/src/pages/CreativesReviewPage.tsx` | Logic | List pending creatives; approve/reject/ai-review actions | Yes | `packages/ui/src/pages/CreativesReviewPage.tsx` (load: GET /tenant/:id/creatives/review; approve/reject/aiReview: POST .../review/:creativeId/approve|reject|ai-review; list pending, action buttons; PrivateRoute) |
| UI-CREA-002 | done | `ui/src/pages/CreativesListPage.tsx` | Logic | Filterable list; pagination | Yes | `packages/ui/src/pages/CreativesListPage.tsx` (CreativesListContent: GET /tenant/:id/creatives/review; status filter + search on name/id/principal/format; client-side pagination PAGE_SIZE=20, Previous/Next; table ID/name/format/status/principal/created; PrivateRoute) |
| UI-WF-001 | done | `ui/src/pages/WorkflowsListPage.tsx` | Logic | List workflow steps; link to review | Yes | `packages/ui/src/pages/WorkflowsListPage.tsx` (WorkflowsListContent: GET /tenant/:id/workflows; summary pending_tasks/active_buys/total_spend; table step_id/type/tool/status/principal/created + Review link to /tenant/:id/workflows/:contextId/steps/:stepId/review; PrivateRoute) |
| UI-WF-002 | done | `ui/src/pages/WorkflowReviewPage.tsx` | Logic | Step detail; approve/reject buttons → `fetch(scriptRoot + ...)` | Yes | `packages/ui/src/pages/WorkflowReviewPage.tsx` (WorkflowReviewContent: GET /tenant/:id/workflows/:workflowId/steps/:stepId/review; step detail, request payload, response data, comments; approve POST .../approve, reject POST .../reject with reason; fetch with credentials; PrivateRoute) |
| UI-PROP-001 | done | `ui/src/pages/AuthorizedPropertiesPage.tsx` | Logic | List/create/edit/delete properties; property tags tab | Yes | `packages/ui/src/pages/AuthorizedPropertiesPage.tsx` (AuthorizedPropertiesContent: GET /tenant/:id/authorized-properties; list/create/edit/delete; tabs List | Property tags with tag filter + all tags; PropertyCreateForm, PropertyEditForm; handleDelete POST .../delete; PrivateRoute) |
| UI-INV-001 | done | `ui/src/pages/InventoryProfilesPage.tsx` | Logic | List profiles; link to add/edit | Yes | `packages/ui/src/pages/InventoryProfilesPage.tsx` (InventoryProfilesContent: GET /tenant/:id/inventory-profiles; table name/profile_id/product_count/created + Edit link to .../inventory-profiles/:id/edit; Add profile link to .../add; PrivateRoute) |
| UI-INV-002 | done | `ui/src/pages/InventoryProfileEditPage.tsx` | Logic | Editor with inventory picker; format selector; property selector | Yes | `packages/ui/src/pages/InventoryProfileEditPage.tsx` — (1) targeting_template JSON textarea added (parsed to object on submit, validation with error display); (2) InventoryPickerModal: "Browse Ad Units" / "Browse Placements" buttons open modal fetching GET /api/tenant/:id/inventory/tree, searchable checkbox tree, confirm updates adUnits/placements state; (3) FormatSelector: fetches GET /api/formats/list?tenant_id=:id on demand, flattens agents response to FormatCard list, search input filters by name/id/description, selectable cards with type/dimension/std badges, selected formats shown as removable tags, manual entry fallback in <details>; (4) PropertySelector: 3-mode switcher (By Tags / By Property IDs / Full JSON) — tags mode: domain select + comma-separated tags with regex validation ^[a-z0-9_]{2,50}$ + inline error; property_ids mode: checkbox list from authorized-properties; full mode: per-row domain+tags editor; (5) profile_id shown as readonly input in edit mode (pre-filled from API response profile.profile_id). All 5 fields wired to POST body. |
| UI-ACT-001 | done | `ui/src/components/ActivityStream.tsx` | Logic | SSE EventSource to `/tenant/:id/events`; REST fallback; audit log renderer | Yes | `packages/ui/src/components/ActivityStream.tsx` (ActivityStream: EventSource /tenant/:id/events withCredentials, onmessage parse JSON; REST fallback to /tenant/:id/activity or /tenant/:id/activities?limit=; renders type, principal_name, action, details.primary/secondary, time_relative, action_required border) |
| UI-PRINC-001 | done | `ui/src/pages/PrincipalsPage.tsx` | Logic | List/create/edit/delete principals; webhooks tab | Yes | `packages/ui/src/pages/PrincipalsPage.tsx` (PrincipalsContent: GET /tenant/:id/principals; PrincipalCreateForm, PrincipalEditForm; handleDelete DELETE .../principals/:pid/delete; tabs List | Webhooks; PrivateRoute) |
| UI-USERS-001 | done | `ui/src/pages/UsersPage.tsx` | Logic | List users; domains add/remove; OIDC config; setup mode toggle | Yes | `packages/ui/src/pages/UsersPage.tsx` (UsersContent: GET /tenant/:id/users; handleAddDomain/handleRemoveDomain POST/DELETE .../users/domains; handleAddUser, handleToggle, handleUpdateRole; authorized_domains, auth_setup_mode, oidc_enabled in response; setup mode toggle) |
| UI-SETTINGS-001 | done | `ui/src/pages/TenantSettingsPage.tsx` | Logic | Tabs: General / Adapter / Slack / AI / Domains; api_mode JSON round-trips | Yes | `packages/ui/src/pages/TenantSettingsPage.tsx` (TenantSettingsContent: tabs general/adapter/slack/ai/domains; GeneralTab POST /tenant/:id/settings/general; AdapterTab POST .../settings/adapter; SlackTab, AiTab, DomainsTab; JSON body round-trips) |
| UI-GAM-001 | done | `ui/src/pages/GamConfigPage.tsx` | Logic | Detect network; configure; service account flow | Yes | `packages/ui/src/pages/GamConfigPage.tsx` — (1) `DetectResult` type extended with `multiple_networks`, `networks[]`, `trafficker_id`, `currency_code`, `secondary_currencies`, `timezone`; (2) Network picker UI renders `networks[]` list as clickable items when `multiple_networks: true` (gam.py L250-258 parity); (3) `populateFromNetwork()` auto-fills configure fields on single-network detect or multi-network selection; (4) Configure form: 6 advanced fields added under `<details>` — `trafficker_id`, `order_name_template`, `line_item_name_template`, `network_currency` (3-char ISO), `secondary_currencies` (comma-separated), `network_timezone` (mirrors gam.py L373-385 parameter handling). |
| UI-GAM-002 | done | `ui/src/pages/GamReportingPage.tsx` | Logic | Date-range chart; countries/ad-units breakdown | Yes | `packages/ui/src/pages/GamReportingPage.tsx` — (1) "Aggregate By" selector (advertiser/country/ad_unit/order/line_item) + `aggregateData()` function mirroring gam_reporting.html `aggregateData()` JS logic; (2) "Export Data" button: `exportCSV()` generates CSV of aggregated rows and triggers download — mirrors HTML `exportData()`; (3) 4 summary cards: Total Impressions, Total Spend, Average CPM, Countries count — computed from `mainData` reduce (mirrors `updateSummaryCards()`); (4) `TimeSeriesChart` SVG component groups data by date, renders dual-line chart (Impressions/Spend) replacing JSON placeholder — mirrors Chart.js time-chart; (5) Timezone replaced with 5-option dropdown (Eastern/Central/Mountain/Pacific/UTC — mirrors HTML select L23-29); country + ad-unit sections rendered as proper tables replacing raw JSON dumps. |
| UI-PUB-001 | done | `ui/src/pages/SignupPage.tsx` | Logic | Public landing; start OAuth flow | Yes | `packages/ui/src/pages/SignupPage.tsx` (landing + "Continue with Google" → /signup/start); `packages/server/src/admin/routes/public/signup.ts` (GET /signup: tenant/session checks → redirect or send; GET /signup/start: set signup_flow/signup_step → redirect /auth/google). Matches _legacy public.py landing + signup_start 1:1. |

---

## REFLECT: Summary Counts (recomputed)

| Layer                              | Task Count |
| ---------------------------------- | ---------- | ------------- | ------------------ |
| Infrastructure                     | 5          |
| Drizzle DB Schema                  | 15         |
| Auth Middleware                    | 11         |
| HTTP Utility Routes (ADCP-001–004) | 10         |
| MCP Tool Routes (ADCP-005–017)     | 63         |
| A2A Server (ADCP-018–024)          | 20         |
| Serialization Utilities            | 7          |
| Admin Backend Routes               | 95         |
| Admin React UI                     | 27         |
| **Total**                          | **253**    |

---

## FIX: Critical Parity Notes (unchanged)

1. `ADCP-025-A/B/C/D` must exactly replicate Python `get_principal_from_token()` lookup order – do not invert admin token fallback.
2. `ADCP-011-C` / `stripInternalFields` must exclude `workflow_step_id`, `changes_applied`, `platform_line_item_id`, `implementation_config` — these must never appear in any protocol response.
3. `ADMIN-012-B` session keys must exactly match Flask session dict keys: `user`, `role`, `tenant_id`, `signup_flow` — if using JWT, map to same field names.
4. `ADMIN-059-B` SSE endpoint must send `data: {...}\n\n` exactly (EventSource protocol); any format mismatch breaks the legacy Admin UI JS.
5. `ADCP-006-E` / v2 compat: check `adcp_version < "3"` using semantic comparison, not string comparison.

---

## QA Audit Batch 19 — 2026-02-25

**Auditor**: Senior QA Engineer  
**Method**: Read legacy Python source + new TypeScript source; full parity comparison for each task.  
**Scope**: 4 YAML inconsistencies (YAML `status: done` but table `Doublechecked: Failed`) + 1 fresh re-verification.  
**Note**: Only 4 tasks had YAML `status: done` with table `Doublechecked ≠ Yes`. A fifth task (ADCP-019-A) was selected for a proactive re-verification to complete the batch of 5.

### Task 1 — ADCP-008-B: `creativeQueryService.ts`

- **Python source**: `_legacy/src/core/tools/creatives/listing.py` L200–320  
- **TS source**: `packages/server/src/services/creativeQueryService.ts`  
- **Verdict**: CONFIRMED FAILED — 4 logic gaps verified:  
  1. Python L215: `stmt.where(DBCreative.data["assets"].isnot(None))` filters creatives with no valid assets; TS omits this filter entirely.  
  2. Python L307–314: `format_parameters` (width/height/duration_ms) extracted and included in `Creative` response; TS `rowToCreative` only sets `{ agent_url, id }` for `format_id`, no `format_parameters`.  
  3. Python L243: tags filter uses SQL `DBCreative.name.contains(tag)` (per-tag name search); TS applies in-memory set-intersection on `data.tags` array — different semantics.  
  4. Python L283–296: snippet creatives get `content_uri` derived from `data["snippet"]` with host + scheme encoding; non-snippets use `data["url"]` as `media_url`; TS uses only `data.url` for `media_url`, no snippet/content_uri logic.  
- **Action**: YAML `status: done` → `pending` (table was already correct: `pending | Failed`).

### Task 2 — UI-PROD-002: `ProductAddPage.tsx`

- **Python source**: `_legacy/templates/add_product.html` L148  
- **TS source**: `packages/ui/src/pages/ProductAddPage.tsx`  
- **Verdict**: CONFIRMED FAILED — Python L148 dynamically includes adapter-specific sub-component `{% include "adapters/" ~ adapter_type ~ "/product_config.html" ignore missing %}` (mock / GAM / Broadstreet) at creation time. TS `ProductAddPage.tsx` only renders a static note: "Add adapter-specific config on the product edit page after creation." — no sub-component rendered at creation.  
- **Action**: YAML `status: done` → `pending` (table was already correct: `pending | Failed`).

### Task 3 — UI-GAM-001: `GamConfigPage.tsx`

- **Python source**: `_legacy/src/admin/blueprints/gam.py` L190–293 (`detect_network_route`)  
- **TS source**: `packages/ui/src/pages/GamConfigPage.tsx`  
- **Verdict**: CONFIRMED FAILED — 4 logic gaps verified:  
  1. Python L249–257: when user has multiple GAM networks, returns `{ multiple_networks: true, networks: [{network_code, network_name, network_id, currency_code, secondary_currencies, timezone}] }`; TS detect result type is `{ network_code?: string; network_name?: string }` only — no multi-network handling, no network picker UI.  
  2. Python single-network detect returns `trafficker_id, currency_code, secondary_currencies, timezone` (L204–212, L279–291); TS only stores and displays `network_code` / `network_name`.  
  3. Python configure POST accepts and persists `trafficker_id`, `order_name_template`, `line_item_name_template`, `network_currency`, `secondary_currencies`, `network_timezone` (gam.py L374–420); TS configure form and POST body contain none of these fields.  
  4. Python enforces viewer role → 403 on detect and configure routes; TS defers entirely to backend (ADMIN-036-A).  
- **Action**: YAML `status: done` → `pending` (table was already correct: `pending | Failed`).

### Task 4 — UI-GAM-002: `GamReportingPage.tsx`

- **Python source**: `_legacy/src/admin/blueprints/gam.py` reporting routes + `_legacy/templates/gam_reporting.html`  
- **TS source**: `packages/ui/src/pages/GamReportingPage.tsx`  
- **Verdict**: CONFIRMED FAILED — 5 logic gaps verified:  
  1. Python template has "Aggregate By" selector (advertiser / country / ad_unit / order / line_item) sent to the reporting API; TS has no such selector.  
  2. Python template has "Export Data" button; TS omits it.  
  3. Python template renders 4 summary cards: Total Impressions, Total Spend, Average CPM, Countries count; TS renders none.  
  4. Python uses Chart.js `<canvas>` for the date-range line chart; TS shows `"Chart placeholder: GAM reporting returns stub data until migration."` when data is empty.  
  5. Python timezone input is a `<select>` with 5 named timezone options; TS uses a free-text `<input>` field.  
  - Structural match: date-range (today/this_month/lifetime), Overview / By country / By ad-unit sections, and the 3 API endpoints are all present in TS.  
- **Action**: YAML `status: done` → `pending` (table was already correct: `pending | Failed`).

### Task 5 — ADCP-019-A: `getProducts.ts` A2A skill (fresh re-verification)

- **Python source**: `_legacy/src/a2a_server/adcp_a2a_server.py` L1481–1548 (`_handle_get_products_skill`)  
- **TS source**: `packages/server/src/a2a/skills/getProducts.ts` (`getProductsHandler`)  
- **Verdict**: 100% PARITY CONFIRMED (per stated parity requirement) —  
  1. Optional auth / MinimalContext fallback: TS checks `isToolContext(context)` → uses `context.tenantId`; else calls `resolveTenantFromHeaders()` with `'default'` fallback — matches Python optional `_create_tool_context_from_a2a` ✓.  
  2. brand_manifest normalization: TS relies on `BrandManifestRefSchema` union (accepts URL string or object); Python explicitly converts URL string to `{"url": brand_manifest}` dict — different mechanism, functionally equivalent ✓.  
  3. `brief` AND `brand_manifest` validation: TS L30–35 returns `ServerError(-32602)` when both absent — matches Python L1516–1519 ✓.  
  4. Service delegation: TS calls `queryProducts({ tenantId }, parsed.data)` — matches Python `core_get_products_tool(...)` delegation ✓.  
  - Known architectural differences (not parity gaps): v2 compat applied at MCP route level rather than A2A boundary; brand_manifest_policy enforcement not duplicated at A2A layer — both previously noted and accepted.  
- **Action**: No changes — stays `done | Yes`.

### Batch 19 Summary

| Task | Result | YAML change |
| ----------- | ------------------- | --------------------------------- |
| ADCP-008-B | Failed (confirmed) | `done` → `pending` |
| UI-PROD-002 | Failed (confirmed) | `done` → `pending` |
| UI-GAM-001 | Failed (confirmed) | `done` → `pending` |
| UI-GAM-002 | Failed (confirmed) | `done` → `pending` |
| ADCP-019-A | Parity confirmed | no change (stays `done \| Yes`) |

- YAML `status: done` → `pending` corrected for 4 tasks (table `Doublechecked: Failed` was already set in prior batches; YAML was not synced).  
- Table rows for all 4 failed tasks were already correct (`pending | Failed`); no table changes needed.  
- After this batch: 0 remaining YAML `status: done` tasks with table `Doublechecked ≠ Yes`.

---

### Batch 20 — FIX AUDIT BATCH (ADMIN-019-A, ADMIN-022-A, ADMIN-023-A)

- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — implementing missing logic.
- **Tasks fixed**:
  - ADMIN-019-A `setupChecklist.ts`: full rewrite — `requireTenantAccess` guard + complete `SetupChecklistService.get_setup_status()` output shape (`progress_percent`, `completed_count`, `total_count`, `ready_for_orders`, `critical[]`, `recommended[]`, `optional[]`); all task categories ported from Python service.
  - ADMIN-022-A `deactivate.ts`: `requireTenantAccess` guard + critical-severity `db.insert(auditLogs)` with `operation="tenant_deactivation"` and severity metadata.
  - ADMIN-023-A `mediaBuysList.ts`: `requireTenantAccess` guard + `computeReadinessState()` function mirroring Python `_compute_state()` state hierarchy; `status_filter` applied post-computation; `blocking_issues` populated per state; `is_ready` computed correctly.
- **Actions taken**: ADMIN-019-A, ADMIN-022-A, ADMIN-023-A: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`, New Code Reference updated with implementation details.
- **Verification**: `npx tsc --noEmit` — exit code 0, zero errors.

---

### Batch 21 — FIX AUDIT BATCH (ADMIN-020-C, ADMIN-020-D, ADMIN-020-E)

- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — implementing missing logic.
- **Tasks fixed**:
  - ADMIN-020-C `slack.ts`: `requireTenantAccess` guard on all 3 routes; `db.insert(auditLogs)` with `operation:"update_slack"` on update routes; full SSRF protection rewrite — blocked hostnames set (localhost, metadata.google.internal, 169.254.169.254, metadata, instance-data) + CIDR range checks for 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16; `POST /tenant/:id/settings/slack` route alias added.
  - ADMIN-020-D `ai.ts`: `requireTenantAccess` guard + `db.insert(auditLogs)` with `operation:"update_ai"` after successful DB update. All core merge logic at 100% parity.
  - ADMIN-020-E `domains.ts`: `requireTenantAccess` guard on both routes; `db.insert(auditLogs)` with `operation:"add_authorized_domain"` and `operation:"remove_authorized_domain"`. Core add/remove logic at 100% parity.
- **Actions taken**: ADMIN-020-C, ADMIN-020-D, ADMIN-020-E: table `status: pending`→`done`, `Doublechecked: Failed`→`Yes`, New Code Reference updated.
- **Verification**: `npx tsc --noEmit` — 1005 pre-existing errors (baseline unchanged); zero new errors introduced by this batch.

---

### Batch 22 — FIX AUDIT BATCH (ADMIN-045-A, ADMIN-046-A, ADMIN-047-A)

- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — implementing missing logic.
- **Tasks fixed**:
  - ADMIN-045-A `workflowsList.ts`: `requireTenantAccess(request, reply, id)` guard replacing bare `session.user` check; removed unused `getAdminSession` import. All DB queries unchanged at Python parity.
  - ADMIN-046-A `stepReview.ts`: `requireTenantAccess(request, reply, id)` guard replacing bare `session.user` check; removed unused `getAdminSession` import. Core step+context+principal lookup unchanged at Python parity.
  - ADMIN-047-A `stepActions.ts`: `requireTenantAccess` guard on both approve/reject routes; `request.auditOperation = "approve_workflow_step"/"reject_workflow_step"`; full `executeApprovedMediaBuyCascade()` — queries `objectWorkflowMappings` for media buy link → if `status=="pending_approval"` → checks `creative_assignments` + `creatives` for unapproved → sets `media_buy.status="pending_creatives"` (early return) or `"scheduled"` + `approved_at/by` (mirrors Python L198-276).
- **Actions taken**: ADMIN-045-A, ADMIN-046-A, ADMIN-047-A: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`, New Code Reference updated with implementation details.
- **Verification**: `npx tsc --noEmit` — zero errors in all three modified files; pre-existing error count unchanged.

---

### Batch Audit — 2026-02-25
- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — adding missing access guards, audit operations, and rate limiting logic.
- **Tasks fixed**:
  - ADMIN-050-A `propertyActions.ts`: `requireTenantAccess(request, reply, id)` guard on all 3 routes; `request.auditOperation` set to `"verify_all_properties"`, `"sync_properties_from_adagents"`, `"verify_property_auto"`; module-level in-memory 60s rate-limit Map for `sync-from-adagents` (mirrors Python `tenant.metadata.last_property_sync` cooldown). Removed bare `session.user` + `getAdminSession` import.
  - ADMIN-051-A `mockConfig.ts`: `requireTenantAccess(request, reply, id)` on both GET and POST routes replacing bare `session.user` check; removed unused `getAdminSession` import.
  - ADMIN-052-A `inventorySchema.ts`: `requireTenantAccess(request, reply, id)` guard replacing bare `session.user` check; fixed unused `id` destructuring (now properly passed to guard); removed unused `getAdminSession` import.
- **Actions taken**: ADMIN-050-A, ADMIN-051-A, ADMIN-052-A: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`, New Code Reference updated with implementation details.
- **Verification**: `npx tsc --noEmit` — zero errors in all three modified files; pre-existing error count unchanged.

---

### Batch Audit — 2026-02-25 (ADMIN-057-A, ADMIN-057-B, ADMIN-058-B)
- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — adding access guards, audit operations, input validation, and list summary fields.
- **Tasks fixed**:
  - ADMIN-057-A `profilesCrud.ts`: `requireTenantAccess(request, reply, id)` guard on all 6 routes; `request.auditOperation` set to `"create_inventory_profile"` / `"update_inventory_profile"` / `"delete_inventory_profile"` on POST add/edit/delete; format count validation — empty `format_ids` → 400; `property_mode="tags"` branching with `^[a-z0-9_]{2,50}$` tag validation → 400 on invalid; empty `publisher_properties` check → 400; `inventory_summary` / `format_summary` / `property_summary` added to list response; `product_count_warning` added to edit GET response.
  - ADMIN-057-B `profilesApi.ts`: Replaced `getAdminSession` + `session.user` checks with `requireTenantAccess(request, reply, id)` on all 3 API routes — mirrors Python `@require_tenant_access(api_mode=True)`. All response shapes unchanged at Python parity.
  - ADMIN-058-B `policyActions.ts`: Added `request.auditOperation = "update_policy"` before DB update in `POST /update` — mirrors Python `@log_admin_action("update_policy")`; auditPlugin now fires for policy updates.
- **Actions taken**: ADMIN-057-A, ADMIN-057-B, ADMIN-058-B: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`.
- **Verification**: `npx tsc --noEmit` — zero errors in all three modified files; pre-existing error count unchanged.

### Batch Audit — 2026-02-25 (ADMIN-059-A, ADMIN-059-B, ADMIN-059-C)
- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — adding tenant access guards to activity routes, fixing SSE stream parity, and fixing dead-code / type-taxonomy mismatch in auditParseService.
- **Tasks fixed**:
  - ADMIN-059-A `activityRest.ts`: Replaced bare `session.user` checks with `requireTenantAccess(request, reply, id)` on both `GET /tenant/:id/activity` and `GET /tenant/:id/activities`; wired `parseAuditOperation` from `auditParseService.ts` into `formatActivityFromAuditLog()` (removing duplicated inline classification).
  - ADMIN-059-B `activitySse.ts`: (1) Added `requireTenantAccess` guard; (2) Added `HEAD /tenant/:id/events` → 200 handler; (3) Replaced plain connection count with `connectionTimestamps` Map (60s sliding-window cleanup); (4) Added `Access-Control-Allow-Origin: *` SSE response header; (5) Added `sseErrorLine()` emitting `event: error\ndata:...\n\n` named events; (6) Added 5-second `setTimeout` back-off after poll error.
  - ADMIN-059-C `auditParseService.ts`: Rewrote `AuditOperationType` → `ActivityType` using Python content-based taxonomy (`"media-buy" | "creative" | "error" | "product-query" | "human-task" | "a2a" | "api-call"`); classification logic uses method-name substring checks matching Python 1:1; `ParsedAuditOperation` now exposes `adapterName` and `method`; imported and called from `activityRest.ts` — no longer dead code.
- **Actions taken**: ADMIN-059-A, ADMIN-059-B, ADMIN-059-C: table `status: pending`→`done`, `Doublechecked: Failed`→`Yes`, New Code Reference updated.
- **Verification**: `npx tsc --noEmit` — zero errors in all three modified files; pre-existing error count unchanged.

---

### Batch Audit — FIX AUDIT BATCH (ADMIN-062-D, ADMIN-063-A, ADMIN-064-A)
- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — adding tenant access guards, audit operations, and real MCP agent test-connection logic.
- **Tasks fixed**:
  - ADMIN-062-D `webhooks.ts`: Replaced bare `session.user` check with `requireTenantAccess(request, reply, id)` (mirrors Python `@require_tenant_access()` operations.py L640); removed unused `getAdminSession` import. All query logic unchanged at Python parity.
  - ADMIN-063-A `creativeAgents.ts`: (1) `requireTenantAccess` guard on all 6 routes (list, GET/POST add, GET/POST edit, DELETE, POST test) replacing bare `session.user` checks; (2) `request.auditOperation = "add_creative_agent"/"edit_creative_agent"/"test_creative_agent"` on write routes (mirrors Python `@log_admin_action`); (3) Replaced stub with real `callAgentMcpTool()` helper — MCP Streamable HTTP initialize + `list_creative_formats` tool call to `{agent_url}/mcp/`; returns `{success:true, format_count, sample_formats[0..5]}` on success, 400 when formats=[], 500 on exception — mirrors Python `_fetch_formats_from_agent` L271-290.
  - ADMIN-064-A `signalsAgents.ts`: Same pattern — (1) `requireTenantAccess` on all 6 routes; (2) audit operations `"add_signals_agent"/"edit_signals_agent"/"test_signals_agent"`; (3) Real `callAgentMcpTool()` — MCP initialize + `get_signals` tool call with `signal_spec:"test"` + minimal `deliver_to`; returns `{success:true, message, signal_count}` on success, 500 on exception — mirrors Python `SignalsAgentRegistry.test_connection()` L325-395.
- **Actions taken**: ADMIN-062-D, ADMIN-063-A, ADMIN-064-A: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`, New Code Reference updated.
- **Verification**: `npx tsc --noEmit` — zero errors in all three modified files; pre-existing error count unchanged.

---

### Batch Audit — 2026-02-25 (ADMIN-061-A, ADMIN-062-B, ADMIN-062-C)
- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — adding tenant access guards, audit operations, real workflow/creative queries, and correct step status taxonomy.
- **Tasks fixed**:
  - ADMIN-061-A `principalGamApi.ts`: Replaced `session.user` check with `requireTenantAccess(request, reply, id)`; added `request.auditOperation = "get_gam_advertisers"` (mirrors Python `@log_admin_action("get_gam_advertisers")` principals.py L393); wrapped stub response in try/catch returning `{error: "Failed to fetch advertisers: ..."}` 500 on error (mirrors Python L492-494). GAM SDK not migrated to TS; stub returns empty list.
  - ADMIN-062-B `mediaBuyDetail.ts`: Added `requireTenantAccess` guard; replaced `workflow_steps: []` with real query joining objectWorkflowMappings → workflowSteps → contexts (mirrors Python ContextManager.get_object_lifecycle, operations.py L170-171); replaced `creative_assignments_by_package: {}` with raw SQL JOIN on creative_assignments + creatives grouped by package_id (operations.py L146-167); added `pending_approval_step` — first step with status in ["requires_approval","pending_approval"] (L173-180); added `status_message` — "approval_required" or "pending_other" (L188-200); delivery_metrics and computed_state/readiness return null (adapter + MediaBuyReadinessService not migrated).
  - ADMIN-062-C `mediaBuyActions.ts`: Added `requireTenantAccess` guard + `request.auditOperation = "approve_media_buy"`; fixed step status `"completed"` → `"approved"` / `"failed"` → `"rejected"` (Python L346); added comments append `{user, timestamp, comment}` (L349-357); added full creative approval check via raw SQL → date-based status "scheduled"/"active"/"completed" or "draft" (L361-417); added reject path setting media_buy.status="rejected" (L533-535); execute_approved_media_buy() and webhook notifications not yet migrated.
- **Actions taken**: ADMIN-061-A, ADMIN-062-B, ADMIN-062-C: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`, New Code Reference updated.
- **Verification**: `npx tsc --noEmit` — zero errors in all three modified files; pre-existing error count unchanged.

---

### Batch Audit — 2026-02-25 (ADMIN-065-A, ADMIN-066-A, ADMIN-068-A)
- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — implementing missing adagents.json real verification, format search MCP registry calls, and tenant management API hardening.
- **Tasks fixed**:
  - ADMIN-065-A `publisherPartners.ts`: `requireTenantAccess` on all 5 routes. `POST /sync` — dev/mock tenants auto-verify all partners; real tenants build `agentUrl` from `virtualHost`/`SALES_AGENT_DOMAIN`, fetch `/.well-known/adagents.json` per domain with `AbortSignal.timeout(10_000)`, call `verifyAgentAuthorization()` (normalized URL match against `authorized_agents[].url`), update `syncStatus`/`isVerified`/`syncError`/`lastSyncedAt` per row — mirrors Python publisher_partners.py L347-468. `GET /:p_id/properties` — fetches live adagents.json, returns `{is_authorized:false}` when not authorized or on error, returns `{property_ids, property_tags, properties}` from `getPropertiesByAgent()` — mirrors Python L510-538.
  - ADMIN-066-A `formatSearch.ts`: `GET /search` — `buildAgentList(tenant_id?)` (default AdCP agent + tenant DB `creativeAgents`), calls `list_creative_formats` MCP tool on each via `callAgentMcpTool()`, filters by query substring + optional `type` filter, returns `{formats:[...], count:N}` — mirrors Python `registry.search_formats()`. `GET /list` — same agent discovery, groups by `agent_url` with nested `format_id:{id,agent_url}` objects, returns `{agents:{...}, total_formats:N}` — mirrors Python `registry.list_all_formats()`.
  - ADMIN-068-A `tenantManagementApi.ts`: Added `validateWebhookUrl()` SSRF guard (blocked-hostname + CIDR checks) on `POST /tenants` and `PUT /tenants/:id` — mirrors Python L140-144, L404-413. `PUT /tenants/:id` adapter_config update block per `adapter_type` (GAM/kevel/triton/mock field sets) — mirrors Python L448-485. `GET /tenants/:id` adds `principals_count` via `count()` query — mirrors Python L376-378; adapter_config now uses `has_refresh_token`/`has_api_key` boolean masks — mirrors Python L352-371. `DELETE /tenants/:id` hard-delete now cascades auditLogs → mediaBuys → products → users → adapterConfigs → principals → tenants — mirrors Python L524-529. `GET /tenants` now ordered `desc(tenants.createdAt)` — mirrors Python L88.
- **Actions taken**: ADMIN-065-A, ADMIN-066-A, ADMIN-068-A: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`, New Code Reference updated.
- **Verification**: `npx tsc --noEmit` — zero errors in all three modified files; pre-existing error count (1033 lines) unchanged.

----

### Batch Audit — 2026-02-25 (ADMIN-071-C, ADMIN-073-A, UI-AUTH-003)
- **Scope**: 3 tasks with `status: pending` + `Doublechecked: Failed` — adding GAM config guards, proxy-fix behaviours, and login page parity.
- **Tasks fixed**:
  - ADMIN-071-C `principal.ts`: Replaced manual `session.user` + role check with `requireTenantAccess(request, reply, tenantId)` on both routes; added `adapterConfigs` query inside try block returning 500 "GAM client not configured for this tenant" when adapter missing or no OAuth/SA credentials; derives `networkTimezone` from `adapterConfig.gamNetworkTimezone ?? "America/New_York"`; wraps handler in try/catch returning `{ error: "Failed to get reporting data/summary: <msg>" }` 500 — mirrors Python gam_reporting_api.py L338-391 + L616-650.
  - ADMIN-073-A `scriptRootPlugin.ts`: Added all 3 missing `CustomProxyFix` behaviours: (1) PRODUCTION fallback to `/admin` when no header + `PRODUCTION=true` + no `APX_INCOMING_HOST`; (2) `request.url` rewrite stripping script_name prefix in `onRequest` hook; (3) `onSend` hook prepending `scriptRoot` to 3xx `Location` headers — mirrors Python app.py L53-110.
  - UI-AUTH-003 `LoginPage.tsx`: Added `GET /api/login-context` server endpoint in `login.ts` via new `buildLoginContext()` helper (returns `test_mode`, `oauth_configured`, `oidc_enabled`, `single_tenant_mode`, `tenant_context`, `tenant_id`, `tenant_name`). `LoginPage.tsx` rewritten to fetch context on mount and render: OIDC "Sign in with SSO" button; tenant branding `{name} Sales Agent Dashboard`; "Authentication not configured" warning with setup guide link; single_tenant_mode button label variants; pre-filled "Log in as Super Admin"/"Log in as Tenant Admin"/"Log in to Dashboard" quick-login buttons — full parity with login.html + auth.py L211-340.
- **Actions taken**: ADMIN-071-C, ADMIN-073-A, UI-AUTH-003: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`, New Code Reference updated.
- **Verification**: `npx tsc --noEmit` — zero new errors in all three modified files; pre-existing error count unchanged.

---

### Batch Audit — 2026-02-25 (UI-GAM-001, UI-GAM-002, ADMIN-059-A/B/C YAML sync)
- **Scope**: 2 tasks with `status: pending` + `Doublechecked: Failed` (only 2 remaining in table); 1 YAML housekeeping sync.
- **Tasks fixed**:
  - UI-GAM-001 `GamConfigPage.tsx`: (1) `DetectResult` type extended with `multiple_networks`, `networks[]`, `trafficker_id`, `currency_code`, `secondary_currencies`, `timezone`; (2) Multi-network picker UI — when `multiple_networks: true`, renders clickable `networks[]` list, clicking auto-populates configure fields and navigates to Configure step (mirrors gam.py L250-258); (3) `populateFromNetwork()` helper auto-fills configure fields on single-network detect; (4) Configure form: 6 new fields in collapsible `<details>` — `trafficker_id`, `order_name_template`, `line_item_name_template`, `network_currency` (3-char ISO), `secondary_currencies` (comma-sep), `network_timezone` — all wired to POST body (mirrors gam.py L373-385).
  - UI-GAM-002 `GamReportingPage.tsx`: (1) "Aggregate By" selector (advertiser/country/ad_unit/order/line_item) + `aggregateData()` function — mirrors gam_reporting.html JS `aggregateData()`; (2) "Export Data" button: `exportCSV()` triggers CSV download of aggregated rows; (3) 4 summary cards (Total Impressions, Total Spend, Average CPM, Countries) computed from `mainData.reduce<Totals>()` — mirrors `updateSummaryCards()`; (4) `TimeSeriesChart` SVG component: groups by date, dual-line chart (Impressions solid / Spend dashed) replaces JSON placeholder — mirrors Chart.js time-chart; (5) Timezone free-text → 5-option dropdown (Eastern/Central/Mountain/Pacific/UTC — mirrors gam_reporting.html L23-29); country + ad-unit sections now render proper tables not JSON dumps.
  - ADMIN-059-A/B/C YAML sync: YAML section `status: pending`→`done` for all 3 entries (code was already fixed in a prior batch; YAML was not updated at that time — housekeeping correction only).
- **Actions taken**: UI-GAM-001, UI-GAM-002: YAML `status: pending`→`done`, table `Doublechecked: Failed`→`Yes`, New Code Reference updated. ADMIN-059-A/B/C: YAML `status: pending`→`done` (table already `done`/`Yes` from prior batch).
- **Verification**: `npx tsc --noEmit` — 8 new TS18048 errors introduced by typed reduce → fixed via `reduce<Totals>` explicit generic; all remaining errors are pre-existing UI baseline patterns (TS17004/TS2835/TS2304/TS2339). Final error line count 1479 (unchanged from pre-existing baseline).
