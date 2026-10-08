# Ari sequences

Last updated 2026-10-08. This copy keeps only what the website, the `ari` server and the extension
send and receive. The server-side steps (database, queues, webhooks) are documented in ari-api.
The rules the UI relies on are in [architecture.md](architecture.md).

1. [Register or sign in (F1)](#1-register-or-sign-in-f1)
2. [Token refresh (F1)](#2-token-refresh-f1)
3. [Sign in with Google (F9)](#3-sign-in-with-google-f9)
4. [Server-rendered library page (F2)](#4-server-rendered-library-page-f2)
5. [Save and delete a highlight, free limit (F3, F4)](#5-save-and-delete-a-highlight-free-limit-f3-f4)
6. [PDF or Word import (F11)](#6-pdf-or-word-import-f11)
7. [Save from the extension (F13)](#7-save-from-the-extension-f13)
8. [Paddle checkout (F15)](#8-paddle-checkout-f15)

## 1. Register or sign in (F1)

```mermaid
sequenceDiagram
  participant B as Browser
  participant A as ari-api
  alt Register
    B->>A: POST /api/v1/auth/register (email, password, displayName)
  else Sign in
    B->>A: POST /api/v1/auth/login (email, password)
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
  B->>W: GET /library/{folderId}?q=spring (cookies)
  W->>W: Middleware: ari_access present, or refresh first (section 2)
  Note over B,W: No cookies at all: 302 to /login
  W->>W: Route runs createAsync with deferStream, @ari/data-access forwards the Cookie header
  par Folders
    W->>A: GET /api/v1/folders
    A-->>W: 200 FolderResponse list
  and Highlights
    W->>A: GET /api/v1/highlights?folderId={folderId}&q=spring
    A-->>W: 200 PageResponse (items, nextCursor), 50 per page
  end
  W-->>B: Streamed HTML with the data in it
  B->>B: Hydrate
  B->>A: GET /api/v1/highlights?q=spring boot (typing, credentials include)
  A-->>B: 200 PageResponse
  B->>A: GET /api/v1/highlights?q=spring boot&cursor=... (Load more)
  A-->>B: 200 next page
```

- `ari-api` returns only the signed-in user's data. A folder id that belongs to someone else returns
  404 `NOT_FOUND`.
- `nextCursor` is opaque: send it back as `cursor` for the next page. It is null on the last page.
- Typing in the search box waits about 300 ms, then updates `?q=` in the URL, so a reload renders the
  same results on the server.
- `q` matches the highlight text and source title. F10 turns it into full-text search behind the
  same endpoint.

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

## 6. PDF or Word import (F11)

```mermaid
sequenceDiagram
  participant B as Browser on /import
  participant A as ari-api
  B->>A: POST /api/v1/imports (multipart file, PDF or DOCX)
  alt Wrong type or too big
    A-->>B: 400 VALIDATION_FAILED
  else Accepted
    A-->>B: 202 ImportJobResponse (QUEUED)
    loop Every 2 seconds until DONE or FAILED
      B->>A: GET /api/v1/imports/{id}
      A-->>B: 200 ImportJobResponse (status, highlightsCount)
    end
  end
```

- A job goes `QUEUED` → `PROCESSING` → `DONE` or `FAILED`, with an error code when it fails.
- An import is all or nothing: if its highlights don't fit under the free limit, none are saved and
  the job fails with `LIMIT_REACHED`.
- F5 (mock, phase 1): `POST /imports` ignores the file and returns a `DONE` job with 0 highlights.
- Photos are not imported here: OCR runs in the browser (F12) and saves through `POST /highlights`.

## 7. Save from the extension (F13)

```mermaid
sequenceDiagram
  participant X as Extension
  participant T as Website tab
  participant A as ari-api
  Note over X,A: Connect once
  X->>T: Open /extension/connect on the website
  T->>A: POST /api/v1/auth/extension/code (cookies, signed in)
  A-->>T: 200 with the code
  T->>X: The content script on /extension/connect passes the code
  X->>A: POST /api/v1/auth/extension/token (code)
  alt Missing or expired
    A-->>X: 401 UNAUTHORIZED
  else Found
    A-->>X: 200 accessToken, refreshToken, expiresIn
    X->>X: Keep the tokens in browser.storage.local
  end
  Note over X,A: Save a highlight
  X->>A: POST /api/v1/highlights (Bearer token, kind TEXT, text, source fields, jumpLink)
  A-->>X: 201 HighlightResponse, or 403 LIMIT_REACHED
  Note over X,A: Access token expired
  X->>A: POST /api/v1/auth/extension/refresh (refreshToken)
  A-->>X: 200 new pair
```

- The code works once, for 60 seconds. If the tab is signed out, `/extension/connect` sends the user
  to `/login` first and then comes back.
- The extension calls `ari-api` from its background script, which has host permission for the API,
  so it needs no CORS entry.
- The extension builds `jumpLink` as a text-fragment URL (`#:~:text=`). Clips (F14) use the same
  `POST /highlights` with `kind CLIP` and `contentMd`.

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
