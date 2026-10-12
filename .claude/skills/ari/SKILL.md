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
  per component, variants and Kobalte states styled through `[data-*]` attributes. Kobalte stays
  on 0.13: 2.x (which has a date picker) needs Solid 2, so `DatePicker` is a Kobalte `Popover`
  around ari's own calendar. Dates are `dd.MM.yyyy` strings (`dateFormat`), handled with
  `date-fns`, never hand-written date maths; month and weekday names come from date-fns locales
  (`useI18n().dateLocale()`), not `Intl` (Chrome's has no Azerbaijani dates). Figtree and Source Serif 4 are self-hosted: variable
  woff2 files in `@ari/ui-kit`'s `src/fonts/`, declared with `@font-face` in `base.css` (Vite
  bundles them); no font CDN. No other UI kit or CSS framework.
- **Data:** the router's `query`, `createAsync` and `action`; no data-fetching library.
- **Forms:** TanStack Form (`@tanstack/solid-form`): one `createForm` per form component with
  the default values, `validators: { onDynamic: schema }` and `validationLogic: revalidateLogic()`
  (errors show after the first submit, then follow typing), and a `form.Field` per input; no
  custom form hooks or field wrappers. The schema is Valibot, kept in the form's file while it is
  small, and its messages are keys of `t().auth.errors` (`'nameRequired' satisfies ErrorKey`),
  translated where the error is shown, so shown errors follow the language picker. Every
  field has a visible label (what to enter); a placeholder only shows a format that isn't obvious
  (date `DD.MM.YYYY`), never repeats the label, and simple fields (name, username, password) get
  none. Placeholders stay the same in every language, so they live in the form, not
  the dictionaries. Hints that must stay visible go in `description`, below the field.
- **Languages:** English and Azerbaijani, no i18n library. `src/i18n/` holds one dictionary per
  language (`en.ts` sets the keys, `az.ts` is typed `Dictionary`), `I18nProvider` / `useI18n()`
  (`t()` is the current dictionary) and `LanguageSelect`. The choice lives in the `ari_lang`
  cookie, so the server renders it and sets `<html lang>`. UI text goes in the dictionaries.
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
├── i18n/            the dictionaries, the language context and LanguageSelect
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

