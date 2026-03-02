/**
 * pm2 process definitions for the TypeScript monorepo.
 *
 * Start dev environment:
 *   pm2 start ecosystem.config.cjs --only adcp-server
 *   pm2 start ecosystem.config.cjs --only ui-dev
 *
 * Start all:
 *   pm2 start ecosystem.config.cjs
 *
 * Stop all:
 *   pm2 stop all
 *
 * Ports (mirroring the legacy Docker setup):
 *   adcp-server  → :8080  (MCP + A2A combined on one Fastify app)
 *   adcp-worker  → (no port) BullMQ background job worker
 *   ui-dev       → :5173  (Vite dev server for React admin UI)
 *   ui-preview   → :5173  (Vite preview of production build)
 *
 * Postgres + Redis run in Docker (no nginx needed — Vite proxies all API calls):
 *   docker compose up -d
 *
 * @type {import('pm2').ApplicationDeclaration[]}
 */
module.exports = {
  apps: [
    // ------------------------------------------------------------------ //
    // ADCP server – Fastify (TypeScript via tsx watch)                     //
    // Legacy: adcp-server Docker service (scripts/run_server.py)           //
    // ------------------------------------------------------------------ //
    {
      name: "adcp-server",
      script: "./node_modules/.bin/tsx",
      args: "watch packages/server/src/server.ts",
      // Restart on crash, but tsx watch handles file-change restarts itself
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
        PORT: "8080",
        HOST: "0.0.0.0",
        LOG_LEVEL: "debug",
        DATABASE_URL:
          "postgresql://adcp_user:secure_password_change_me@localhost:5432/adcp?sslmode=disable",
        REDIS_URL: "redis://localhost:6379",
        // ---- Auth: choose ONE option ----
        // Option A – test mode (no real OAuth, local dev only)
        ADCP_AUTH_TEST_MODE: "true",
        // Option B – Google OAuth (comment out ADCP_AUTH_TEST_MODE and fill these in)
        // GOOGLE_CLIENT_ID: "",
        // GOOGLE_CLIENT_SECRET: "",
        // GAM OAuth credentials — override in .env
        // GAM_OAUTH_CLIENT_ID: "",
        // GAM_OAUTH_CLIENT_SECRET: "",
      },
      env_production: {
        NODE_ENV: "production",
        PORT: "8080",
        HOST: "0.0.0.0",
        LOG_LEVEL: "info",
        REDIS_URL: "redis://localhost:6379",
      },
    },

    // ------------------------------------------------------------------ //
    // BullMQ worker – processes background jobs (GAM sync, etc.)          //
    // Legacy: background_sync_service.py threading model                  //
    // Run: pm2 start ecosystem.config.cjs --only adcp-worker              //
    // ------------------------------------------------------------------ //
    {
      name: "adcp-worker",
      script: "./node_modules/.bin/tsx",
      args: "packages/server/src/worker.ts",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
        DATABASE_URL:
          "postgresql://adcp_user:secure_password_change_me@localhost:5432/adcp?sslmode=disable",
        REDIS_URL: "redis://localhost:6379",
        // GAM_OAUTH_CLIENT_ID: "",
        // GAM_OAUTH_CLIENT_SECRET: "",
      },
      env_production: {
        NODE_ENV: "production",
        REDIS_URL: "redis://localhost:6379",
      },
    },

    // ------------------------------------------------------------------ //
    // Admin UI – Vite dev server (React + Tailwind)                        //
    // Legacy: admin-ui Docker service (src/admin/server.py on :8001)       //
    // packages/ui must exist before starting this process.                 //
    // ------------------------------------------------------------------ //
    {
      name: "ui-dev",
      script: "./node_modules/.bin/vite",
      args: "--port 5173 --host 0.0.0.0",
      cwd: "./packages/ui",
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: "development",
      },
    },

    // ------------------------------------------------------------------ //
    // Admin UI – Vite preview (production build preview)                   //
    // Run `npm run build:ui` first, then start this process.               //
    // ------------------------------------------------------------------ //
    {
      name: "ui-preview",
      script: "./node_modules/.bin/vite",
      args: "preview --port 5173 --host 0.0.0.0",
      cwd: "./packages/ui",
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
