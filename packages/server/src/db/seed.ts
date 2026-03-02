import { closeDb, db } from "./client.js";
import { adapterConfigs } from "./schema/adapterConfigs.js";
import { principals } from "./schema/principals.js";
import { products } from "./schema/products.js";
import { tenants } from "./schema/tenants.js";
import { users } from "./schema/users.js";

async function seed(): Promise<void> {
  const tenantId = "demo-tenant";
  const principalId = "demo-principal";
  const userId = "demo-admin";
  const productId = "demo-display-banner";

  await db
    .insert(tenants)
    .values({
      tenantId,
      name: "Demo Publisher",
      subdomain: "demo",
      isActive: true,
      billingPlan: "standard",
      adServer: "mock",
      authSetupMode: false,
      authorizedDomains: ["example.com"],
      authorizedEmails: ["admin@example.com"],
    })
    .onConflictDoNothing();

  await db
    .insert(adapterConfigs)
    .values({
      tenantId,
      adapterType: "mock",
      mockDryRun: true,
      mockManualApprovalRequired: false,
      configJson: {},
      customTargetingKeys: {},
    })
    .onConflictDoNothing();

  await db
    .insert(principals)
    .values({
      tenantId,
      principalId,
      name: "Demo Principal",
      platformMappings: { mock: "demo-advertiser-1" },
      accessToken: "demo-token-please-change",
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values({
      userId,
      tenantId,
      email: "admin@example.com",
      name: "Demo Admin",
      role: "admin",
      isActive: true,
    })
    .onConflictDoNothing();

  await db
    .insert(products)
    .values({
      tenantId,
      productId,
      name: "Demo Display Banner",
      description: "Seeded demo product",
      formatIds: [{ agent_url: "https://example.com/agent/mock", id: "display-banner" }],
      targetingTemplate: {},
      deliveryType: "guaranteed",
      propertyIds: ["home"],
      countries: ["US"],
      channels: ["display"],
      implementationConfig: { adapter: "mock" },
      isCustom: true,
      isDynamic: false,
      isDynamicVariant: false,
      maxSignals: 5,
      allowedPrincipalIds: [principalId],
    })
    .onConflictDoNothing();

  console.log("Seed complete: demo tenant, principal, user, adapter config, and product ensured.");
}

seed()
  .catch((error: unknown) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