`app.tsx` loads the global CSS and sets up the router and meta tags. `routes/index.tsx` is the
public landing page (the design's "Ari Landing v2"), put together from `features/marketing/`: one
component per section, each animated demo drawn at its design size inside `Stage` (which scales it
down to fit) and driven by `createTicker` (frames that run only while the section is on screen, and
a still frame for reduced motion). The demos' sample content (the bee article, quotes, files)
stays in English; every other text is in the dictionaries under `marketing`. The install and
trial buttons go to `/register` until the extension has store listings (`marketing/links.ts`).
`routes/pricing.tsx` (`/pricing`, the design's "Ari Pricing") reuses the same header, closing
band and footer with the `pricing-*` sections; its monthly / yearly switch lives in the route so the
closing band's price follows it. The landing shows the same `PricingPlan` as its `#pricing`
section (`section` prop: an h2 and section padding), with its own switch. Responsive patterns shared by both pages: below 1024px the
header's links move into a menu (on phones Log in too), FAQs open in place (ui-kit `Accordion`:
"+" / "−" wide, a turning arrow on phones; the landing FAQ swaps its chat panel for it), the
footer becomes a two-column card on phones, and the closing band offers the trial instead of
the install buttons there.
`routes/ui-kit.tsx` (`/ui-kit`) previews every ui-kit component; `/login` and `/register` (`features/auth/`) sign in through ari-api with
the router actions in `features/auth/queries.ts`, then go to `/library`. Sign-in is username and password
only: register sends `username`, `password`, `fullName` and `birthDate` (ISO; the picker's
`dd.MM.yyyy` is converted on submit), and the username follows ari-api's rule (3 to 30 letters,
digits, underscores or dots). Google (F9) comes later. The signed-in pages live in the
`routes/(app)/` group, whose layout `(app).tsx` wraps them in `LibraryProvider`, `NotesProvider` and
`features/shell`'s `AppShell`: a sidebar on wide screens (Library, Notes and Sources with their
counts, Imports with how many are ready; language, Settings and the user at the bottom) and a tab bar
under 720px (Library, Notes, Sources, Settings, as the design draws it: phones reach Imports through
the Library's import pill and the palette), where each page puts its own `MobileHeader` (logo, a title, or a "← Settings"
back link, plus the language picker and optional `actions`). The shell also holds the ⌘K / Ctrl K
search palette and the toast. `features/library` (from the design's "Ari Library") has `/library`
(list or masonry grid by day with sticky headings, type tabs, tag / color / source filters in a
ui-kit `Popover` or a sheet on phones, a column of months to jump to, or a floating button under
1024px, and more on scroll), `/library/:id` (the reading view; a full-screen detail on phones:
color, comment, source, copy with citation, delete), and `/imports` with `/imports/:id` (upload
space, a drop zone, files ready / in progress / not imported / history, and the review that saves
ticked marks into the Library). Files can be dropped anywhere on the Library or Imports page, and
the Library shows this visit's imports in a tray (a pill on phones). It is UI only:
`library-store.tsx` holds saves, filters, imports, the toast and the palette, starting from the
design's example library in `sample.ts` (texts in English, addresses on the reserved `.example`
domain); uploading and reading are timed stand-ins. The reading view's Add to note quotes the save in one of the newest notes or in a new
one. `features/notes` (from the design's "Ari Notes") has `/notes` (the notes beside the open note on
wide screens, where the sidebar opens the newest note; the list on phones, or the empty state) and
`/notes/:id`: a title and paragraphs with saved quotes between them. Each paragraph is a textarea
over an invisible copy of its text, so it grows; hydration leaves textareas empty, so each ref fills
its own. A paragraph starting with "/" lists saved highlights to quote (arrow keys, Enter, Escape),
and ⋯ (ui-kit `Menu`) adds a quote, copies as text, exports Markdown or PDF (the print dialog),
duplicates or deletes. Quotes keep a `saveId`, so they follow the save's color and leave with it.
Also UI only: `notes-store.tsx` starts from the design's example notes in `sample.ts`.
`features/sources` (from the design's "Ari Sources") has no state of its own: `useSources()` groups
the Library's saves by source. `/sources` is a card per website or file (latest saved from first,
All / Websites / Files tabs; its search opens the palette, whose sources open their page), and
`/sources/:slug` (a slug of the name until ari-api gives sources ids) lists the source's saves in
page order (by page for files, the order they were saved for websites) or newest first, more on
scroll, each with "Open at this spot" (a text-fragment link) on websites, beside "About this source"
(above the saves under 1024px, left out on phones). `/settings` (`features/settings`, from the design's "Ari Settings")
has Account, Plan and billing, Shortcuts, Export and Connected apps (the design's Highlight colors
section was left out); on wide
screens they sit in a column beside the open section, with Log out under them (wrapping rows of
pills under 1024px), and
`/settings` itself is the list (the account, each section with a line about it, Log out), where the
phone tab goes. Account (`features/account`, from the design's "Ari Account"): photo (upload or
drop, crop in a dialog), profile form and an optional email that stays unverified until confirmed.
Every section is UI only: Account's form is filled from `getMe`, but saving, the photo and the
email, the plan (trial, active, payment failed, canceled; the cancel dialog is a sheet on phones),
billing, upload space and export stay in the page until ari-api has their
endpoints. Their state lives in `SettingsProvider` (`settings-store.tsx`, with the design's example
account as `sample`), set up by the settings layout so the list can sum each section up. Dates,
numbers and sizes in the app go through `src/i18n/format.ts`'s `useFormat()` (date-fns patterns and
separators from the dictionaries' `formats`, not Intl; `ago` for "10 min ago"), and dictionary texts take values through
`fill()` and counts through `plural()` (`{ one, other }`). App Sass modules share
`src/styles/_app.scss` (breakpoints, `stroke-icon`, `visually-hidden`, `card`). `src/middleware.ts`
refreshes the session before a page renders when `ari_access` is gone (pages only, so asset
requests don't spend the same refresh token).
`ui-kit` has the design tokens and the design handoff's components, styled (plus `Accordion`, `SegmentedControl`, `Avatar`, `Slider`,
TextField's `prefix` and Select's `block` for the account page, SegmentedControl's `sm`,
Dialog's `sheet` and Avatar's `md` for the settings sections, `Popover`, Button's `newTab` and
ColorPicker's `names` for the Library, and `Menu` for Notes); `types` has the
generated schema and the auth and users types; `utils` has only the OpenAPI type helpers;
`data-access` has the API client (`request`, `ApiError`, the shared refresh, `refreshSession` for
the middleware), the auth calls and `fetchMe`, with Vitest tests. Its `Problem` type is written by
hand because ari-api's OpenAPI declares its error bodies as MeResponse; generate it once ari-api
fixes that. Create the rest when an issue needs it.

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
