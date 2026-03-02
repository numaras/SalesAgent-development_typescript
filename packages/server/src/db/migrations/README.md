# Drizzle migrations

This directory contains SQL migrations generated and applied by Drizzle Kit.

## Commands

Run from repository root:

- `npm run db:generate --workspace=packages/server`
- `npm run db:migrate --workspace=packages/server`
- `npm run db:check --workspace=packages/server`

`db:generate` and `db:check` compile the server first and read schema metadata from `dist/db/schema/*.js`.

`DATABASE_URL` must be set before running any migration command.
