---
name: ari
description: Conventions and setup for ari, the frontend of Ari (SolidStart website now, browser extension later), an app that saves highlights and clipped page sections with their sources. Use this skill whenever creating, configuring, running or extending anything in the ari frontend repository (Turborepo + pnpm workspace, SolidStart, Kobalte, Biome, Lefthook git hooks, Docker), or when choosing packages or folder structure, even if the request does not name this skill.
---

# ari

Ari ("arı" means "bee" in Azerbaijani) saves highlights and clipped page sections with their
sources. It lives in two repositories:

- **ari** (this repo): the frontend. The SolidStart website now, a browser extension later.
- **ari-api**: the Java / Spring Boot backend, on `http://localhost:8080`.

Write "Ari" in UI text and `ari` in code, package names and URLs; never use the dotless "ı" there.

Work is tracked as GitHub issues, one per feature per repo (F0, F1, …), on the project "ari"
(github.com/users/salimsalimzade/projects/1). **Todo** is the MVP, **Incoming** comes after it.

## Commands

| Command | What it does |
|---|---|
| `pnpm install` | Installs dependencies and the git hooks |
| `pnpm dev` | Starts every app through Turborepo; the website on http://localhost:3000 (start ari-api first) |
| `pnpm dev --filter=@ari/web` | Starts one app |
| `pnpm build` · `pnpm test` | Runs the script in every package that has it, cached by Turborepo |
| `pnpm check` · `pnpm format` | Biome checks / fixes formatting, lint and import order for the whole repo |
| `pnpm docker` | Runs the website in a container on port 3000, with the values from `apps/web/.env` |

## Stack

- **Workspace:** Turborepo 2 + pnpm 11, Node 24 pinned with Volta. Apps in `apps/*`, shared
  packages in `shared/*` (empty for now).
- **Web app:** SolidStart v2 on Solid 1.x (Vite 8, Nitro). Pages render on the server first.
- **UI:** Kobalte, styled with plain CSS: variables in `styles/tokens.css` (light and dark), one
  CSS Module per component, Kobalte parts styled through their `[data-*]` state attributes. No
  other UI kit or CSS framework.
- **Data:** the router's `query`, `createAsync` and `action`; no data-fetching library.
- **Tooling:** Biome; Lefthook (pre-commit fixes the staged files, pre-push runs `biome check .`);
  GitHub Actions (Biome, then `turbo run test build --affected`); TypeScript 6, not 7, which ships
  no `tsserver` for VS Code.
- **Tests:** Vitest + `@solidjs/testing-library` + `vite-plugin-solid` + jsdom. `vitest.config.ts`
  uses `solid()`, the `~` alias and `conditions: ['development', 'browser']`, and runs `cleanup`
  after each test.

Add these with the first code that needs them, without asking: `@solidjs/router`, `@kobalte/core`,
`@solidjs/meta` (then drop the static `<title>` in `entry-server.tsx`), `@types/node` and the test
packages. Ask before adding any other package.

## Layout

```text
apps/web/src/
├── app.tsx · entry-client.tsx · entry-server.tsx   SolidStart requires all three
├── routes/          file routes (.ts/.tsx only)
├── features/<name>/ queries.ts (query + action) and the feature's components
├── components/      thin Kobalte wrappers; AsyncBoundary (Suspense + ErrorBoundary)
├── lib/api.ts       the only place that calls the API
└── styles/          tokens.css, base.css, page.module.css
```

Only the three required files exist (`app.tsx` renders "Hello world"); create the rest when an
issue needs it.

## API

- Base path `/api/v1`, JSON, ISO-8601 UTC times; errors are RFC 9457 Problem Details with a stable
  `code`. ari-api's OpenAPI (`http://localhost:8080/v3/api-docs`) is the source of truth.
- `lib/api.ts` uses `process.env.API_URL` on the server (read at runtime) and
  `import.meta.env.VITE_API_URL` in the browser, both defaulting to `http://localhost:8080`; tell
  them apart with `isServer`.
- API types go in a `shared/api` package (`@ari/api`) once code needs them.
- A page loads its main data with `createAsync(..., { deferStream: true })`, so the server HTML
  holds it. Every page handles loading, empty and error states.

## Gotchas

- **URLs and secrets:** they go in `apps/web/.env` (gitignored, never copied into images), never
  hardcoded. List every key with a safe value in the committed `apps/web/.env.example`. Write each
  value once and reuse it as `${NAME}`; Vite, Nitro and Compose all expand it. Nitro loads `.env`
  into `process.env`. Vite bakes every `VITE_*` value into browser code, so a secret never gets
  that prefix. The built server doesn't read `.env`: the container gets each variable through
  `environment` in `docker-compose.yml` as `${NAME}`, and production sets real environment
  variables.
- **Turborepo env:** tasks see only the shell variables `turbo.json` lists. `VITE_*` is listed
  because Turborepo detects the app as nitro and doesn't add it. Add server-only variables to
  `dev`'s `passThroughEnv`.
- **Turborepo docs:** read `node_modules/turbo/docs/README.md` before changing `turbo.json`. Biome is
  not a Turborepo task. `agentGuidance: false` stops turbo from writing an `AGENTS.md`.
- **pnpm 11:** dependency install scripts run only for packages under `allowBuilds` (just
  `lefthook`).
- **Docker:** build from the repo root with `CI=true` and `--ignore-scripts` (lefthook needs git).
  Compose reads `apps/web/.env` only through `--env-file`, which is why `pnpm docker` exists. The
  file supplies `VITE_API_URL` as a build argument and `DOCKER_API_URL` as the container's `API_URL`
  (it reaches ari-api through `host.docker.internal`). When web gets a workspace dependency, the
  Dockerfile must copy its `package.json` and folder too.

## Rules

- No prewritten code: write only what the current task asks for.
- Never skip the git hooks (`--no-verify`, `LEFTHOOK=0`). Keep CI green; change `lefthook.yml` and
  `ci.yml` together.
- Prefer simple, explicit code.
- When a decision changes, update this file in the same commit.
