import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import type { IncomingMessage } from "http";

/**
 * Returns '/index.html' for browser navigation requests (Accept: text/html) so
 * Vite's SPA fallback kicks in instead of proxying to the backend.
 * API fetch calls (Accept: application/json / no text/html) are proxied normally.
 */
function bypassForBrowserNav(req: IncomingMessage): string | undefined {
  const accept = (req.headers["accept"] as string | undefined) ?? "";
  if (accept.includes("text/html")) return "/index.html";
  return undefined;
}

/**
 * Dev proxy to TS backend; base from scriptRoot (e.g. /admin) for mounting under a path.
 * Set VITE_SCRIPT_ROOT for base (default ''); VITE_API_ORIGIN for backend (default http://localhost:8080).
 */
const scriptRoot = process.env["VITE_SCRIPT_ROOT"] ?? "";
const apiOrigin = process.env["VITE_API_ORIGIN"] ?? "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  base: scriptRoot ? (scriptRoot.endsWith("/") ? scriptRoot : `${scriptRoot}/`) : "/",
  server: {
    port: 5173,
    // Allow Cloudflare Tunnel and any other reverse-proxy hosts.
    // VITE_ALLOWED_HOSTS accepts a comma-separated list (e.g. "abc.trycloudflare.com,myapp.example.com").
    // Set to "all" to allow every host (convenient but less strict).
    allowedHosts: process.env["VITE_ALLOWED_HOSTS"]
      ? process.env["VITE_ALLOWED_HOSTS"] === "all"
        ? true
        : process.env["VITE_ALLOWED_HOSTS"].split(",").map((h) => h.trim())
      : ["adcpts.nicksworld.cc"],
    proxy: {
      // WebSocket
      "/ws": { target: apiOrigin, ws: true, changeOrigin: true },
      // All backend API paths — proxied to the Fastify server.
      // Excludes Vite internal paths (/@vite, /@react-refresh, /src, /node_modules).
      "/api": { target: apiOrigin, changeOrigin: true },
      // OAuth redirect targets — browser navigations must reach the backend.
      "/auth": { target: apiOrigin, changeOrigin: true },
      // Session termination endpoint.
      "/logout": { target: apiOrigin, changeOrigin: true },
      // Test-mode POST login. GET /test/login must NOT be proxied (React route).
      "/test/auth": { target: apiOrigin, changeOrigin: true },
      // /tenant/* is both a React Router prefix AND a backend API prefix.
      // bypass: serve index.html for browser navigations (Accept: text/html)
      // so React Router handles the route; API fetches are proxied as normal.
      "/tenant": { target: apiOrigin, changeOrigin: true, bypass: bypassForBrowserNav },
      "/adapters": { target: apiOrigin, changeOrigin: true },
      "/settings": { target: apiOrigin, changeOrigin: true },
      "/mcp": { target: apiOrigin, changeOrigin: true },
      "/schemas": { target: apiOrigin, changeOrigin: true },
      "/health": { target: apiOrigin, changeOrigin: true },
      "/activity": { target: apiOrigin, changeOrigin: true },
      "/admin": { target: apiOrigin, changeOrigin: true },
      "/sync": { target: apiOrigin, changeOrigin: true },
      "/formats": { target: apiOrigin, changeOrigin: true },
      "/principals": { target: apiOrigin, changeOrigin: true },
      "/products": { target: apiOrigin, changeOrigin: true },
      "/properties": { target: apiOrigin, changeOrigin: true },
      // NOTE: /login and /signup are intentionally NOT proxied — they are
      // React client-side routes rendered by LoginPage / SignupPage.
    },
  },
});
