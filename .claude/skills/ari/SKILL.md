---
name: ari
description: Conventions and setup for ari, the frontend of Ari (SolidStart website, and the browser extension: Firefox now, Chrome later), an app that saves highlights and clipped page sections with their sources. Use this skill whenever creating, configuring, running or extending anything in the ari frontend repository (Turborepo + pnpm workspace, SolidStart, Kobalte, Biome, Lefthook git hooks, Docker), or when choosing packages or folder structure, even if the request does not name this skill.
---

# ari

Ari ("arı" means "bee" in Azerbaijani) saves highlights and clipped page sections with their
sources. It lives in two repositories:

- **ari** (this repo): the frontend. The SolidStart website, and the browser extension (Firefox
  now, Chrome later).
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
| `pnpm dev --filter=@ari/extension` | Opens Firefox with the extension loaded, reloading it on every change (WXT's dev server on 3001) |
| `pnpm --filter @ari/extension zip` | Zips the Firefox build for addons.mozilla.org (`apps/extension/.output/`) |
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
- **Extension:** WXT 0.21 with `@wxt-dev/module-solid`, Manifest V3, built for Firefox
  (`wxt -b firefox`, Firefox 140 or later; Chrome comes later). `web-ext` runs and lints it.
  WXT's auto-imports are off (`imports: false`): `browser`, `storage` and `define*` are imported
  from `wxt/...` like everything else.
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
  after each test. The web app's tests are plain code so far (the export's files, photo passages)
  and run in Node; its config inlines every `.jsx` dependency (Kobalte's, through ui-kit) so Vite
  compiles them.
- **OCR:** tesseract.js 7 (photo import, F12), with `tesseract.js-core` and
  `@tesseract.js-data/eng` / `aze` / `tur` / `rus` as dev dependencies that only supply the files
  it serves.
  Its postinstall only asks for donations, so `allowBuilds` lists it as false.

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

apps/extension/src/  WXT's srcDir
├── entrypoints/     background.ts, content/ (the page UI in a shadow root, side panel included),
│                    popup/, welcome/ (opened once, at install)
├── features/<name>/ saves (storage), highlight, clip, page (the content UI), popup, side-panel,
│                    welcome
├── i18n/            en.ts, az.ts and i18n.ts (t, fill, plural)
├── styles/          _extension.scss (Sass mixins, no output)
└── icons.tsx · keys.ts · messages.ts · website.ts

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
the router actions in `features/auth/queries.ts`, then go to `/library`. `/verify-email`
(`features/auth/verify-email.tsx`, public, in `AuthLayout`) is where a verify email's link leads: it
confirms the code in `onMount` only (a mail scanner fetching the HTML never uses it up) and shows
confirmed, expired or used, taken, incomplete, or a retry. Forgot password (the design's "Ari Log
in"): `/forgot-password` (`ForgotPasswordForm`) asks for a link by username or email and shows a
"Check your email" `AuthToast`, or an alert when none was sent: no such account
(`ACCOUNT_NOT_FOUND`, with a link to `/register`), an account without an email (`NO_EMAIL`), or
one whose email isn't confirmed yet (`EMAIL_NOT_CONFIRMED`); `/reset-password?code=` (`ResetPassword`) checks the link with the
`getPasswordReset` query while the server renders (checking never uses the code up), then takes the
new password, or shows expired, used, invalid or a retry; on save it goes to `/login` with the
username in the history state, which fills the form in and shows "Password updated". `LoginForm`
answers `INVALID_CREDENTIALS` with its own alert linking to `/forgot-password`. The reset goes
through ari-api (sequences §11: `requestPasswordReset`, `checkPasswordReset`, `resetPassword`, all
with `refresh: false`); `resetPasswordAction` revalidates nothing, so the used link isn't checked
again before the page moves on to `/login`. Sign-in is username and password
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
ui-kit `Popover` or a sheet on phones, a column of the months the loaded saves are from to jump
to, with Earlier while older ones are still to load (left out when there is only one month), or a
floating button under 1024px, and more on scroll), `/library/:id` (the reading view; a full-screen detail on phones:
color, comment, source, copy with citation, delete), and `/imports` with `/imports/:id` (upload
space, a drop zone, files ready / in progress / not imported / history, and the review that saves
ticked marks into the Library). Files can be dropped anywhere on the Library or Imports page, and
the Library shows this visit's imports in a tray (a pill on phones). The saves come from ari-api
(`features/library/queries.ts`, sequences §4): `library-store.tsx` (set up by the `(app)` layout)
holds the filters, the pages, this visit's changes, imports, the toast and the palette. The first
page for the filters (`getSavePage`, 40, newest first) and the facets (`getSaveFacets`: type tab
counts, tag / color / source choices) render on the server (`deferStream`); more pages load on
scroll with `nextCursor`, and a month jump loads pages until the month is there (ari-api has no
date filter). Saves (`saves.ts`: `toSave`, `Save`, `Source` with ari-api's id) keep the source as an
object; a file's `page` is a number, shown through `usePageLabel`. Filter changes run in
`startTransition`, so the list stays until ari-api answers; the store derives with plain functions
on the server (a memo there is worked out once, before the data). Color and comment changes (the
comment once typing stops) and deletes show at once and go through `changeSaveAction` and
`deleteSaveAction`, which refresh only the counts; one ari-api refuses is put back with a toast.
The queries answer `failed` instead of throwing, so the list shows its error state with Try again
while search and the sidebar go on. `/library/:id` shows a loaded save at once, or `getSave`
(`GET /saves/{id}`; null is not found); previous / next go through the loaded list, loading the next
page at its end. Clips show their picture (`imageUrl`, signed for an hour) or their table (from
`contentMd`). The sidebar's Library count is `getMe`'s `savesCount`. Search goes through ari-api's
`q` (F10, sequences §4): the palette asks `searchSaves` 250 ms after the typing stops (the saves
loaded so far stand in until it answers) and offers "All N results", which puts the search in the
Library's filters (`filters.q`, a chip there, counted by the facets). In the same round the
palette's Sources and Notes groups ask `searchSources` (name, title, author) and `searchNotes`
(title and writing); the notes' "/" quote picker asks `searchSaves` too. Each shows what the page
has loaded until ari-api answers. Imports come from ari-api (F5, F11, sequences §6): PDF and Word
(DOCX) files, of any size that fits in the 50 MB of upload
space everyone has until billing (no per-file limit, no plan check, no Hive upsell). Photos (F12:
JPEG, PNG, WebP) are read in the browser and show in the list like a file being read (its bar is
how far the reading got), one photo at a time: `importPhotoFile` (`queries.ts`) runs
`photo-ocr.ts`'s `readPhotoMarks`, which draws the photo to a canvas (its EXIF turn applied, at
most 3000px) and reads it with tesseract.js (dynamically imported, LSTM only) in English,
Azerbaijani and Turkish, then reads again in Russian alone each line read with less than 60
confidence (read together, the scripts turn into each other's look-alikes). `photo-marks.ts`'s
`findMarks` (tested on drawn rasters) then finds what is marked, per word: measured against the
paper's own color, a highlighter's color behind the letters; an ink line through the word's middle
(strike) or under its baseline (underline); a pen drawing, from the ink's shapes on a grid an eighth
of a line high, counting only ink outside the words, as a big, mostly empty, not straight shape
with ink on both sides of the word (a circle or box) or a tall, thin, wobbly one in the margin
beside lines (a bracket). Printed frames, tables and rules are straight and left out, and their
edges never count as underlines. Words marked the same way one after another are one mark (a
highlighter's change of color starts another). `POST /imports/photo` sends the marks with their
types and colors (#rrggbb, mapped by ari-api like a file's), and the import comes back READY (or
EMPTY) for the usual review; a photo that can't be read is refused as `unreadable`. `vite.config.ts`'s `ocrFiles` plugin copies tesseract.js's worker, the
three LSTM cores and the `best_int` language data from node_modules into `public/ocr/`
(gitignored), so no CDN is used. The store keeps the files it is
uploading (`uploadFile` over data-access' XHR `upload`, for its progress) or refused (type, no
space left, or the upload failed) in the page; the rest is `getImports` (on every signed-in page, for the
sidebar's ready count), asked again every 2 s while a file is queued or being read. `/imports/:id`
loads `getImport` with its marks (pictures of drawn and handwritten ones from `imageUrl`) and keeps
the ticks in the page until `reviewImportAction` saves them, which revalidates the Library, its
counts, the Sources pages and the notes; Retry, Dismiss and Discard are actions too. The reading
view's Add to note quotes the
save in one of the newest notes or in a new one. `features/notes` (from the design's "Ari Notes") has `/notes` (the notes beside the open note on
wide screens, where the sidebar opens the newest note; the list on phones, or the empty state) and
`/notes/:id`: a title and paragraphs with saved quotes between them. Each paragraph is a textarea
over an invisible copy of its text, so it grows; hydration leaves textareas empty, so each ref fills
its own. A "/" that starts a paragraph or a word lists saved highlights to quote (arrow keys, Enter,
Escape; tinted through a copy of the text behind the field), and the quote goes in after the writing
before it, the writing after it moving to the next paragraph. Whole blocks are picked by dragging
from one block into another, Shift+↑ / ↓ past a paragraph's end, Shift-click or ⌘A / Ctrl A twice,
then copied, cut or deleted together; pasting what was copied back in a note brings back its
blocks, quotes and all. ⋯ (ui-kit `Menu`) adds a quote, copies as text, exports Markdown or PDF (the print dialog),
duplicates or deletes. Quotes keep a `saveId`, so they follow the save's color and leave with it.
The notes come from ari-api (`features/notes/queries.ts`, sequences §13): `notes-store.tsx` (set up
by the `(app)` layout) renders `getNotes` (the list, on every signed-in page, for the sidebar, the
palette and Add to note) and `/notes/:id` renders `getNote` (each quote with its save, so quotes of
saves the Library hasn't loaded show too). A note opened in the editor becomes a draft (made by an
effect once it is on the screen, so no field is made again under the caret): changes show at once,
and the whole note goes to ari-api (`saveNoteAction`, `PUT`) once the typing stops (700 ms), when
the tab is hidden, or at once for Add to note; one save at a time per note, the newest draft each
time. The status shows Saving…, Not saved · Try again, or when it was saved. New note, Add to note's
new note and Duplicate `POST` first and then open the note; a delete shows at once and comes back
with a toast when ari-api refuses it. Block ids are made in the page (`notes.ts`'s `toNote` uses
their places, so the server's render matches); ari-api keys blocks by note and position.
`features/sources` (from the design's "Ari Sources") reads ari-api's sources
(`features/sources/queries.ts`, sequences §12) and keeps no state of its own. `/sources` is a card
per website or file with saves (`getSourcePage`, 40, latest saved from first; All / Websites / Files
tabs counted by `getSourceCounts`, a tab change in `startTransition`; its own search, a field
opened from the header on phones, asks `getSourcePage` with `q`, apart from the palette's search of
everything), and `/sources/:id` (ari-api's source id) shows `getSource` (counts
per kind, colors, the newest highlight, first and latest save; null is not found) with its saves
from `getSourceSaves` (`GET /saves?source=&order=PAGE`: by page for files, the order they were saved
for websites) or newest first, each with "Open at this spot" (a text-fragment link) on websites,
beside "About this source" (above the saves under 1024px, left out on phones). Both load more on
scroll through `createPagedList` (`paged-list.ts`). Each source carries the notes quoting it (a card's
"In a note", "Quoted in"); a save's own "In a note" comes from the notes list's `saveIds`
(`quoted.ts`). The sidebar's Sources count is how many sources the
Library's facets list. Changing or deleting a save marks the Sources queries stale. `/settings` (`features/settings`, from the design's "Ari Settings")
has Account, Plan and billing, Shortcuts, Export and Connected apps (the design's Highlight colors
section was left out); on wide
screens they sit in a column beside the open section, with Log out under them (wrapping rows of
pills under 1024px), and
`/settings` itself is the list (the account, each section with a line about it, Log out), where the
phone tab goes. Account (`features/account`, from the design's "Ari Account"): photo (upload or
drop, crop in a dialog), profile form and an optional email, all live through the actions in
`features/account/queries.ts`. The photo is cropped in the dialog to a 512×512 JPEG `Blob`,
shown at once while it uploads (`changePhotoAction`), then from `getMe`'s signed `photoUrl`, here
and in the sidebar; `INVALID_PHOTO` and `FILE_TOO_LARGE` show as the type and size errors. The
profile form saves with `updateProfileAction` (the picker's `dd.MM.yyyy` sent as an ISO date) and
shows `USERNAME_TAKEN` on the username field. The email section reads `email` and `pendingEmail`
from `getMe`, adds or changes the address (ari-api emails a verify link; a verified email keeps
working until the new one is confirmed), resends and removes, and shows `RATE_LIMITED` in the
dictionaries' words. Export (`export-data.tsx`) is real and made in the browser:
`loadExport` (`features/settings/queries.ts`) pages through `listSaves` by type, 100 at a time
(Highlights take in imported ones; All ticks every part), then fetches each note that isn't empty, and `exportFile` (`export-file.ts`, tested) writes one
file: Markdown or plain text grouped by source, a CSV row per save and per note (UTF-8 with a byte
order mark, formula-like cells prefixed with '), or ari-api's own JSON. Its counts come from the
whole Library's facets and the notes list. The other settings sections are UI only: the
plan (trial, active, payment failed, canceled; the cancel dialog is a sheet on phones),
billing and upload space stay in the page until ari-api has their
endpoints. Their state lives in `SettingsProvider` (`settings-store.tsx`, with the design's example
account as `sample`), set up by the settings layout so the list can sum each section up. Dates,
numbers and sizes in the app go through `src/i18n/format.ts`'s `useFormat()` (date-fns patterns and
separators from the dictionaries' `formats`, not Intl; `ago` for "10 min ago"), and dictionary texts take values through
`fill()` and counts through `plural()` (`{ one, other }`). App Sass modules share
`src/styles/_app.scss` (breakpoints, `stroke-icon`, `visually-hidden`, `card`). `src/middleware.ts`
refreshes the session before a page renders when `ari_access` is gone (pages only, so asset
requests don't spend the same refresh token).
`apps/extension` (from the design's "Ari Extension", issues F13 and F14) signs in with the
website (`features/account/`, ari-api's sequences §6): on the website's own origin its content
script and the signed-in pages talk through `window.postMessage` (the messages are `@ari/utils`'
`BridgeMessage`). A signed-in page (`useExtensionSignIn` in the web shell's `UserChip`) says who is
signed in (id, username, name and email, kept as `local:websiteAccount` for the popup); when the
extension isn't signed in as them it asks for a code, the page gets one from
`POST /me/extension-code` (`createExtensionCode`) and posts it, and the background swaps it for the
extension's own tokens (`session.ts`: `local:tokens`, and `local:account` for the UI). The
website's `logoutAction` posts `signed-out`, which signs the extension out too while it follows the
website (`local:followsWebsite`). The popup (the design's 28a sign-in) shows one state card above
its menu: Continue as the website's account (signed out while the website is signed in; it asks
for that account's password), You're signed out, "N highlights not saved"
with Sign in to sync, Session expired (a refused refresh keeps `local:account` with
`local:expired`; Sign in again asks its password), a different account than the website's (Use
ari.app account, which asks that account's password, or Keep, `local:keptBeside`), "waiting to sync" with Sync now, or else the page's count. Its avatar opens the
account switcher: the account in use, the website's and the others used here
(`local:knownAccounts`), each switched to with its password, Add another account and Sign out.
Signing in as another account happens in the popup, never on a website page (the design's 29a):
Add an account (also from Use a different account, and the welcome tab's Not you?, which opens the
popup through `session:addAccountNext`) takes a username and password, and the background gets a
code for them from `POST /auth/extension/code` (`signInWithPassword`); "Signed in as …" follows.
Forgot password? and Reset password open the website's `/forgot-password?login=`. A picked account
stays whatever the website does. Sign out forgets the accounts and sets `local:loggedOut`: from
then on, as while expired, the website's codes don't sign the extension in (the content script
stops asking, the background refuses them), and only a password in the popup does, which clears
both. Only
the background calls ari-api (`VITE_API_URL`), with `Authorization: Bearer` and
`credentials: 'omit'` (ari-api reads the `ari_access` cookie before the header), refreshing once on
a 401; a 401 from the refresh leaves the session expired. Each refresh, and each browser start,
gives the session 30 more days. Saves are kept in
`browser.storage.local` under `page:<address without #fragment>` (`features/saves/store.ts`), each
shaped like ari-api's `CreateSaveRequest`, and the background sends them to the library
(`features/saves/sync.ts`, sequences §7): `POST /saves` (multipart for an image clip), then
`PATCH` for changes (`changed`) and `DELETE` for deletions (`local:deletedSaves`); a sent save keeps
`remoteId` and `owner`, a 4xx marks it `refused`, and anything else retries on a
`browser.alarms` backoff (`local:syncRetry`). Pages show only the saves kept here and the
signed-in account's (`ownSaves`); saves made while signed out go to whoever signs in next. The
icon's badge counts the waiting saves, terracotta while signed out, gray while retrying. On every website
but Ari's own (where it only follows the website's sign-in, and the popup and shortcuts do nothing)
the content script mounts `PageUi` (`features/page/page-ui.tsx`) in a WXT shadow root: the
selection toolbar (S saves, 1–5 save in a color, C comments, Esc closes; the comment box stays
under the toolbar and turns `#name` into tags from the library's facets and the recent ones), highlights wrapped in
`ari-mark` elements and found again on every visit by their words and neighbouring text
(`highlight/text-quote.ts`, like the W3C TextQuoteSelector), their hover card (color, comment,
tags, Delete, Open in Ari), toasts with Undo, "Saved on this browser" after the first save while signed out, and
clip mode (`clip/`: a table clips as Markdown, images into a picked set saved one item each,
any other block or a dragged box as a JPEG screenshot that the background cuts out of
`captureVisibleTab`). The side panel is Ari's own, not the browser's sidebar (no browser lets an
extension choose its sidebar's side): `PageUi` draws it fixed on the right of the page, or on the
left after Move panel to left (`local:panelSide`), and moves the page's content aside by its 380px
(a margin on `<html>`). It is open per window, like a sidebar (`local:panelWindows`, window ids
from the background's `window-id`; cleared at browser start); ⌥A (`toggle-panel`), the popup and its
close button set it through the background's `set-panel`. ⌘C / Ctrl C saves the selection only
while it is open, and the copy goes ahead. The popup counts the page's saves, saves the
selection, starts clip mode and opens the side panel; the side panel lists the
page's saves (long ones folded with Show more), rings the newest one, focuses it on the page,
removes it, copies all and toggles Show on page. The welcome tab (the design's first
run: Create a free account and Log in, or Connected to ari.app with Not you?) runs the same `PageUi`
on its sample text, with saves in `storage.session`. Sign in and Open in Ari open the website (`VITE_WEB_URL`, in
`apps/extension/.env`) at `/library`, which sends a signed-out visitor to `/login` first. The extension's language is the browser's
(`navigator.language`), and `t` is a plain object. Shortcuts: clip ⌥⇧C (the design's ⌥⇧S is
often a Mac screenshot tool's), side panel ⌥A; the popup shows the ones the user set in Firefox.
`ui-kit` has the design tokens and the design handoff's components, styled (plus `Accordion`, `SegmentedControl`, `Avatar`, `Slider`,
TextField's `prefix` and Select's `block` for the account page, SegmentedControl's `sm`,
Dialog's `sheet` and Avatar's `md` for the settings sections, `Popover`, Button's `newTab` and
ColorPicker's `names` for the Library, `Menu` for Notes, and `Switch`, `Kbd` and Logo's `sm`
wordmark for the extension); `types` has the
generated schema and the auth, users, saves, sources, notes and imports types (with the email calls' bodies, the
extension's sign-in, and the saves it sends); `utils` has the OpenAPI type helpers and the extension bridge's messages; `data-access` has the API client (`request`, `ApiError`, the shared refresh,
`refreshSession` for the middleware; a `FormData` body goes as multipart, and `upload` sends one
with its progress, refreshing first when ari-api's readable `ari_access_fresh` cookie is gone, so a
file isn't sent just to get a 401; `searchOf` for query
strings), the auth calls
(`verifyEmail` among them, with `refresh: false`, and `createExtensionCode`), `fetchMe` and the account calls (profile,
photo, email), the saves calls, the sources calls (`listSources`, `fetchSourceCounts`,
`fetchSource`) and the notes calls (`listNotes`, `createNote`, `fetchNote`, `replaceNote`,
`deleteNote`), the imports calls (`listImports`, `uploadImport`, `importPhoto`, `fetchImport`, `reviewImport`,
`retryImport`, `dismissImport`, `discardImport`) and the password reset calls, with Vitest tests. Its `Problem` type is written by
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
  hardcoded. List every key, with no value, in the committed `apps/web/.env.example`. Write each
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

- **Extension shadow root:** WXT turns the content CSS's `:root` into `:host` and moves its
  `@font-face` rules to the page, where relative font URLs break. So the content script doesn't
  load `base.css`; `entrypoints/content/shadow.css` sets the basics, and `features/page/fonts.ts`
  adds Figtree to the page's fonts as "Ari Figtree" from its bytes (`fonts/figtree.woff2`, copied
  from ui-kit by a `build:publicAssets` hook and web-accessible). `isolateEvents` keeps typed
  keys from the page's shortcuts, which also keeps them from Solid's listener on the document, so
  the content script calls `delegateEvents(['keydown', 'keyup'], shadowRoot)`. Marks live in the
  page, outside the shadow root, so they read the token colors from the UI and set them inline.
- **Extension, Firefox:** the Navigation API reports an address change before `location` has it,
  so the content script takes the new address from `wxt:locationchange`. macOS keeps apps started from VS Code's
  terminal out of `~/Library/Application Support/Firefox`, so the Firefox `pnpm dev` opens would
  never start web-ext's debugger (ECONNREFUSED after 30 s); `wxt.config.ts`'s `server:created`
  hook gives it a home of its own (`CFFIXED_USER_HOME`, in `.wxt/`). The extension's tsconfig turns off WXT's
  `noUncheckedIndexedAccess`, which the rest of the repo doesn't use. The gecko id
  (`extension@ari`) is permanent once on addons.mozilla.org. `web-ext lint` reports Solid's
  static `innerHTML` templates and Firefox for Android's minimum version as warnings, no errors.

## Rules

- No prewritten code: write only what the current task asks for.
- Never skip the git hooks (`--no-verify`, `LEFTHOOK=0`). Keep CI green; change `lefthook.yml` and
  `ci.yml` together.
- Prefer simple, explicit code.
- When a decision changes, update this file in the same commit.
