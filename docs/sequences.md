# Ari sequences

Last updated 2026-10-14. This copy keeps only what the website, the `ari` server and the extension
send and receive. The server-side steps (database, queues, webhooks) are documented in ari-api.
The rules the UI relies on are in [architecture.md](architecture.md).

1. [Register or sign in (F1)](#1-register-or-sign-in-f1)
2. [Token refresh (F1)](#2-token-refresh-f1)
3. [Sign in with Google (F9)](#3-sign-in-with-google-f9)
4. [Server-rendered library page (F2)](#4-server-rendered-library-page-f2)
5. [Save and delete a highlight, free limit (F3, F4)](#5-save-and-delete-a-highlight-free-limit-f3-f4)
6. [PDF or Word import (F5, F11)](#6-pdf-or-word-import-f5-f11)
7. [Save from the extension (F13)](#7-save-from-the-extension-f13)
8. [Paddle checkout (F15)](#8-paddle-checkout-f15)
9. [Add and verify an email](#9-add-and-verify-an-email)
10. [Profile and photo](#10-profile-and-photo)
11. [Reset a forgotten password](#11-reset-a-forgotten-password)
12. [Sources](#12-sources)
13. [Notes](#13-notes)

## 1. Register or sign in (F1)

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as ari-api
  alt Register
    B->>A: POST /api/v1/auth/register (username, password, fullName, birthDate)
  else Sign in
    B->>A: POST /api/v1/auth/login (username, password)
  end
  A-->>B: Me + Set-Cookie ari_access, ari_refresh (httpOnly)
  B->>A: GET /api/v1/highlights (browser sends the cookies)
  A-->>B: 200 OK + data
```

## 2. Token refresh (F1)

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as ari server
  participant A as ari-api
  alt In the browser (@ari/data-access)
    B->>A: GET /api/v1/highlights (ari_access has expired)
    A-->>B: 401 UNAUTHORIZED
    B->>A: POST /api/v1/auth/refresh (ari_refresh cookie)
    A-->>B: 204 + new cookies
    B->>A: Retry GET /api/v1/highlights
    A-->>B: 200 OK + data
  else While rendering a page (middleware)
    B->>W: GET /library (ari_refresh only, the ari_access cookie is gone)
    W->>A: POST /api/v1/auth/refresh (forwards the Cookie header)
    A-->>W: 204 + Set-Cookie ari_access, ari_refresh
    W->>W: Keep the new cookies in event.locals for this render
    W-->>B: HTML rendered with the new token + the same Set-Cookie headers
  end
  Note over B,A: Refresh fails: 401, and the user goes to /login.
```

- In the browser, several 401s at once share one refresh request.
- The `ari` server refreshes only when `ari_access` is missing. The cookie expires a minute before its
  JWT, so a cookie the browser still sends is always valid.
- Beside them ari-api sets `ari_access_fresh=1`, readable by page JavaScript and holding no token,
  which goes a minute before `ari_access`. An upload checks it first and refreshes when it is gone,
  so a file is never sent just to get a 401 and go again (data-access' `upload`).

## 3. Sign in with Google (F9)

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as ari-api
  participant G as Google
  B->>A: GET /oauth2/authorization/google (full-page link)
  A-->>B: 302 to Google (with state)
  B->>G: Sign in and approve
  G-->>B: 302 to /login/oauth2/code/google with a code
  B->>A: GET /login/oauth2/code/google?code=...
  alt Signed in
    A-->>B: Set-Cookie ari_access, ari_refresh + 302 to http://localhost:3000/library
  else Failed
    A-->>B: 302 to http://localhost:3000/login?error=google
  end
```

## 4. Server-rendered library page (F2)

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as ari server
  participant A as ari-api
  B->>W: GET /library (cookies)
  W->>W: Middleware: ari_access present, or refresh first (section 2)
  Note over B,W: No cookies at all: 302 to /login
  W->>W: The (app) layout's LibraryProvider runs createAsync with deferStream, @ari/data-access forwards the Cookie header
  par The first page
    W->>A: GET /api/v1/saves
    A-->>W: 200 PageResponse (items with their source and tags, nextCursor), 40 newest first
  and The filters
    W->>A: GET /api/v1/saves/facets
    A-->>W: 200 type counts, tags, colors and sources (id, name, count)
  and The count
    W->>A: GET /api/v1/me
    A-->>W: 200 MeResponse (savesCount)
  end
  W-->>B: Streamed HTML with the data in it
  B->>B: Hydrate
  B->>A: GET /api/v1/saves?cursor=... (the end of the list in view, credentials include)
  A-->>B: 200 next page
  B->>A: GET /api/v1/saves?tag=swarm&color=YELLOW and /saves/facets?tag=swarm&color=YELLOW (a filter)
  A-->>B: 200 its first page and counts
  B->>A: GET /api/v1/saves/{id} (/library/{id} opened directly)
  A-->>B: 200 SaveResponse, or 404 NOT_FOUND
  B->>A: PATCH /api/v1/saves/{id} (color, or a comment once the typing stops)
  A-->>B: 200 SaveResponse, then GET /saves/facets again
  B->>A: DELETE /api/v1/saves/{id}
  A-->>B: 204, then GET /saves/facets and /me again
```

- `features/library/queries.ts` holds the queries (`getSavePage`, `getSaveFacets`, `getSave`) and
  the actions (`changeSaveAction`, `deleteSaveAction`). The actions revalidate only the counts they
  change, never the pages the list has loaded; the store shows a change at once and puts it back
  with a toast when ari-api refuses it.
- Filters (type, tags, colors, source ids) live in the store, not the URL: a reload starts from the
  whole Library. A filter change runs in a transition, so the list stays until ari-api answers.
- `nextCursor` is opaque: send it back as `cursor` for the next page. It is left out on the last
  page. ari-api can't start a page at a date, so the month jump loads pages until it gets there.
- A failed request is the query's `failed` answer, not a thrown error: the list shows "Your library
  didn't load" with Try again, while the sidebar and search go on.
- Search (`q`, F10) is a filter like the others: `GET /saves?q=` and `/saves/facets?q=`. A save
  matches when the words start words of its text, comment or section, or of its source's name,
  title or author, or when the whole search is part of its text; accents and case don't count. The
  palette asks for the first page and the counts 250 ms after the typing stops, showing the loaded
  saves meanwhile; "All N results" puts the search in the Library's filters, where that page is
  cached already. In the same round it asks `GET /sources?q=` (name, title, author) and
  `GET /notes?q=` (title and writing) for its Sources and Notes groups. The notes' "/" quote
  picker searches saves the same way. Sources has endpoints of its own (section 12).

## 5. Save and delete a highlight, free limit (F3, F4)

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as ari-api
  B->>A: POST /api/v1/highlights (kind, text, source fields, folderId)
  alt Invalid
    A-->>B: 400 VALIDATION_FAILED with field errors
  else Free limit reached
    A-->>B: 403 LIMIT_REACHED
    B->>B: Show the limit banner with an upgrade link
  else Saved
    A-->>B: 201 HighlightResponse (with id and createdAt)
  end
  B->>A: DELETE /api/v1/highlights/{id}
  alt Not the user's, or already gone
    A-->>B: 404 NOT_FOUND
  else Deleted
    A-->>B: 204
  end
```

- Free means at most 500 highlights stored at once: deleting gives the save back. Pro has no limit.
  Folders don't count.
- `GET /me` returns `plan`, `savesCount` and `savesLimit`; `/settings` shows them, and the banner shows
  once `savesCount` reaches `savesLimit`.

## 6. PDF or Word import (F5, F11)

```mermaid
sequenceDiagram
  participant B as Browser on /imports or /library
  participant A as ari-api
  B->>B: Refuse a file that isn't .pdf or .docx, or doesn't fit in the space left
  B->>A: POST /api/v1/imports (multipart file, sent with XMLHttpRequest for its progress)
  alt Refused
    A-->>B: 400 UNSUPPORTED_FILE or NO_SPACE_LEFT, 413 FILE_TOO_LARGE
  else Accepted
    A-->>B: 202 ImportResponse (QUEUED)
    loop Every 2 seconds while a file is QUEUED or READING
      B->>A: GET /api/v1/imports
      A-->>B: 200 ImportsResponse (each file's status and counts, the upload space)
    end
  end
  B->>A: GET /api/v1/imports/{id} (the review)
  A-->>B: 200 ImportResponse with its marks
  B->>A: PUT /api/v1/imports/{id}/review (title, author, tag, color, ticked mark ids)
  A-->>B: 200 ReviewResponse (added, removed, sourceId)
```

- ari-api reads the file in the background (its sequences §5): `QUEUED` → `READING` → `READY` with
  marks, `EMPTY` without, or `FAILED` (`UNREADABLE`, `ENCRYPTED`, `READ_FAILED`). Saving the review
  makes it `SAVED`; it can be reviewed again, and unticking a saved mark deletes its save.
- Retry (`POST /imports/{id}/retry`) reads a failed file again; Dismiss (`POST /imports/{id}/dismiss`)
  hides a failed, empty or discarded one; Discard (`DELETE /imports/{id}`) drops a file before its
  review.
- Everyone has 50 MB of upload space, in files of any size that fit in what is left, until billing
  (F15) gives plans their own; a file read and saved keeps counting.
- Photos are not imported yet: OCR in the browser comes with F12.

## 7. Save from the extension (F13)

```mermaid
sequenceDiagram
  participant X as Extension
  participant T as Website tab
  participant A as ari-api
  Note over X,A: Connect, on any signed-in page of the website
  T->>X: postMessage signed-in (the user's id)
  X->>T: postMessage want-code (not signed in as that user)
  T->>A: POST /api/v1/me/extension-code (cookies)
  A-->>T: 200 with the code
  T->>X: postMessage code
  X->>A: POST /api/v1/auth/extension/token (code)
  alt Missing, expired or used
    A-->>X: 401 INVALID_CODE
  else Found
    A-->>X: 200 accessToken, refreshToken
    X->>X: Keep the tokens in browser.storage.local
    X->>A: GET /api/v1/me (Bearer token)
  end
  Note over X,A: Or another account, with its password in the popup (Add an account, the switcher)
  X->>A: POST /api/v1/auth/extension/code (username, password; the website's cookies stay)
  A-->>X: 200 with the code, or 401 INVALID_CREDENTIALS (still the same account)
  X->>A: POST /api/v1/auth/extension/token (code), as above
  Note over X,A: Send the saves kept in the browser
  X->>A: POST /api/v1/saves (JSON, or multipart save and image for an image clip)
  alt Refused
    A-->>X: 400 VALIDATION_FAILED, INVALID_SAVE, INVALID_URL, or 413 FILE_TOO_LARGE
    X->>X: Keep it in the browser only, marked refused
  else Saved
    A-->>X: 201 SaveResponse (its id)
  end
  X->>A: PATCH /api/v1/saves/{id} (color, comment, tags changed after it was sent)
  X->>A: DELETE /api/v1/saves/{id} (deleted after it was sent)
  Note over X,A: Access token expired
  X->>A: POST /api/v1/auth/extension/refresh (refreshToken)
  alt Refreshed
    A-->>X: 200 new pair
  else Session over
    A-->>X: 401
    X->>X: Session expired: keep whose it was, until their password signs it in again
  end
  Note over X,A: Log out on the website (while the extension follows it)
  T->>X: postMessage signed-out
  X->>A: POST /api/v1/auth/extension/logout (refreshToken)
  A-->>X: 204
```

- Saves are kept in `browser.storage.local` (the welcome tab's practice ones in `storage.session`,
  never sent). The background (`features/saves/sync.ts`) sends them a second after each change,
  when someone signs in, at browser start and on the popup's Sync now: deletions first, then each
  page's saves in order. A save keeps its library id and the account (`remoteId`, `owner`); a page
  shows only the saves kept here and the signed-in account's. Saves made while signed out, or not
  sent yet, go to whoever signs in next ("will move to the account you switch to").
- A 5xx, 408, 429 or a failed fetch stops the round and tries again 1, 2, 5, 10, then every 30
  minutes (`browser.alarms`, `local:syncRetry`); a 4xx refuses that save only. A 404 on PATCH means
  it was deleted in the library, so it leaves the page too. Undo of a delete sends the save again
  as new.
- The Ari icon's badge counts the saves kept only here: terracotta while signed out or expired,
  gray while ari-api can't be reached. The popup says the same, with Sign in to sync or Sync now.
- The messages are `@ari/utils`' `BridgeMessage`, posted with `window.postMessage` to the website's
  own origin. The content script takes them only there (`VITE_WEB_URL`), and the background takes a
  code only from a tab on that origin, so no other site can sign the extension in as somebody else.
  The web side is `useExtensionSignIn` (in the shell's `UserChip`) and `logoutAction`.
- The code works once, for 60 seconds. A signed-out tab posts nothing: the extension's Sign in
  opens `/library`, which goes to `/login` first and then back. `signed-in` carries the user's id,
  username, name and email, which the extension keeps as `local:websiteAccount` for the popup.
- By default the extension uses the website's account and follows it, to another account and out.
  Signing in happens in the popup, never on a page of the website for the extension: Add an
  account (from Continue as's Use a different account, the switcher, or the welcome tab's Not you?,
  which opens the popup through `session:addAccountNext`) takes any account's username and
  password, and the switcher asks the password of an account used before. The background gets a
  code from `POST /auth/extension/code` and swaps it as above; the website stays as it is, and the
  extension keeps that account whatever the website does (`local:followsWebsite` false, unless it
  is the website's account).
- The popup's avatar opens the account switcher: the account in use, the website's ("on ari.app")
  and the others used here (`local:knownAccounts`), Add another account and Sign out. Forgot
  password? and Reset password open `/forgot-password?login=` on the website. When the website is
  signed in as another account than the one the extension keeps, the popup offers Use ari.app
  account (that account's password) or Keep (`local:keptBeside`).
- The extension's session is its own: it stays signed in while the website's cookies expire, and
  each refresh or browser start gives it 30 more days. A refused refresh leaves it expired
  (`local:expired`): the popup says so, and Sign in again asks that account's password. Sign out in
  the popup signs out only the extension and forgets the accounts it used (`local:loggedOut`).
  While expired or after a Sign out, the website's codes don't sign it in: the content script
  stops asking for them and the background refuses them. Only a password in the popup signs it
  in again: Continue as asks the website account's, the other Sign in buttons open Add an
  account. The website's codes sign the extension in only while it follows the website: at
  install, and when the website signs in after it logged out (not a Sign out).
- The extension calls `ari-api` from its background script with `credentials: 'omit'`: ari-api
  reads the `ari_access` cookie before the `Authorization` header. Firefox sends those requests with
  `Origin: moz-extension://<uuid>`, which ari-api's CORS allows by pattern, without credentials.
- The extension sends the page's address as `source.url`. Clips (F14) use the same `POST /saves`:
  a table with `kind CLIP` and `contentMd`, an image as multipart.

## 8. Paddle checkout (F15)

```mermaid
sequenceDiagram
  participant B as Browser on /settings
  participant P as Paddle
  participant A as ari-api
  B->>P: Paddle.js opens the overlay checkout (priceId, customData.userId, email)
  B->>P: Pay
  P-->>B: checkout.completed event in the page
  P->>A: Webhook: ari-api sets the plan to PRO
  loop Every 2 seconds, up to 30 seconds
    B->>A: GET /api/v1/me
    A-->>B: 200 with plan
  end
  B->>A: POST /api/v1/auth/refresh (new JWT with plan PRO)
  Note over B,A: Later, a cancellation at the end of the paid period sets plan FREE
```

- The plan changes when ari-api gets Paddle's webhook, not when the page sees `checkout.completed`;
  that's why the page polls `/me`.
- Downgrading deletes nothing. A Free user above 500 keeps every highlight but can't save until under
  500.
- Prices: Pro is $6/month or $48/year, the same everywhere.

## 9. Add and verify an email

```mermaid
sequenceDiagram
  participant B as Browser on /settings/account
  participant A as ari-api
  participant I as The user's inbox
  participant V as Browser on /verify-email
  B->>A: PUT /api/v1/me/email (email, and the cookies carry ari_lang)
  A-->>B: 202 Me with pendingEmail, or 429 RATE_LIMITED
  B->>B: The router reloads getMe, the section shows the address waiting for its link
  A-)I: The verify email, in the ari_lang language, sent in the background
  I->>V: The user opens /verify-email?code=…
  V->>A: POST /api/v1/auth/verify-email (code), in the browser only, refresh false
  alt 204
    A-->>V: Your email is confirmed
  else 401 INVALID_CODE
    A-->>V: This link no longer works
  else 409 EMAIL_TAKEN
    A-->>V: This email is already in use
  end
```

- A verified email keeps working while a new one waits for its link; the section says so.
- Resend (`POST /me/email/resend`, 202) and remove (`DELETE /me/email`, 204) reload `getMe` the
  same way. Over the limits, the section shows `RATE_LIMITED`'s text.
- `/verify-email` confirms in `onMount`, never while the server renders, so a mail scanner that only
  fetches the link's HTML can't use up the single-use code.

## 10. Profile and photo

```mermaid
sequenceDiagram
  participant B as Browser on /settings/account
  participant A as ari-api
  participant S as MinIO
  B->>A: PUT /api/v1/me (username, fullName, birthDate as an ISO date)
  A-->>B: 200 Me, or 409 USERNAME_TAKEN on the username field
  B->>B: Crop the picked file to a 512x512 JPEG, show it at once
  B->>A: PUT /api/v1/me/photo (FormData with photo)
  A-->>B: 200 Me with photoUrl, or 400 INVALID_PHOTO, or 413 FILE_TOO_LARGE
  B->>B: The router reloads getMe, the new photoUrl replaces the preview
  B->>S: GET photoUrl (a link signed for an hour)
```

- The client sends `FormData` as multipart and leaves the content type, with its boundary, to the
  browser.
- The cropped preview stays until `getMe` brings the new `photoUrl`, so the avatar never flickers
  back to the old photo.

## 11. Reset a forgotten password

The website calls them through `@ari/data-access` (`requestPasswordReset`, `checkPasswordReset`,
`resetPassword`), never refreshing on a 401: the user is signed out, and a 401 is a bad link.

```mermaid
sequenceDiagram
  participant B as Browser on /forgot-password
  participant A as ari-api
  participant I as The user's inbox
  participant R as Browser on /reset-password
  B->>A: POST /api/v1/auth/password-reset (login: a username or email), refresh false
  alt No account has that username or email
    A-->>B: 404 ACCOUNT_NOT_FOUND
    B->>B: "No account has that username or email", with a link to /register
  else The account has no email
    A-->>B: 409 NO_EMAIL
    B->>B: Nowhere to send a link: add an email in Settings › Account while still logged in
  else Its email isn't confirmed yet
    A-->>B: 409 EMAIL_NOT_CONFIRMED
    B->>B: Open the confirm link first, then ask again
  else Too many
    A-->>B: 429 RATE_LIMITED
  else Sent
    A-->>B: 204
    B->>B: "Check your email" toast
    A-)I: The reset email, at the confirmed email, link valid 30 minutes
  end
  I->>R: The user opens /reset-password?code=…
  R->>A: POST /api/v1/auth/password-reset/check (code), while the server renders
  alt 200 username
    A-->>R: Choose a new password, for that username
  else 410 CODE_EXPIRED, 410 CODE_USED, 401 INVALID_CODE or 400 VALIDATION_FAILED
    A-->>R: Expired, already used, or doesn't work, each with a way on
  end
  R->>A: POST /api/v1/auth/password-reset/confirm (code, password)
  A-->>R: 204, or the same code errors
  R->>R: Go to /login, which fills in the username and says the password changed
```

- Asking for a link says why none was sent: no account with that username or email
  (`ACCOUNT_NOT_FOUND`), an account without an email (`NO_EMAIL`), or one whose email is still
  pending (`EMAIL_NOT_CONFIRMED`; a pending email never gets a reset link). This tells anyone
  whether a username or email has an account; usernames are public through
  `/auth/username-available` already, and `RATE_LIMITED` keeps anyone from trying many emails.
- Checking doesn't use the code up, so the page checks while the server renders; only confirm
  does. A code error on confirm (the link expired while the form was open) shows the same page as
  on opening it.
- `/login` gets the username in the history state rather than the address, so it never lands in a
  bookmark or a shared link; the page reads it once mounted, as the server never sees that state.
- Saving the new password ends every session of the account, the website's and the extension's.
  The save revalidates no query, so the page doesn't check the now used link again before it moves
  on to `/login`.
- Limits: 20 requests an hour from one address, and the account's emails (reset and verify links
  together) 1 a minute, 5 a day; both answer `RATE_LIMITED`.

## 12. Sources

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as ari server
  participant A as ari-api
  B->>W: GET /sources (cookies)
  par The cards
    W->>A: GET /api/v1/sources
    A-->>W: 200 PageResponse (each source with its counts, colors, newest highlight, first and latest save; nextCursor), 40, latest saved from first
  and The tabs
    W->>A: GET /api/v1/sources/counts
    A-->>W: 200 total and per kind
  end
  W-->>B: Streamed HTML with the data in it
  B->>A: GET /api/v1/sources?cursor=... (the end of the cards in view)
  B->>A: GET /api/v1/sources?kind=FILE (the Files tab; the cards stay until it answers)
  B->>W: GET /sources/{id}
  par The source
    W->>A: GET /api/v1/sources/{id}
    A-->>W: 200 the source with what is saved from it, or 404 NOT_FOUND
  and Its saves
    W->>A: GET /api/v1/saves?source={id}&order=PAGE
    A-->>W: 200 PageResponse, in page order
  end
  W-->>B: Streamed HTML
  B->>A: GET /api/v1/saves?source={id} (Newest first), then &cursor=... as the end comes into view
```

- `features/sources/queries.ts` holds the queries (`getSourcePage`, `getSourceCounts`,
  `getSource`, `getSourceSaves`). Like the Library's, they answer `failed` instead of throwing, so
  the page shows its error state with Try again. `getSource` answers null for a 404 (or a 400, an
  id ari-api could not have made): the "isn't in your Library" page.
- A source whose saves were all deleted leaves the list. Changing or deleting a save marks the
  Sources queries stale, so they load again the next time a Sources page shows.
- The sidebar's Sources count is how many sources the Library's facets list (they count over the
  whole Library and refresh after every change); the page's tabs use `/sources/counts`.
- Each source comes with the notes quoting its saves (the card's "In a note", "Quoted in"); a save's
  own "In a note" comes from the notes list's `saveIds` (section 13).

## 13. Notes

```mermaid
sequenceDiagram
  participant B as Browser
  participant W as ari server
  participant A as ari-api
  B->>W: GET /notes/{id} (cookies)
  par The list, on every signed-in page
    W->>A: GET /api/v1/notes
    A-->>W: 200 every note (title, saveIds, empty, createdAt, updatedAt), the one changed most recently first
  and The open note
    W->>A: GET /api/v1/notes/{id}
    A-->>W: 200 the note's blocks, each quote with its save, or 404 NOT_FOUND
  end
  W-->>B: Streamed HTML with the data in it
  B->>B: Hydrate, then make the note's draft
  B->>A: POST /api/v1/notes (New note, Add to note's new note, Duplicate)
  A-->>B: 201 the note, then GET /api/v1/notes again
  B->>B: Typing changes the draft at once: "Saving…"
  B->>A: PUT /api/v1/notes/{id} (title and every block), 700 ms after the typing stops
  A-->>B: 200, "Saved", or "Not saved · Try again"
  B->>A: DELETE /api/v1/notes/{id}
  A-->>B: 204, then GET /api/v1/notes again
```

- `features/notes/queries.ts` holds the queries (`getNotes`, `getNote`) and the actions
  (`createNoteAction`, `saveNoteAction`, `deleteNoteAction`). The queries answer `failed` instead of
  throwing, so the page shows its error state with Try again; `getNote` answers null for a 404 (or
  a 400): the "isn't in your Notes" page.
- The page keeps a draft of each note it opened and sends the whole note, which replaces what
  ari-api had. A note's saves go one at a time, each with the newest draft, so an older one never
  lands last. A hidden tab saves at once; Add to note to an existing note loads it (when it isn't
  open), quotes the save at its end and saves at once.
- A quote is a save's id; ari-api answers each with the save as it is now, and the page shows the
  Library's copy when it has one (with this visit's color and comment changes). A save deleted here
  leaves the note's quotes, and deleting it marks the notes queries stale.
- Changing a note's quotes marks the Sources queries stale, as they show the notes quoting them.
