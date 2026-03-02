import {
  createSchemaRegistry,
  listSchemaNames,
} from "./schemaRegistryService.js";

function buildSchemasBaseUrl(protocol: string, hostname: string): string {
  return protocol && hostname ? `${protocol}://${hostname}/schemas` : "";
}

export function buildSchemasRootPayload(protocol: string, hostname: string): {
  protocols: {
    adcp: {
      description: string;
      versions: string[];
      current_version: string;
      url: string;
    };
  };
  description: string;
  schema_version: string;
} {
  const base = buildSchemasBaseUrl(protocol, hostname);

  return {
    protocols: {
      adcp: {
        description: "Advertising Context Protocol",
        versions: ["v2.4"],
        current_version: "v2.4",
        url: base ? `${base}/adcp/` : "",
      },
    },
    description: "JSON Schema service for API validation",
    schema_version: "draft-2020-12",
  };
}

export function buildSchemasVersionsPayload(protocol: string, hostname: string): {
  available_versions: string[];
  current_version: string;
  description: string;
  latest_url: string;
} {
  const base = buildSchemasBaseUrl(protocol, hostname);

  return {
    available_versions: ["v2.4"],
    current_version: "v2.4",
    description: "Available AdCP schema versions",
    latest_url: base ? `${base}/adcp/v2.4/` : "",
  };
}

export function getSchemasHealthPayload(): {
  status: "healthy";
  schemas_available: number;
  service: string;
  version: string;
} {
  const registry = createSchemaRegistry("");
  const count = listSchemaNames(registry).length;

  return {
    status: "healthy",
    schemas_available: count,
    service: "AdCP Schema Validation Service",
    version: "1.0.0",
  };
}
