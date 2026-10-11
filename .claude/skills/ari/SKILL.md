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
| `pnpm generate:api` | Regenerates the API types from ari-api's OpenAPI (ari-api must be running; `API_URL` overrides `http://localhost:8080`) |
| `pnpm add <pkg>@<version> --filter <package>` | Adds a dependency: its version goes into the catalog, the package gets `catalog:` |

## Stack

- **Workspace:** Turborepo 2 + pnpm 11, Node 24 pinned with Volta. Apps in `apps/*`, shared
  packages in `shared/*` (see Layout), linked into apps with `workspace:*`. Single version policy:
  every external version lives once in the `catalog` of `pnpm-workspace.yaml`, and every
  `package.json` asks for `catalog:` (`catalogMode: strict` rejects a mismatched version). Every
  `tsconfig.json` extends the root `tsconfig.base.json`; no TypeScript project references.
- **Web app:** SolidStart v2 on Solid 1.x (Vite 8, Nitro). Pages render on the server first.
- **UI:** Kobalte (`@kobalte/core`, in `@ari/ui-kit` only), styled with Sass (`sass`, compiled
  by the app's Vite): `--ari-*` variables in `@ari/ui-kit`'s `tokens.css` (from the design
  handoff's `ari.tokens.json`; light theme only), global styles in its `base.css`, one Sass Module
  per component, variants and Kobalte states styled through `[data-*]` attributes. Figtree and
  Source Serif 4 are self-hosted: variable woff2 files in `@ari/ui-kit`'s `src/fonts/`, declared
  with `@font-face` in `base.css` (Vite bundles them); no font CDN. No other UI kit or CSS framework.
- **Data:** the router's `query`, `createAsync` and `action`; no data-fetching library.
- **Tooling:** Biome; Lefthook (pre-commit fixes the staged files, pre-push runs `biome check .`);
  GitHub Actions (Biome, then `turbo run test build --affected`); TypeScript 6, not 7, which ships
  no `tsserver` for VS Code.
- **Tests:** Vitest + `@solidjs/testing-library` + `vite-plugin-solid` + jsdom. `vitest.config.ts`
  uses `solid()`, the `~` alias and `conditions: ['development', 'browser']`, and runs `cleanup`
  after each test.

Add these with the first code that needs them, without asking: `@solidjs/router`, `@solidjs/meta`
(then drop the static `<title>` in `entry-server.tsx`), `@types/node` and the test packages. Ask
before adding any other package.

## Layout

```text
apps/web/src/
├── app.tsx · entry-client.tsx · entry-server.tsx   SolidStart requires all three
├── routes/          file routes (.ts/.tsx only)
├── features/<name>/ queries.ts (query + action) and the feature's components
└── styles/          page.module.scss

shared/              no lib/ folders: shared code goes in one of these four
├── data-access/     @ari/data-access: API client (the only code calling ari-api)
├── types/           @ari/types: API types, all generated from ari-api's OpenAPI: schema.ts
│                    (generated, never edited) and one <area>.ts per area naming the types code
│                    uses (auth.ts, users.ts)
├── ui-kit/          @ari/ui-kit: design-system components (thin Kobalte wrappers where Kobalte
│                    has the primitive), AsyncBoundary (Suspense + ErrorBoundary), tokens.css,
│                    base.css
└── utils/           @ari/utils: pure helpers, no UI and no API calls; openapi.ts has the
                     RequestBody / ResponseBody / ErrorBody type helpers

shared/ui-kit/src/
├── index.ts         exports every component and its props type
├── css-modules.d.ts types `*.module.scss` imports, so ui-kit type-checks on its own
├── highlight-color.ts  the five highlight colors, shared by the highlight components
├── fonts/           <family>/<family>.woff2 (one variable file, upright only) and its ofl.txt
├── styles/          tokens.css, base.css (exported as @ari/ui-kit/tokens.css and /base.css;
│                    app.tsx imports both, tokens first); mixins.scss (Sass mixins, no output)
└── <component>/     <component>.tsx + <component>.module.scss
```

Every file and folder name is lowercase kebab-case (`text-field.tsx`, `text-field.module.scss`);
Biome's `useFilenamingConvention` enforces it for code files, and styles follow the same rule.
Class names are kebab-case too, single words where possible (`styles.box`, `styles['label-row']`);
no BEM. Variants are `data-*` attributes, not modifier classes (`data-variant="primary"`). A
wrapper keeps Kobalte's behavior and adds its module class to each part, merging a `class` prop
when it takes one.

ui-kit holds only base components, and they are pure: one never imports another. Anything the
design builds by combining several (a HighlightRow with Tags, a toast with action buttons, a search
field with a shortcut badge, the reading view, the clip panel, auth pages) belongs in `features/`,
not `ui-kit`. Icons a caller picks are `JSX.Element` slots; a component's own fixed icons (the
check in Checkbox, the eye in a password TextField) are inline Lucide SVGs.

Imports go one way: apps may import all four; `data-access` may import `types` and `utils`; `types`
and `ui-kit` may import only `utils`; `utils` imports no workspace package. `docs/` holds only frontend and UI material:
`architecture.md` (how the frontend connects, sign-in rules and error codes, and in section 3 this
layout plus the client and UI rules) and `sequences.md` (the requests each flow sends). Keep them in
step with this file; backend details belong in ari-api's docs.

Only the three required app files exist (`app.tsx` loads the global CSS and renders "Hello world").
`ui-kit` has the design tokens and the design handoff's components, styled; `types` has the
generated schema and the auth and users types; `utils` has only the OpenAPI type helpers;
`data-access` has only its `package.json` and `tsconfig.json`. Create the rest when an issue needs it.

The shared packages are Just-in-Time (non-buildable): `exports` points at `./src/index.ts`, there is
no build script, and Vite compiles them inside the app. Turborepo still hashes their files into
`@ari/web#build`. Inside them, never use tsconfig `paths` (like `~`); use relative imports, or
subpath imports (`"imports": { "#*": "./src/*" }`). A shared package gets its dependencies (e.g.
`solid-js`) with its first code. Kobalte reaches the app only through `ui-kit` and still renders
on the server in dev and build; no `ssr.noExternal` entry is needed.

## API

- Base path `/api/v1`, JSON, ISO-8601 UTC times; errors are RFC 9457 Problem Details with a stable
  `code`. ari-api's OpenAPI (`http://localhost:8080/v3/api-docs`) is the source of truth.
- The API client in `@ari/data-access` uses `process.env.API_URL` on the server (read at runtime)
  and `import.meta.env.VITE_API_URL` in the browser, both defaulting to `http://localhost:8080`;
  tell them apart with `isServer`.
- API types are never written by hand. `openapi-typescript` (a dev dependency of `@ari/types`)
  generates `shared/types/src/schema.ts` from the OpenAPI doc; `pnpm generate:api` rewrites it and
  formats it with Biome. It is committed, because CI and Docker can't reach ari-api. Each area file
  (`auth.ts`, `users.ts`) names an endpoint's operation
  (`paths['/api/v1/auth/login']['post']`) and exports `RequestBody`, `ResponseBody` (2xx) and
  `ErrorBody` (every declared 4xx, 5xx and `default` response) of it, re-exported from `index.ts`.
  Regenerate after every ari-api change; tsc then flags code that no longer matches.
- `ErrorBody` covers only the error responses the OpenAPI declares. The client treats any non-2xx
  as an error whatever the spec says (an undeclared 500, a proxy's 502), and a failed `fetch` as a
  network error.
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
  `tsconfig.base.json` is in `globalDependencies`, because Vite reads it through `extends`.
- **pnpm 11:** dependency install scripts run only for packages under `allowBuilds` (just
  `lefthook`). A dependency with a build script that isn't listed fails `pnpm install`, so list it
  as `false` when it doesn't need one (`@parcel/watcher`, which only sass's CLI watch mode uses).
- **Docker:** build from the repo root with `CI=true` and `--ignore-scripts` (lefthook needs git).
  Compose reads `apps/web/.env` only through `--env-file`, which is why `pnpm docker` exists. The
  file supplies `VITE_API_URL` as a build argument and `DOCKER_API_URL` as the container's `API_URL`
  (it reaches ari-api through `host.docker.internal`). The Dockerfile copies each shared package's
  `package.json` before the install, then `tsconfig.base.json` and `shared/` before the build; a
  new shared package needs its own `package.json` line there.

## Rules

- No prewritten code: write only what the current task asks for.
- Never skip the git hooks (`--no-verify`, `LEFTHOOK=0`). Keep CI green; change `lefthook.yml` and
  `ci.yml` together.
- Prefer simple, explicit code.
- When a decision changes, update this file in the same commit.
