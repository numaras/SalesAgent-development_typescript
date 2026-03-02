# AdCP Sales Agent — TypeScript

A reference implementation of the [Ad Context Protocol (AdCP)](https://adcontextprotocol.org) sales agent. Enables AI agents to discover and buy advertising inventory through standardised MCP (Model Context Protocol) and A2A (Agent-to-Agent) APIs. Integrates with Google Ad Manager and provides a full-featured React admin UI for multi-tenant campaign management.

> This is the TypeScript rewrite of the original Python implementation (preserved in `_legacy/`).

---

## What is this?

The AdCP Sales Agent is a server that:

- **Exposes advertising inventory to AI agents** via MCP and A2A protocols
- **Integrates with ad servers** — Google Ad Manager (GAM) out of the box, extensible via adapters
- **Provides an admin dashboard** for managing tenants, products, creatives, campaigns, properties, and inventory
- **Handles the full campaign lifecycle** — from product discovery to media buy creation, creative upload, workflow approvals, and delivery reporting
- **Streams background process logs** to the dashboard for live operational visibility

---

## Architecture

```
     ┌──────────────────────┐   ┌──────────────────┐   ┌──────────────────┐
     │  Vite / React UI      │   │  Fastify server   │   │  BullMQ worker   │
     │  :5173                │   │  :8080            │   │  (no port)       │
     │  ui-dev (PM2)         │   │  adcp-server      │   │  adcp-worker     │
     │                       │   │  (PM2)            │   │  (PM2)           │
     │  proxy: /api → :8080  │   └────────┬──────────┘   └────────┬─────────┘
     │         /mcp → :8080  │            │                        │
     │         /tenant→:8080 │            │                        │
     │         ...           │   ┌────────┴──────────┐   ┌────────┴──────────┐
     └──────────────────────┘   │  PostgreSQL :5432   │   │  Redis :6379       │
                                 │  (Docker)          │   │  (Docker)          │
                                 └─────────────────────┘   └───────────────────┘
```

**Infrastructure** (Docker): PostgreSQL and Redis only.  
**Application processes** (PM2, run on host): Fastify server, BullMQ worker, Vite UI.  
Vite's built-in dev proxy forwards all API paths (`/tenant`, `/api`, `/mcp`, `/auth`, …) to Fastify — no nginx needed.

---

## Repository Layout

```
salesagent/
├── packages/
│   ├── server/                  Fastify backend (TypeScript)
│   │   └── src/
│   │       ├── admin/           Admin API routes, services, plugins
│   │       │   ├── routes/      ~90 route modules (auth, tenants, GAM, …)
│   │       │   ├── plugins/     auditPlugin, socketio, scriptRoot
│   │       │   └── services/    authGuard, sessionService, auditParseService
│   │       ├── db/              Drizzle ORM client + 23-table schema
│   │       ├── gam/             Google Ad Manager client factory
│   │       ├── jobs/            BullMQ queues + GAM sync worker
│   │       ├── routes/          MCP tools, A2A endpoints, health, debug
│   │       ├── utils/           processLogger (Redis-backed cross-process logger)
│   │       ├── app.ts           Fastify app factory
│   │       ├── server.ts        HTTP server entry point
│   │       └── worker.ts        BullMQ worker entry point
│   └── ui/                      React admin UI (TypeScript)
│       └── src/
│           ├── components/      Shared components (BaseLayout, PrivateRoute, …)
│           └── pages/           19 page components (dashboard, products, GAM, …)
├── config/nginx/                Nginx development config
├── docker-compose.yml           Infrastructure services (Postgres, Redis)
├── ecosystem.config.cjs         PM2 process definitions
└── _legacy/                     Original Python implementation (reference)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | Fastify 5 (TypeScript, ES modules) |
| Database | PostgreSQL 17 via Drizzle ORM |
| Job queue | BullMQ 5 (Redis-backed) |
| Queue dashboard | Bull Board |
| Session auth | `@fastify/session` + `@fastify/cookie` |
| OAuth | Google OAuth, generic OIDC (Okta, Auth0, Azure AD, Keycloak) |
| WebSockets | `@fastify/websocket` |
| GAM integration | `@guardian/google-admanager-api` |
| Validation | Zod 4 via `fastify-type-provider-zod` |
| Frontend | React 18 + Vite 6 |
| UI library | Material UI 7 |
| Routing | React Router 7 |
| Data fetching | TanStack Query 5 |
| Styling | Tailwind CSS 3 + Emotion |
| Process manager | PM2 |
| Cache / queues | Redis 7 (Docker) |
| Runtime | Node.js via `tsx` (dev), compiled JS (prod) |

---

## Quick Start

### Prerequisites

- Node.js 20+
- Docker + Docker Compose
- PM2 (`npm install -g pm2`)

### 1. Install dependencies

```bash
git clone <repo-url>
cd salesagent
npm install
```

### 2. Start infrastructure (Docker

```bash
# Starts PostgreSQL and Redis
docker compose up -d
```

Run database migrations from TypeScript tooling:

```bash
npm run db:migrate
```

Add demo seed data:

```bash
npm run db:seed
```

Verify everything is healthy:

```bash
docker compose ps
```

### 3. Configure environment

The default `ecosystem.config.cjs` contains working defaults for local development (test auth mode, local Postgres/Redis). No `.env` file is required to get started.

For production or OAuth, see [Environment Variables](#environment-variables).

### 4. Start application processes (PM2)

```bash
# Start server + worker + UI dev server
pm2 start ecosystem.config.cjs

# Or start individually
pm2 start ecosystem.config.cjs --only adcp-server
pm2 start ecosystem.config.cjs --only adcp-worker
pm2 start ecosystem.config.cjs --only ui-dev
```

### 5. Access the application

| URL | Service |
|---|---|
| http://localhost:5173 | Admin UI (Vite dev server) |
| http://localhost:8080/mcp | MCP server |
| http://localhost:8080/a2a | A2A server |
| http://localhost:8080 | Fastify API direct |

**Test login:** In test mode (`ADCP_AUTH_TEST_MODE=true`), click "Log in to Dashboard" — no credentials required.

---

## PM2 Processes

| Name | Port | Description |
|---|---|---|
| `adcp-server` | 8080 | Fastify HTTP server — MCP tools, A2A endpoints, admin API |
| `adcp-worker` | — | BullMQ background job worker — GAM sync, background tasks |
| `ui-dev` | 5173 | Vite dev server for the React admin UI (hot reload) |
| `ui-preview` | 5173 | Vite preview of the production build (`npm run build:ui` first) |

Common PM2 commands:

```bash
pm2 list                          # Status of all processes
pm2 logs                          # Tail all logs
pm2 logs adcp-worker              # Tail worker logs only
pm2 restart adcp-server           # Restart a process
pm2 stop all                      # Stop everything
pm2 delete all                    # Remove from PM2 registry
```

---

## Environment Variables

All variables are set in `ecosystem.config.cjs` (per-process `env` blocks) or in an `.env` file at the project root.

### Required

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://adcp_user:secure_password_change_me@localhost:5432/adcp?sslmode=disable` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |

### Authentication (choose one)

| Variable | Description |
|---|---|
| `ADCP_AUTH_TEST_MODE=true` | Bypass OAuth — local dev only, no credentials needed |
| `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 |
| `OAUTH_DISCOVERY_URL` + `OAUTH_CLIENT_ID` + `OAUTH_CLIENT_SECRET` | Generic OIDC (Okta, Auth0, Azure AD, Keycloak) |

### GAM Integration

| Variable | Description |
|---|---|
| `GAM_OAUTH_CLIENT_ID` | OAuth 2.0 client ID for GAM |
| `GAM_OAUTH_CLIENT_SECRET` | OAuth 2.0 client secret for GAM |

### Optional

| Variable | Description | Default |
|---|---|---|
| `PORT` | Fastify server port | `8080` |
| `HOST` | Fastify bind host | `0.0.0.0` |
| `LOG_LEVEL` | Pino log level (`debug`, `info`, `warn`, `error`) | `info` |
| `NODE_ENV` | Node environment | `development` |
| `SESSION_SECRET` | Cookie session encryption key | auto-generated |
| `SUPER_ADMIN_EMAILS` | Comma-separated super admin email addresses | — |
| `SUPER_ADMIN_DOMAINS` | Comma-separated super admin email domains | — |
| `CONDUCTOR_PORT` | Nginx proxy listen port | `8000` |
| `DB_POOL_SIZE` | PostgreSQL connection pool size | `5` |

---

## Database

PostgreSQL 17 with Drizzle ORM. Schema lives in `packages/server/src/db/schema/`.

**Tables:**

| Category | Tables |
|---|---|
| Core | `tenants`, `principals`, `users`, `products`, `media_buys`, `creatives` |
| Workflow | `workflow_steps`, `contexts` |
| GAM | `gam_inventory`, `sync_jobs`, `adapter_configs`, `gam_orders`, `gam_line_items` |
| Inventory | `inventory_profiles`, `product_inventory_mappings`, `authorized_properties`, `property_tags` |
| Config | `currency_limits`, `publisher_partners`, `push_notification_configs`, `tenant_management_config` |
| Audit | `audit_logs` |
| Agents | `agents` |

**Migrations** are managed by Drizzle (TypeScript):

```bash
# Generate migration SQL from schema changes
npm run db:generate

# Apply pending migrations
npm run db:migrate

# Validate migration state
npm run db:check

# Seed demo data (idempotent)
npm run db:seed
```

Legacy Alembic migrations remain in `_legacy/` as archive-only history and are no longer part of the default runtime path.

---

## MCP Tools

The MCP server exposes the following tools to AI agent clients at `/mcp`:

| Tool | Description |
|---|---|
| `get_products` | List available ad products matching a brief |
| `get_adcp_capabilities` | Describe server capabilities and supported features |
| `create_media_buy` | Create a new media buy / campaign |
| `update_media_buy` | Update an existing media buy |
| `get_media_buy_delivery` | Retrieve delivery and performance data |
| `list_creatives` | List creatives associated with a media buy |
| `list_creative_formats` | List supported creative formats |
| `sync_creatives` | Sync creative status from the ad server |
| `list_authorized_properties` | List publisher properties available for targeting |
| `update_performance_index` | Update performance index for a media buy |
| `list_tasks` | List pending human-in-the-loop tasks |
| `get_task` | Get details of a specific task |
| `complete_task` | Complete/resolve a task |

**Testing MCP from the CLI:**

```bash
# Requires `uvx` (Python tool runner)
uvx adcp http://localhost:8080/mcp/ --auth test-token list_tools
uvx adcp http://localhost:8080/mcp/ --auth test-token get_products '{"brief":"video"}'
```

**Testing MCP from Python:**

```python
from fastmcp.client import Client
from fastmcp.client.transports import StreamableHttpTransport

transport = StreamableHttpTransport(
    url="http://localhost:8080/mcp/",
    headers={"x-adcp-auth": "your-token"},
)
async with Client(transport=transport) as client:
    products = await client.tools.get_products(brief="video ads")
    result = await client.tools.create_media_buy(product_ids=["prod_1"], ...)
```

> Obtain a real API token from Admin UI → Principals → API Token.

---

## A2A Protocol

Agent-to-Agent endpoints at `/a2a`:

| Endpoint | Description |
|---|---|
| `GET /a2a/.well-known/agent.json` | Agent card — A2A discovery |
| `POST /a2a` | JSON-RPC handler for A2A calls |

---

## Admin UI

React single-page application served at `/` (or directly at `:5173` in dev).

**Pages:**

| Page | Route | Description |
|---|---|---|
| Dashboard | `/tenant/:id` | Operational overview — metrics, revenue chart, recent media buys, background logs |
| Products | `/tenant/:id/products` | Manage ad products |
| Creatives | `/tenant/:id/creatives` | Review and manage creatives |
| Workflows | `/tenant/:id/workflows` | Approval and review workflows |
| Reports | `/tenant/:id/gam/reporting` | GAM delivery reporting |
| Properties | `/tenant/:id/properties` | Authorized publisher properties |
| Inventory Profiles | `/tenant/:id/inventory-profiles` | Targeting inventory profiles |
| Principals | `/tenant/:id/principals` | Advertiser / buyer principals |
| Users | `/tenant/:id/users` | User management |
| GAM Config | `/tenant/:id/gam/config` | Google Ad Manager configuration |
| Settings | `/tenant/:id/settings` | Tenant settings (AI, adapters, domains, Slack, webhooks) |

---

## Google Ad Manager Integration

GAM is connected per-tenant via `adapter_configs`. Two auth methods are supported:

**OAuth Refresh Token** (recommended for publishers)
1. Set `GAM_OAUTH_CLIENT_ID` and `GAM_OAUTH_CLIENT_SECRET` in the server environment
2. Navigate to Admin UI → GAM Config → Connect GAM Account
3. Complete the OAuth flow — the refresh token is stored per-tenant

**Service Account** (for server-to-server)
1. Create a service account in GCP with GAM API access
2. Upload the JSON key via Admin UI → GAM Config → Service Account

**GAM Sync Jobs** (background, via BullMQ):

| Sync Type | Description |
|---|---|
| `full` | Full ad unit + placement inventory sync |
| `incremental` | Incremental update of active inventory |
| `orders` | Sync orders and line items |

Trigger a sync from Admin UI → GAM Config → Sync Inventory, or via the API:

```bash
curl -X POST http://localhost:8000/tenant/<id>/gam/sync \
  -H "Content-Type: application/json" \
  -d '{"sync_type": "incremental"}'
```

---

## Background Process Logging

All background processes write structured logs to a Redis ring buffer (`process_logs`, 2000 entry cap) via `packages/server/src/utils/processLogger.ts`.

**Log sources:**

| Process | Logger name | Events logged |
|---|---|---|
| `adcp-worker` | `adcp-worker` | Startup, shutdown, job lifecycle |
| `gam-sync-worker` | `gam-sync-worker` | Job start/complete/fail, per-page progress |
| `sync-jobs-db` | `sync-jobs-db` | Historical job records from the DB (always available) |

**API endpoints:**

```
GET /tenant/:id/process-logs               Last 200 entries (JSON snapshot)
GET /tenant/:id/process-logs/stream        Live SSE stream (text/event-stream)
```

Both endpoints merge Redis live logs with the `sync_jobs` database table so historical data is always visible even if the worker was recently restarted.

The **Background Process Logs tile** on the tenant dashboard connects to the SSE stream and provides:
- Level filter chips: ALL / DEBUG / INFO / WARN / ERROR
- Color-coded level badges (cyan = info, amber = warn, red = error, gray = debug)
- Process name badge per entry
- Expandable metadata JSON per line
- Auto-scroll toggle
- Clear display button
- Live connection status indicator

---

## Auth & Multi-Tenancy

**Session-based auth** with cookie storage (24-hour expiry).

**Auth modes:**

| Mode | When to use |
|---|---|
| Test mode (`ADCP_AUTH_TEST_MODE=true`) | Local development — no OAuth credentials needed |
| Google OAuth | Production with Google Workspace |
| Generic OIDC | Okta, Auth0, Azure AD, Keycloak |

**Super admins** are defined by email address or domain via `SUPER_ADMIN_EMAILS` / `SUPER_ADMIN_DOMAINS`. Super admins can access all tenants and manage global settings.

**Multi-tenancy:** Every resource (products, media buys, creatives, GAM config, users) is isolated per `tenant_id`. The UI routes all pages under `/tenant/:id/`.

### Tenant Management API Key (`X-Tenant-Management-API-Key`)

Tenant management endpoints are exposed under `/api/v1/tenant-management/*` and require the header:

- `X-Tenant-Management-API-Key: <api-key>`

Bootstrap flow (one-time):

1. Set server env var `TENANT_MANAGEMENT_BOOTSTRAP_KEY`.
2. Initialize the management API key via `POST /api/v1/tenant-management/init-api-key` with header `X-Tenant-Management-Bootstrap-Key`.
3. Save returned `api_key` securely — it is not retrievable later.

Example bootstrap request:

```bash
curl -X POST http://localhost:8080/api/v1/tenant-management/init-api-key \
  -H "X-Tenant-Management-Bootstrap-Key: <bootstrap-key>"
```

Example authenticated request:

```bash
curl http://localhost:8080/api/v1/tenant-management/health \
  -H "X-Tenant-Management-API-Key: <api-key>"
```

---

## Development

### Build

```bash
# Type-check and compile server
npm run build -w packages/server

# Build UI for production
npm run build -w packages/ui
# or from root:
npm run build:ui
```

### Type checking only

```bash
npm run typecheck -w packages/server
```

### Logs

```bash
pm2 logs                  # All processes
pm2 logs adcp-server      # Server only
pm2 logs adcp-worker      # Worker only
```

Redis log buffer (last 10 entries):

```bash
redis-cli lrange process_logs -10 -1
```

### Useful endpoints

| Endpoint | Description |
|---|---|
| `GET /health` | Health check |
| `GET /health/config` | Health + config summary |
| `GET /debug` | Debug info (dev only) |
| `GET /bull-board` | BullMQ queue dashboard |

---

## Project Structure — Server (`packages/server/src`)

```
admin/
  plugins/
    auditPlugin.ts          Fastify hook — auto-logs all operations to audit_logs
    socketio.ts             WebSocket plugin with tenant-room pub/sub
    scriptRoot.ts           Injects script root for reverse proxy support
  routes/
    activity/               Activity feed: REST snapshot + SSE live stream
    adapters/               Adapter config (GAM, Broadstreet, mock)
    agents/                 Creative agents + signals agents
    api/                    GAM advertisers, products list, revenue chart
    auth/                   Login, logout, Google OAuth, GAM OAuth, OIDC, tenant login
    creatives/              Creative analysis, review, upload
    gam/                    GAM detect/configure, line items, service account, sync status
    gamInventory/           Product-inventory mapping, sync tree, targeting
    gamReporting/           Base, breakdown, principal reporting
    inventoryProfiles/      Inventory profile CRUD + API
    logs/                   processLogsRoute — REST + SSE process log endpoints
    oidc/                   OIDC config, enable/disable, OAuth flow
    operations/             Media buy actions, detail, reporting, webhooks
    policy/                 Policy actions + pages
    principals/             Principal CRUD, GAM API, webhooks
    products/               Product CRUD + inventory admin
    properties/             Property CRUD, actions, tags
    public/                 Signup, onboarding (no auth required)
    settings/               General, AI, adapter, domains, Slack, approximated
    tenants/                Dashboard, create, deactivate, media buys list, favicon
    users/                  Domains, list, setup mode, actions
    workflows/              Workflow list, step actions, step review
    index.ts                Barrel — registers all route plugins
  services/
    authGuard.ts            requireTenantAccess, isSuperAdmin
    sessionService.ts       Session read/write helpers
    auditParseService.ts    Parses audit log operation strings into structured data
db/
  client.ts                 Drizzle pool singleton
  schema/                   23 schema files (one per table)
gam/
  gamClient.ts              GAM SOAP client factory (OAuth + service account)
jobs/
  queues.ts                 BullMQ queue definitions + Redis config
  workers/
    gamSyncWorker.ts        Processes gam-sync jobs (inventory, orders)
routes/
  a2a/                      A2A agent card + JSON-RPC
  mcp/                      13 MCP tool handlers
  schemas/                  Schema service (list, get, root)
  health.ts                 Health check
  debug.ts                  Debug endpoints
utils/
  processLogger.ts          Cross-process structured logger → Redis ring buffer
app.ts                      Fastify app factory
server.ts                   HTTP entry point (binds port)
worker.ts                   BullMQ worker entry point
```

---

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add something new
fix: correct a bug
docs: update documentation
refactor: restructure without behavior change
perf: improve performance
chore: maintenance (hidden from changelog)
```

---

## License

See `_legacy/IPR_POLICY.md` for intellectual property policy. Maintained as a Prebid.org reference implementation.
