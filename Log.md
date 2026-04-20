# Log

Newest entry first. Keep short-term progress here. Do not store durable rules.

## 2026-04-20 - AI Chat v0.2 Final Wrap-Up

### Done

- Confirmed the latest production chat streaming behavior on `https://blog.dawn1127.com/network-engineer/chat`.
- Confirmed `Admin-Control-Panel.hta` desktop behavior no longer has popup storm or first-refresh timeout issues.
- Synced the project handoff docs so `0.2` status no longer points at already-finished verification tasks.
- Added `.playwright-cli/` to `.gitignore` so local browser-verification artifacts stay out of git.

### Files Changed

- `.gitignore`
- `README.md`
- `Log.md`

### Validation

- User confirmed production chat streaming verification is complete.
- User confirmed `Admin-Control-Panel.hta` verification is complete.
- `git status --short` should no longer surface `.playwright-cli/` as an untracked artifact after the ignore update.

### Blockers

- No blocker remains for the `AI Chat v0.2` wrap-up.

### Next

- Define the first actual capability to build inside `Network PM Automation`.

## 2026-04-20 - Win11 Repo Encoding Governance

### Done

- Standardized the repo text-encoding policy for Win11 and Windows PowerShell 5.1 compatibility.
- Added `.editorconfig` and `.gitattributes` so the repo now has explicit text/eol guardrails instead of relying on editor defaults.
- Normalized all tracked text files to the final policy:
  - default: UTF-8 without BOM
  - exceptions: `README.md`, `Log.md`, `Memory.md`, and `*.ps1` use UTF-8 with BOM
- Updated `Memory.md` so future memory workflows treat the memory handoff files and PowerShell-sensitive files with the new encoding policy.

### Files Changed

- `.editorconfig`
- `.gitattributes`
- `README.md`
- `Log.md`
- `Memory.md`
- tracked repo text files normalized for encoding policy compliance

### Validation

- Node scan confirmed the tracked-text-file policy is consistent across the repo:
  - `README.md`, `Log.md`, `Memory.md`, and `*.ps1` are UTF-8 with BOM
  - other tracked text files are UTF-8 without BOM
- Windows PowerShell 5.1 `Get-Content` checks on `README.md`, `Log.md`, and `Memory.md` no longer showed visible mojibake
- Re-read `.editorconfig` and `.gitattributes` after normalization to confirm the guardrails were saved correctly

### Blockers

- No blocker for the encoding governance itself.
- The repo still relies on workflow discipline rather than an automated encoding audit, so future drift is less likely but not impossible.

### Next

- Keep the production chat streaming verification as the main product next step.
- If encoding drift appears again, consider adding a lightweight encoding audit command to the repo verify flow.

## 2026-04-20 - Chat Empty-State Garbled Text Hotfix

### Done

- Confirmed the latest Chat empty-state mojibake was not caused by provider data, bootstrap recovery, or database state.
- Traced the visible garbled text to three corrupted source strings in `src/components/chat-workspace.tsx`.
- Applied a minimal hotfix that only restored the affected Chat copy:
  - `尚未配置可用模型`
  - `有什麼可以幫你？`
  - `可以貼上截圖、拖入圖片，或加入文件一起問。`

### Files Changed

- `src/components/chat-workspace.tsx`
- `Log.md`

### Validation

- UTF-8 direct file read confirmed the three Chat strings are now stored as correct Chinese text.
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- User manually hard-refreshed `http://localhost:3000/network-engineer/chat` and confirmed the empty-state title, description, and no-model status render correctly.

### Blockers

- No blocker for this hotfix after manual browser verification.

### Next

- Return to the higher-priority pending manual verification of the latest production chat streaming behavior.

## 2026-04-20 - Provider And Chat Bootstrap Self-Heal

### Done

- Added a shared client-side bootstrap fetch helper with `cache: "no-store"`, retryability classification, and retry backoff for startup-time reads.
- Upgraded `ProviderAdmin` so provider/model initialization now auto-retries on startup failures, shows a visible loading or failed banner, and exposes a manual reload button instead of silently rendering an empty selector.
- Reworked `ChatWorkspace` bootstrap to retry startup reads and surface a clear recovery state in the header and empty state, so startup-time fetch failures no longer masquerade as an empty configuration.

### Files Changed

- `src/lib/client/bootstrap.ts`
- `src/components/provider-admin.tsx`
- `src/components/chat-workspace.tsx`
- `src/app/globals.css`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local API checks confirmed `/api/admin/providers` and `/api/models` returned the expected provider and model data after the bootstrap changes.
- The temporary `Probe Plan Only` provider was removed after confirming it had no model, conversation, message, or run references.

### Blockers

- No code blocker remains for this bootstrap change.
- A full browser-level verification of the startup failure-then-auto-recovery path is still pending; current confidence comes from code validation, API checks, and database cleanup.

### Next

- Keep the higher-priority production chat streaming verification as the main next step; if another startup-time empty state appears, manually verify that Settings and Chat recover without a full page refresh.

## 2026-04-20 - Compose Visibility Fix And Codex Markdown Alignment v2

### Done

- Added a chat-only `Inter` font strategy in the root layout and scoped it to assistant chat content, message meta/status/actions, and Markdown prose so the visible chat surface reads closer to Codex without changing the rest of the app shell.
- Tightened the assistant Markdown surface again by reducing header chrome, lowering syntax color saturation, softening inline code, and making table and blockquote treatments read more like neutral reading furniture than UI cards.
- Prepared the compose preview flow so the current working tree can be rebuilt into `network-ai-web` and verified from `localhost:3000`, addressing the earlier mismatch where local compose was still serving an older frontend build.

### Files Changed

- `src/app/layout.tsx`
- `src/components/chat-workspace.tsx`
- `src/app/globals.css`
- `Log.md`

### Validation

- `.\scripts\status-local.ps1 -Format Json` confirmed local dev and worker are not running, while compose remains the active preview target on `localhost:3000`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `.\scripts\start-compose.ps1`
- `docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"` confirmed `network-ai-web` and `network-ai-worker` were recreated and serving the new build from `localhost:3000`
- Browser verification on `http://localhost:3000/network-engineer/chat` after login:
  - desktop screenshot confirmed the compose-served chat now shows the thinner code header, lower-contrast `Copy` button, narrower prose, and softer blockquote/table treatment
  - mobile screenshot confirmed the same Markdown fixture remains readable without obvious overflow or card-like chrome

### Blockers

- No functional blocker after the compose rebuild.
- Exact pixel-for-pixel parity with Codex is still constrained by the existing app shell, font fallback for CJK glyphs, and the fact that this repo does not have Codex's private design tokens.

### Next

- If another parity pass is needed, the next highest-yield refinements are the surrounding chat shell density and a slightly tighter sidebar/list rhythm, not the Markdown renderer itself.

## 2026-04-20 - Markdown Styling Refinement Toward Codex

### Done

- Tightened the assistant Markdown typography toward a more Codex-like reading feel by reducing decorative emphasis, darkening body copy, and dialing heading scale back from the previous richer pass.
- Simplified code block chrome so the container, header, and copy button read as neutral product UI instead of a designed card, while keeping soft syntax highlighting and stable `Copy / Copied / Retry` states.
- Reduced saturation across syntax colors, links, blockquote treatment, inline code, and table framing so the whole Markdown surface feels more restrained and content-first.

### Files Changed

- `src/components/chat-workspace.tsx`
- `src/app/globals.css`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- Browser re-check on `http://localhost:3000/network-engineer/chat` with the existing Markdown fixture conversation:
  - desktop screenshot confirmed closer Codex-like hierarchy for heading, body copy, nested list, inline code, and links
  - desktop screenshot confirmed calmer code block treatment with reduced visual chrome

### Blockers

- No functional blocker.
- Exact pixel-for-pixel parity with Codex is still limited by font stack, shell layout, and the fact that this app is not using Codex's private design system, but the Markdown layer is now materially closer.

### Next

- If another pass is needed, compare against a few more real Codex replies and decide whether to further shrink heading scale or soften syntax colors.

## 2026-04-20 - Hybrid Markdown Upgrade v2

### Done

- Upgraded assistant Markdown rendering to a calmer reading layout with prose-width constraints for headings, paragraphs, lists, and blockquotes, while letting code blocks, tables, and rules use the full assistant message width.
- Reworked code blocks into a product-style component with `prism-react-renderer`, soft light syntax highlighting, stable `Copy / Copied / Retry` button states, `TEXT` fallback labeling, and horizontal scroll instead of line wrapping.
- Refined inline code, links, tables, blockquotes, and assistant message spacing so long Chinese replies read more like a premium AI product and less like default Markdown output.
- Kept the existing `react-markdown + remark-gfm` pipeline and did not change any API, schema, or message wire format.

### Files Changed

- `package.json`
- `package-lock.json`
- `src/components/chat-workspace.tsx`
- `src/app/globals.css`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Browser verification on `http://localhost:3000/network-engineer/chat` after login:
  - rendered a Markdown-heavy assistant reply with heading, long Chinese paragraph, nested list, inline code, code blocks, table, blockquote, and `hr`
  - desktop viewport checks confirmed improved prose rhythm, code-block chrome, table density, and editorial blockquote styling
  - mobile viewport checks confirmed no obvious overflow in code block, table, blockquote, summary paragraph, or composer area

### Blockers

- No functional blocker from this Markdown upgrade pass.
- Visual tuning can continue later if a stronger product signature is desired, but the current pass already clears the “default Markdown” look.

### Next

- Compare this local Markdown rendering against the external production chat after the next deploy.
- Use one or two real long-form assistant answers to judge whether syntax colors or table density need another small polish pass.

## 2026-04-19 - Chat Streaming Handoff Wrap

### Done

- Implemented process-local background continuation for chat replies after browser leave/switch, with partial assistant content persisted during streaming.
- Added explicit run cancel support through `POST /api/chat/runs/:runId/cancel` and wired the conversation-level Stop action to cancel active run ids.
- Kept extended-thinking requests on streaming when the selected model supports streaming, while documenting the user-facing behavior honestly in the Smart menu.
- Updated the Smart menu thinking-strength copy so `標準` explains gradual output and `加長思考` explains the wait-then-final-answer behavior.
- Rebuilt compose production so `blog.dawn1127.com` is using the current app image.

### Files Changed

- `src/app/api/chat/route.ts`
- `src/app/api/chat/runs/[runId]/cancel/route.ts`
- `src/app/api/conversations/[conversationId]/messages/route.ts`
- `src/components/chat-workspace.tsx`
- `src/app/globals.css`
- `src/lib/chat/active-runs.ts`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `.\scripts\start-compose.ps1`
- Smoke checks:
  - `http://localhost:3000/login` returned `200`
  - `https://blog.dawn1127.com/login` returned `200`
  - compose rebuilt and restarted `network-ai-web` and `network-ai-worker`

### Blockers

- Real browser verification is still needed for the full chat behavior:
  - `加長思考` should show the expected wait-then-output behavior.
  - A/B concurrent replies should keep partial content after leaving and returning.
  - Stop should cancel all active replies in the selected conversation and persist the stopped state.
- Background continuation is still process-local only; it does not survive web container restart, deploy rebuild, or process crash.

### Next

- On `https://blog.dawn1127.com/network-engineer/chat`, manually verify:
  - send one `加長思考` prompt and confirm the Smart menu explanation matches the observed output timing
  - send A, then send B while A is streaming, leave the conversation, return, and confirm partial content is retained and polling resumes
  - press Stop with multiple active replies and confirm the stopped state persists after reload
- If manual chat verification passes, update the latest open blocker in `Log.md`; if it fails, capture Network requests for `/api/chat`, `/api/conversations/:id/messages`, and `/api/chat/runs/:runId/cancel`.

## 2026-04-19 - Extended Streaming And Background Chat Resume

### Done

- Changed extended-thinking chat requests to use streaming whenever the selected model supports streaming.
- Decoupled browser response cancellation from provider generation so leaving or switching the page no longer aborts the server-side run.
- Added throttled partial assistant-message persistence during streaming, with final flushes on completion and failure.
- Added an in-memory active run registry plus `POST /api/chat/runs/:runId/cancel` for explicit Stop/cancel behavior.
- Updated chat hydration to include run ids and merge persisted streaming content without overwriting locally live replies.
- Added polling for persisted streaming replies that no longer have a local live reader, so returning to a conversation can pick up DB partial content.

### Files Changed

- `src/app/api/chat/route.ts`
- `src/app/api/chat/runs/[runId]/cancel/route.ts`
- `src/app/api/conversations/[conversationId]/messages/route.ts`
- `src/components/chat-workspace.tsx`
- `src/lib/chat/active-runs.ts`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Blockers

- Background continuation is process-local only. It does not survive web container restart, deploy rebuild, or process crash.
- Browser-level verification on mobile/production is still pending after rebuild.

### Next

- Rebuild the running compose service and verify:
  - extended-thinking replies stream token by token
  - A/B concurrent replies keep partial content after leaving and returning
  - Stop cancels all active replies in the selected conversation and persists the stopped state

## 2026-04-19 - Concurrent Replies In One Conversation

### Done

- Refactored the chat workspace from conversation-level busy locking to reply-level in-flight tracking.
- Allowed the same conversation to accept new prompts while older assistant replies are still streaming.
- Added per-reply controller/timer handling so multiple assistant bubbles can stream independently without overwriting each other.
- Kept a first-message safety lock for brand-new draft conversations until the real conversation id is returned.
- Unlocked the composer, quick replies, attachment controls, and model/thinking selectors during active streaming.
- Added a conversation-level `Stop` control that aborts all in-flight replies for the active conversation.
- Updated hydrate behavior to merge persisted messages without overwriting local in-flight assistant bubbles.

### Files Changed

- `src/components/chat-workspace.tsx`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Blockers

- Browser-level runtime verification for multi-reply streaming is still pending after the state-model refactor.

### Next

- Rebuild the running app instance and verify:
  - send A, then send B before A completes
  - both assistant bubbles stream independently
  - `Stop` aborts all active replies in the same conversation
  - attachments from A are not carried into B

## 2026-04-19 - Native Form Login For Mobile Stability

### Done

- Replaced the login page fetch-based submission flow with a native HTML form post to `/api/auth/login`.
- Updated `/api/auth/login` to support both JSON requests and form submissions without changing the existing JSON response contract.
- Added `303 See Other` redirect handling for form login success and failure so the browser, not client-side JavaScript, owns the post-login navigation.
- Switched form login redirects to relative `Location` headers so reverse-proxied external logins do not get redirected to `localhost`.
- Simplified login failure feedback into server-rendered `/login` messages for timeout, invalid credentials, and lockout cases.
- Cleaned up the login form labels/button text after replacing the previous client-side implementation.

### Files Changed

- `src/components/login-form.tsx`
- `src/app/api/auth/login/route.ts`
- `src/app/login/page.tsx`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Local form login smoke:
  - `POST http://localhost:3000/api/auth/login` with form data returned `303 -> /`
  - invalid credentials returned `303 -> /login?error=invalid`
  - repeated failures returned `303 -> /login?error=locked`
- JSON login contract smoke:
  - success returned `200 {"ok":true}`
  - invalid credentials returned `401 {"ok":false,"code":"invalid_credentials",...}`
  - lockout returned `429 {"ok":false,"code":"login_locked",...,"retryAfterSeconds":60}`
  - existing session cookie behavior remained intact
- Login page rendering smoke:
  - `/login?error=invalid` rendered the invalid-credentials message
  - `/login?error=locked` rendered the lockout message
  - authenticated access to `/login` redirected back to `/`
- External production smoke through Nginx Proxy Manager:
  - `POST https://blog.dawn1127.com/api/auth/login` with form data returned `303 -> /`
  - authenticated requests to `https://blog.dawn1127.com/` and `/settings` both returned `200`

### Blockers

- Real mobile Safari and Chrome verification is still required.

### Next

- Re-test the login flow on a real phone against `https://blog.dawn1127.com/login`.
- If mobile still fails, capture the form `POST /api/auth/login` and the first follow-up `GET /` request from the device for comparison against the passing desktop/external smokes.

## 2026-04-19 - Mobile Login Full-Page Redirect

### Done

- Changed login success handling in `src/components/login-form.tsx` from App Router client navigation to `window.location.replace("/")`.
- Kept the existing login API call, lockout handling, validation messages, and submit-button double-submit protection unchanged.
- Chose full-page navigation intentionally so mobile Safari and Chrome do not depend on the first post-login SPA navigation seeing the fresh session cookie immediately.

### Files Changed

- `src/components/login-form.tsx`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- Local login API smoke:
  - `POST http://localhost:3000/api/auth/login` returned `200`
  - `/api/auth/session` returned `authenticated: true`
  - `network_ai_session` cookie was present after login

### Blockers

- Real mobile browser verification is still required for Safari and Chrome.

### Next

- Run `npm run typecheck`, `npm run lint`, and a login smoke test.
- On mobile Safari and Chrome, confirm successful login now lands on `/` without the intermediate "This page couldn't load" screen.

## 2026-04-19 - Global Login Gate And Compose Production Mode

### Done

- Added `src/proxy.ts` so every UI page except `/login` and required static/API routes now requires a valid session cookie before rendering.
- Split JWT token creation/verification into a lightweight auth helper so the new proxy gate can validate sessions without pulling full DB/session dependencies into the request boundary.
- Kept existing page/API auth checks in place as the second authorization layer.
- Changed `.\scripts\start-compose.ps1` to start compose in rebuild mode so production/external startup always picks up the current app image.
- Updated README and admin runtime notes to make the local-vs-compose split explicit: local mode is for development, compose mode is for formal external/production use through Nginx Proxy Manager.

### Files Changed

- `Dockerfile`
- `src/lib/env.ts`
- `src/lib/auth/session-token.ts`
- `src/lib/auth/session.ts`
- `src/proxy.ts`
- `scripts/start-compose.ps1`
- `README.md`
- `ADMIN-RUNBOOK.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Unauthenticated HTTP probes:
  - `http://localhost:3000/` -> `307 /login`
  - `http://localhost:3000/blog` -> `307 /login`
  - `http://localhost:3000/future` -> `307 /login`
  - `http://localhost:3000/settings` -> `307 /login`
  - `http://localhost:3000/login` -> `200`
- Compose production validation:
  - `.\scripts\stop-local.ps1`
  - `.\scripts\start-compose.ps1`
  - `docker ps` confirmed `network-ai-web`, `network-ai-worker`, `network-ai-postgres`, `network-ai-redis`, and `network-ai-minio` running
  - `POST /api/auth/login` on `http://localhost:3000` returned `200`, set `network_ai_session`, and `/api/auth/session` returned `authenticated: true`
  - Authenticated `http://localhost:3000/`, `/settings`, and `/network-engineer/chat` all returned `200`
  - `POST /api/auth/login` on `http://192.168.1.20:3000` returned a valid session and authenticated `/` returned `200`
  - External HTTP check confirmed `https://blog.dawn1127.com/` redirects to `/login` and `https://blog.dawn1127.com/login` renders the login page

### Blockers

- External Nginx Proxy Manager verification still requires a manual browser pass on `https://blog.dawn1127.com`.
- Secondary open item remains: `Admin-Control-Panel.hta` desktop verification for no popup storm and no first-refresh timeout.

### Next

- In a real browser session, sign in through `https://blog.dawn1127.com/login` and verify authenticated `/`, `/settings`, and `/network-engineer/chat`.

## 2026-04-19 - GitHub Initial Push And Session Wrap

### Done

- Initialized the local git repository on `main`.
- Created the first local commit: `a643b84` with message `release: AI Chat v0.2 milestone and Network PM Automation rename`.
- Added GitHub remote `origin` at `https://github.com/dawn1127/dawn_blog.git`.
- Pushed `main` to GitHub and set local `main` to track `origin/main`.
- Confirmed the working tree was clean after the push.
- Confirmed the GitHub repo slug is `dawn_blog`; the UI display name remains `Dawn Blog`, not `Dawn_blog`.

### Files Changed

- `Log.md`
- `Memory.md`

### Validation

- `npm run verify` passed after the Dawn Blog label alignment.
- `git status --ignored` confirmed local runtime artifacts and secrets stayed ignored before the first commit.
- `git status` after push showed `main` up to date with `origin/main` and a clean working tree.

### Blockers

- No blocker for the initial GitHub push.
- Secondary open item only: `Admin-Control-Panel.hta` desktop verification for no popup storm and no first-refresh timeout.

### Next

- Next first action: define the first actual capability for `Network PM Automation`.
- Optional housekeeping: commit and push this memory wrap update after review.

## 2026-04-19 - Dawn Blog Label Alignment

### Done

- Kept the repo naming decision separate from the site brand decision.
- Aligned visible blog copy from the older personal-blog wording to `Dawn Blog`.
- Updated navigation, breadcrumb, home-page copy, blog-page kicker, metadata description, README, and Memory to use `Dawn Blog`.
- Kept `Dawn Workspace` as the top-level site brand; did not rename the whole site to `Dawn_blog`.

### Files Changed

- `src/lib/network-navigation.ts`
- `src/app/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/layout.tsx`
- `README.md`
- `Memory.md`
- `Log.md`

### Validation

- Pending static verification after this branding pass.

### Next

- If the GitHub repo is created as `dawn_blog`, keep that slug at the repo level and keep the UI display name as `Dawn Blog`.

## 2026-04-19 - AI Chat v0.2 Release Prep

### Done

- Promoted the app milestone from `0.15 / 0.15.0` to `0.2 / 0.2.0`.
- Updated UI/documentation version labels to match the `AI Chat v0.2` milestone.
- Accepted the current manual validation as sufficient for the `AI Chat v0.2` gate.
- Hardened `.gitignore` for the first local git commit by excluding local `output/`, `test-results/`, and `.codex-*.err` artifacts.
- Kept `Admin-Control-Panel.hta` desktop verification as a secondary open item, not a `0.2` blocker.

### Files Changed

- `src/lib/network-navigation.ts`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `README.md`
- `Memory.md`
- `Log.md`

### Validation

- `npm run verify`

### Blockers

- No blocker remains for the `0.2` milestone.
- Secondary open item only: `Admin-Control-Panel.hta` desktop verification for no popup storm and no first-refresh timeout.

### Next

- Decide the first actual capability to build inside `Network PM Automation`.
- Initialize the local git repo and make the first commit when ready.

## 2026-04-19 - AI Chat Positioning And Network PM Rename

### Done

- Repositioned `AI Chat` as a general-purpose tool while keeping its current canonical entry at `/network-engineer/chat`.
- Renamed the `Excel Automation` placeholder tool to `Network PM Automation`.
- Added `/network-engineer/network-pm-automation` as the canonical placeholder route for the new tool.
- Changed `/network-engineer/excel-automation` into an authenticated compatibility redirect to the new route.
- Updated the Network Engineer navigation, breadcrumb, overview copy, README, Memory, and product spec to reflect the new tool naming and AI Chat positioning.
- Kept app/package version at `0.15 / 0.15.0`; this round only prepared the route and wording changes before the later `0.2` release.

### Files Changed

- `src/lib/network-navigation.ts`
- `src/app/network-engineer/page.tsx`
- `src/app/network-engineer/excel-automation/page.tsx`
- `src/app/network-engineer/network-pm-automation/page.tsx`
- `README.md`
- `Memory.md`
- `product-spec.md`
- `Log.md`

### Validation

- `npm run verify`

### Blockers

- `Admin-Control-Panel.hta` desktop verification is still pending, but it is not part of the later `0.2` blocker set.

### Next

- After the route and wording changes were validated, promote the release milestone to `0.2 / 0.2.0`.
- Then decide the first actual capability to build inside `Network PM Automation`.

## 2026-04-19 - Site-Wide Login Entry

### Done

- Changed `/login` from a Network Engineer-biased entry to the shared site-wide sign-in page.
- Changed the login page title, body copy, and timeout copy to describe whole-site access instead of only the Network Engineer workspace.
- Changed successful login from client-side `/network-engineer/chat` redirect to `/`.
- Changed already-authenticated visits to `/login` so the server redirects to `/`.
- Updated `README.md` runtime notes to record that `/login` is the shared site-wide sign-in entry and that direct sign-in lands on `/`.
- Did not change `Admin-Control-Panel.hta` in this round; HTA remains in manual-verification status.

### Files Changed

- `src/app/login/page.tsx`
- `src/components/login-form.tsx`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Blockers

- HTA desktop verification is still pending. I was able to inspect the current HTA implementation and launch `mshta.exe`, but I did not perform the full manual click test because Docker Desktop is currently running on this machine and I did not force-stop it.
- Manual browser confirmation is still needed for:
  - direct `/login` success -> `/`
  - authenticated `/login` -> `/`
  - lockout `401` / `429` flow after the wording and redirect change

### Next

- Next first action: manually verify the shared site-wide login flow by opening `/login`, signing in, and confirming the browser lands on `/`.
- Then visit `/login` again while already authenticated and confirm the server redirects to `/`.
- After that, continue the HTA desktop verification with Docker Desktop stopped only if you want to re-check the latest `Start Local` behavior.

## 2026-04-19 - HTA Start Local Queue And Sticky Banner

### Done

- Fixed `Admin-Control-Panel.hta` so `Start Local` is no longer silently ignored when a background status refresh is already running.
- Added a single-slot `pendingAction` queue for Start/Restart/Stop while `refreshInFlight` is active; the latest queued action now replaces the previous queued action.
- Added `lastFreshReport` and changed queued actions to consume the just-finished fresh status report instead of launching a second refresh.
- Added sticky banner state tracking so Docker preflight and action failure messages stay visible across auto-refresh cycles instead of disappearing immediately.
- Changed refresh failure handling so queued actions are dropped, buttons are re-enabled, and the refresh error remains visible without auto-running later.
- Kept Docker preflight behavior thin: when Docker is not ready, the panel shows the guidance, tries to open Docker Desktop, and stops there.

### Files Changed

- `Admin-Control-Panel.hta`
- `Log.md`

### Validation

- Extracted the HTA `<script>` block and parsed it with Node: `HTA script parse OK`
- PowerShell parser check for `scripts/status-local-runner.ps1`
- `scripts/status-local-runner.ps1` temp-file smoke:
  - `EXIT=1`
  - `STDOUT_LEN=5611`
  - `STDERR_LEN=0`

### Blockers

- Desktop manual verification is still required for the exact user-facing flow:
  - click `Start Local` while the initial auto-refresh is still running
  - confirm the busy text changes immediately
  - confirm the Docker guidance banner stays visible across later auto-refresh cycles

### Next

- With Docker Desktop stopped, double-click `Admin-Control-Panel.hta` and click `Start Local` immediately while the first refresh is still running.
- Confirm three things only:
  - the panel shows `Waiting for current status refresh...`
  - after refresh finishes, the Docker guidance banner stays visible
  - the panel does not silently swallow the click anymore

## 2026-04-19 - Login Lockout And Control Panel Start Repair

### Done

- Added login brute-force protection with continuous-failure lockouts: 3 failures -> 1 minute, 6 failures -> 5 minutes, 9+ failures -> 15 minutes.
- Added Redis-backed login lockout state with single-process in-memory fallback when Redis is unavailable.
- Changed `/api/auth/login` to return JSON for success, invalid credentials, and lockout responses, including `Retry-After` for `429`.
- Added dummy bcrypt compare for unknown logins so invalid-account and invalid-password attempts follow the same lockout path.
- Updated the login form to parse JSON errors, show lockout countdown feedback, and disable submit while a lockout timer is active.
- Added `local-action-runner.ps1` so the HTA control panel can capture stdout, stderr, and exit code for Start/Restart/Stop actions.
- Changed `Admin-Control-Panel.hta` so `Start Local` runs a fresh status preflight, shows the Docker failure reason, opens Docker Desktop when available, and stops instead of failing silently.
- Hardened `status-local-runner.ps1` and `local-action-runner.ps1` so they always write temp output files even when the child process fails early.

### Files Changed

- `src/lib/auth/login-lockout.ts`
- `src/app/api/auth/login/route.ts`
- `src/components/login-form.tsx`
- `Admin-Control-Panel.hta`
- `scripts/local-action-runner.ps1`
- `scripts/status-local-runner.ps1`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- PowerShell parser check for `scripts/local-action-runner.ps1` and `scripts/status-local-runner.ps1`

### Blockers

- Manual browser/runtime verification is still pending for the actual lockout timing flow (`401`, `429`, countdown unlock, successful-login reset).
- `Admin-Control-Panel.hta` still needs a fresh desktop click test for the new `Start Local` Docker preflight path and for action stderr/stdout visibility.

### Next

- Next first action: with Docker Desktop stopped, double-click `Admin-Control-Panel.hta`, click `Start Local`, and confirm the banner explains the Docker issue and opens Docker Desktop instead of silently failing.
- After Docker shows Running, click `Refresh Status`, then `Start Local`, and confirm the app and worker start normally.
- In a normal browser session, intentionally fail login enough times to confirm the 3 / 6 / 9+ lockout ladder, then log in successfully once to confirm the counter resets.

## 2026-04-18 - Auto Logout And Attachment Preview

### Done

- Changed auth session lifetime to a 10-minute sliding JWT/cookie session.
- Added `GET /api/auth/session` and `POST /api/auth/refresh`.
- Added global inactivity monitoring in `SiteFrame`, including throttled refresh, cross-tab `lastActivityAt` sync, cross-tab logout sync, and timeout redirect to `/login?reason=timeout`.
- Added active top-nav `登出` action for authenticated users.
- Added timeout copy on `/login?reason=timeout`.
- Changed Chat image history attachments from new-tab preview to an in-page dark overlay modal with centered image, body scroll lock, close/Escape/overlay dismiss, and bottom `儲存` download action.
- Changed non-image Chat history attachments so the full attachment card directly downloads via `/api/files/{fileId}/download`.
- Added localStorage activity broadcast throttling so mouse movement does not spam cross-tab storage events.

### Files Changed

- `src/lib/auth/session.ts`
- `src/app/api/auth/session/route.ts`
- `src/app/api/auth/refresh/route.ts`
- `src/components/site-frame.tsx`
- `src/app/login/page.tsx`
- `src/components/chat-workspace.tsx`
- `src/app/globals.css`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Playwright browser smoke:
  - authenticated `/network-engineer/chat` shows top-nav `登出`.
  - image attachment opens an in-page modal with `儲存` download link.
  - `Escape` closes the image modal.
  - document attachment renders as a direct `/api/files/{fileId}/download` link.
  - active logout clears the session and returns to `/login`.
  - `/login?reason=timeout` shows `已閒置超過 10 分鐘，請重新登入。`.
- Browser console showed only React DevTools / HMR development messages during the smoke check.

### Blockers

- No code blocker for this feature.
- Highest-priority open verification: real 10-minute idle wait and two-tab activity/logout sync have not been manually time-soak tested yet.
- Secondary open item: `Admin-Control-Panel.hta` still needs fresh desktop double-click verification for popup storm and first-refresh timeout behavior.

### Next

- Next first action: run `memory load`, start or confirm the local app with `.\scripts\status-local.ps1`, then do one manual two-tab browser smoke for auth/attachment behavior.
- Verify that activity in one tab updates the other, logout in one tab redirects the other, and a real 10-minute idle period redirects to `/login?reason=timeout`.
- After that, return to the runtime-ops track and reopen `Admin-Control-Panel.hta` to verify only two things: no popup storm and no first-refresh timeout.

## 2026-04-18 - Memory Sync

### Done

- Synced durable rules from the navigation-frame and versioning work into `Memory.md`.
- Added the long-term URL/navigation framework: global nav + breadcrumb + Network Engineer internal nav.
- Added the version strategy: current `0.15`, next routine `0.16`, larger milestone `0.2`, stable release `1.0`.
- Added a UTF-8 safety rule for editing Chinese source/docs.

### Files Changed

- `Memory.md`
- `Log.md`

### Validation

- Read `README.md`, `Log.md`, and `Memory.md` before editing.
- Confirmed the latest `Log.md` Chinese text is valid UTF-8 with Node.
- No secrets or credentials were written.

### Blockers

- None for memory sync.
- The project-level open item remains: `Admin-Control-Panel.hta` still needs fresh desktop double-click verification for popup storm and first-refresh timeout behavior.

### Next

- In the next chat, run `memory load`.
- Then reopen `Admin-Control-Panel.hta` and verify only two things: no popup storm and no first-refresh timeout.

## 2026-04-18 - Global Navigation Frame and Version 0.15

### Done

- Added a shared global top navigation frame with Home, Dawn blog, Network Engineer, and future development links on every UI page.
- Added breadcrumb context for section and tool pages, including `首頁 / Network Engineer / AI Chat` and `首頁 / Settings`.
- Added a Network Engineer section shell so AI Chat, Excel Automation, and future Network Engineer tools share one internal navigation surface.
- Moved Network Engineer tool links out of the Chat conversation sidebar; the Chat sidebar now focuses on conversations, Projects, new chat, and the Settings gear.
- Repositioned Settings as a tool page with its own tabs and a `返回 AI Chat` link, without making Settings a product section.
- Set app/package version to `0.15.0` and UI/documentation display version to `0.15`.
- Added an app icon so browser validation no longer reports a missing favicon.

### Files Changed

- `package.json`
- `package-lock.json`
- `src/lib/network-navigation.ts`
- `src/components/site-frame.tsx`
- `src/components/network-engineer-shell.tsx`
- `src/components/chat-workspace.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/network-engineer/page.tsx`
- `src/app/network-engineer/chat/page.tsx`
- `src/app/network-engineer/excel-automation/page.tsx`
- `src/app/network-engineer/future/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/globals.css`
- `src/app/icon.svg`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `.\scripts\status-local.ps1` -> `Overall: OK`.
- HTTP smoke while logged out:
  - `/`, `/blog`, `/future` -> `200`.
  - `/network-engineer`, `/network-engineer/chat`, `/network-engineer/excel-automation`, `/network-engineer/future`, `/settings` -> `307`.
  - `/chat` -> `404`.
- Playwright desktop smoke:
  - `/` shows global nav and `v0.15`.
  - `/network-engineer/chat` shows global nav, breadcrumb, Network Engineer internal nav, Chat conversation sidebar, Settings gear, and no `AI Tools`.
  - `/settings?tab=providers` shows global nav, `首頁 / Settings`, `工具頁`, tabs, and `返回 AI Chat`.
- Playwright mobile smoke:
  - `390px` Chat viewport has no horizontal overflow.
  - Mobile `Menu` opens the global section links without horizontal overflow.

### Blockers

- None for the navigation frame and version change.
- The project-level open item remains: `Admin-Control-Panel.hta` still needs fresh desktop double-click verification for popup storm and first-refresh timeout behavior.

### Next

- Reopen `Admin-Control-Panel.hta` from the desktop and verify only two things: no popup storm and no first-refresh timeout.
- If either HTA issue remains, switch the control panel to manual `Refresh Status` as the safe fallback before resuming other UI work.

## 2026-04-18 - Website Structure Restructure

### Done

- Reworked `/` into a public top-level section hub for Dawn blog, Network Engineer, and future development.
- Added public placeholder pages for `/blog` and `/future`.
- Added protected Network Engineer routes: `/network-engineer`, `/network-engineer/chat`, `/network-engineer/excel-automation`, and `/network-engineer/future`.
- Moved the active AI Chat UI to `/network-engineer/chat`; old `/chat` now returns 404.
- Removed `AI Tools` from Chat and Settings navigation.
- Kept `/settings` as the settings tool route and left `/artifacts`, `/admin/providers`, and `/admin/system` as compatibility redirects to Settings tabs.
- Updated login redirects, sidebar Settings gear, local status links, start script output, HTA default links, README, and admin runbook paths for the new Chat URL.

### Files Changed

- `src/lib/network-navigation.ts`
- `src/app/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/future/page.tsx`
- `src/app/network-engineer/page.tsx`
- `src/app/network-engineer/chat/page.tsx`
- `src/app/network-engineer/excel-automation/page.tsx`
- `src/app/network-engineer/future/page.tsx`
- `src/app/chat/page.tsx`
- `src/components/chat-workspace.tsx`
- `src/app/settings/page.tsx`
- `src/components/login-form.tsx`
- `src/app/login/page.tsx`
- `src/app/admin/providers/page.tsx`
- `src/app/admin/system/page.tsx`
- `src/components/app-shell.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `scripts/runtime-common.ps1`
- `scripts/start-local.ps1`
- `Admin-Control-Panel.hta`
- `ADMIN-RUNBOOK.md`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- PowerShell parser check for `scripts/runtime-common.ps1` and `scripts/start-local.ps1`.
- `.\scripts\status-local.ps1` -> `Overall: OK`; Chat URL now checks `http://localhost:3000/network-engineer/chat`.
- HTTP smoke:
  - `/`, `/blog`, `/future` -> `200`.
  - `/network-engineer`, `/network-engineer/chat`, `/network-engineer/excel-automation`, `/network-engineer/future` while logged out -> `307 /login`.
  - `/chat` -> `404`.
  - logged-in admin `/network-engineer/chat` -> `200`, has `AI Chat`, `Excel Automation`, `以後再開發`, no `AI Tools`, and has Settings href.
  - logged-in `/artifacts`, `/admin/providers`, `/admin/system` -> redirect to matching `/settings` tabs.
- Edge headless DOM smoke confirmed `/` renders Dawn Workspace, Dawn blog, Network Engineer, and future-development sections.

### Blockers

- None for this website structure change.
- The project-level open item remains: `Admin-Control-Panel.hta` still needs fresh desktop double-click verification for popup storm and first-refresh timeout behavior.

### Next

- Reopen `Admin-Control-Panel.hta` from the desktop and verify only two things: no popup storm and no first-refresh timeout.
- If either HTA issue remains, switch the control panel to manual `Refresh Status` as the safe fallback before resuming other UI work.

## 2026-04-18 - Shared Memory Confirm Skill Validation

### Done

- Updated the shared `project-memory-workflow` skill so `Memory confirm` is now a formal read-only command.
- Defined `Memory confirm` as a no-chat-history cold-load check using only `README.md -> Log.md -> Memory.md`.
- Added PASS / WARNING / FAIL criteria, a fixed output shape, and file-role guidance for where missing handoff details should be repaired.
- Updated the skill templates so new projects include a `Resume Checklist`, `Next first action`, and long-session handoff confirm rule.
- Installed `PyYAML` into the current Windows user Python environment so the official skill validator can run.
- Fixed the shared skill files to UTF-8 without BOM after the validator hit a Windows locale decode issue.

### Files Changed

- `C:\Users\moond\.codex\skills\project-memory-workflow\SKILL.md`
- `C:\Users\moond\.codex\skills\project-memory-workflow\assets\templates\README.md`
- `C:\Users\moond\.codex\skills\project-memory-workflow\assets\templates\Log.md`
- `C:\Users\moond\.codex\skills\project-memory-workflow\assets\templates\Memory.md`
- `C:\Users\moond\.codex\skills\project-memory-workflow\agents\openai.yaml`
- `Log.md`

### Validation

- `python --version` -> Python 3.12.10.
- `python -c "import yaml; print(yaml.__version__)"` -> 6.0.3.
- `python C:\Users\moond\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\moond\.codex\skills\project-memory-workflow` -> `Skill is valid!`.
- Manual smoke confirmed `Memory confirm`, read-only wording, `Resume Checklist`, `Next first action`, long-session handoff, and skill UI metadata.

### Blockers

- None for the shared memory skill.
- The project-level open item is unchanged: `Admin-Control-Panel.hta` still needs a fresh desktop double-click verification for popup storm and first-refresh timeout behavior.

### Next

- Next first action: in the next chat, run `memory load`, reopen `Admin-Control-Panel.hta`, and verify only two things: no popup storm and no first-refresh timeout.
- If either HTA issue remains, switch the control panel to manual `Refresh Status` as the safe fallback before resuming other UI work.
- Use `Memory confirm` after future long-session wraps when the goal is to check whether a new chat can continue without conversation history.

## 2026-04-18 - HTA Local Control Panel

### Done

- Added `Admin-Control-Panel.hta` at the repo root as a double-click local control panel for Win11 admin use.
- Upgraded `status-local.ps1` to support `-Format Text|Json` while keeping CLI output and exit-code behavior.
- Added structured local status reporting in `runtime-common.ps1`, including Docker daemon, Postgres, Redis, MinIO, dev process, worker process, login URL, chat URL, and settings URL.
- Kept the HTA thin: it reads status JSON, launches the existing PowerShell scripts, and tolerates future extra checks through an `Additional checks` section.
- Fixed a PowerShell meta serialization parser bug and softened the initial HTA state so the first refresh does not show fake warnings.
- Reworked HTA status refresh to use a hidden `status-local-runner.ps1` helper that writes temp files in the background, preventing the auto-refresh loop from spawning visible PowerShell / Terminal windows while keeping status output and exit codes accurate.
- Reduced localhost probe timeout and raised HTA refresh timeout so the first status refresh completes even when the app or Docker is down.
- Confirmed the user-visible `Memory.md` content is valid; earlier shell garble was a terminal encoding/read-path issue, not damaged project memory.

### Files Changed

- `Admin-Control-Panel.hta`
- `scripts/runtime-common.ps1`
- `scripts/status-local.ps1`
- `scripts/status-local-runner.ps1`
- `README.md`
- `Log.md`
- `Memory.md`

### Validation

- PowerShell parser check for all scripts in `scripts/`.
- `.\scripts\status-local.ps1`
- `.\scripts\status-local.ps1 -Format Json`
- `.\scripts\status-local-runner.ps1`
- `npm run typecheck`
- `npm run lint`
- Runtime check result during validation: app URLs and local processes were reachable, while Docker daemon reported unavailable on this machine state.
- Worst-case local-down timing after the timeout fix: `status-local.ps1` about 6.1s and `status-local-runner.ps1` about 6.5s.
- Cold-load confirm passed after re-reading only `README.md -> Log.md -> Memory.md`; the next chat can identify the project goal, the daily runtime commands, the latest HTA control-panel work, the remaining desktop verification, and the next first action without chat history.

### Blockers

- Desktop verification is still pending on the user's machine; the latest HTA fixes are implemented but must be rechecked from a fresh double-click launch.
- The issue to verify is control-panel behavior, not red `FAIL` states. If Docker or the app is down, red status is expected; the remaining bug check is whether the panel still spawns windows or times out on first refresh.

### Next

- In the next chat, do `memory load` first.
- Then reopen `Admin-Control-Panel.hta` and verify only two things: no popup storm and no first-refresh timeout.
- If either issue remains, stop iterating on hidden refresh logic and switch the control panel to manual `Refresh Status` as the safe fallback.
- No shared memory-skill change is needed unless a future cold-load confirm fails again.

## 2026-04-18 - Admin Runtime Scripts And Runbook Rewrite

### Done

- Added script-first admin runtime controls: `start-local.ps1`, `stop-local.ps1`, `status-local.ps1`, `restart-local.ps1`, `start-compose.ps1`, and `stop-compose.ps1`.
- Added `.runtime/dev.pid` and `.runtime/worker.pid` tracking plus repo-scoped fallback process detection.
- Added compose-vs-local conflict checks so `web / worker` cannot run in both modes at the same time.
- Reworked existing PowerShell helpers to resolve paths from the repo root and improved Docker readiness errors.
- Switched PowerShell script execution to `npm.cmd` and made `check-env.ps1` tolerate noisy local Docker config warnings.
- Fixed a strict-mode startup bug in `check-env.ps1` where optional hashtable labels could throw before local mode finished bootstrapping.
- Fixed PowerShell parameter binding for scripts with switches by moving `param(...)` ahead of other statements.
- Added a local `DOCKER_CONFIG` fallback so unreadable user Docker config files do not break runtime scripts.
- Fixed `Write-TrackedPid` to avoid PowerShell's reserved `$PID` variable name and expanded fallback process matching for `npm.cmd`.
- Rewrote `ADMIN-RUNBOOK.md` into a shorter operator guide centered on the four daily local-mode commands.
- Updated `README.md` to point admins to the new script-first runtime flow.

### Validation

- PowerShell parser check for all scripts in `scripts/`.
- `.\scripts\check-env.ps1`
- `.\scripts\status-local.ps1`
- `npm run typecheck`
- `npm run lint`

### Next

- Use `.\scripts\start-local.ps1` on a fresh reboot, then confirm the status output and local window behavior match the new runbook.

## 2026-04-18 - Admin Runbook

### Done

- Added `ADMIN-RUNBOOK.md` with administrator-focused start, stop, reboot, and troubleshooting instructions.
- Documented both recommended local dev mode and backup full Docker Compose mode.
- Added a pointer to the runbook in `README.md`.

### Validation

- Verified commands and scripts against current repo files: `compose.yaml`, `scripts/first-run.ps1`, `scripts/dev-services.ps1`, `scripts/verify-app.ps1`, and `package.json`.

### Next

- Optionally add a small in-app admin help link to the runbook location for local operators.

## 2026-04-18 - OpenAI-Like UI Polish And Smart Composer

### Done

- Rendered assistant Markdown with `react-markdown` and `remark-gfm`.
- Added OpenAI-like Chat sidebar with fixed top, scrollable middle, fixed settings bottom, and desktop collapse.
- Removed conversation search from Chat sidebar.
- Added composer `智能` menu for model selection and thinking strength.
- Added `reasoningEffort` request field and mapped OpenAI Responses `standard` to `medium`, `extended` to `high`.
- Disabled Next.js dev indicator to remove the lower-left `N`.
- Unified Chat, Settings, Provider & Models, Artifacts, System Health, and Login styling toward one OpenAI-like app shell.
- Added durable memory rule: large downloads/browser runtimes should be handed to the user as commands first.

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Browser smoke with Chromium: authenticated `/chat` desktop screenshot, `/settings?tab=providers` screenshot, and mobile `/chat` screenshot were captured successfully.

### Next

- Test a real Markdown-heavy answer and one real OpenAI Responses chat with `智能 -> 延伸` to confirm provider accepts `reasoning.effort`.

## 2026-04-18 - OpenAI Native Files And Settings

### Done

- Added OpenAI-native file mode as the default document setting.
- Added `supportsNativeFiles` to models and Provider Admin model editing.
- Added `document` upload kind and broader OpenAI-style document extension support.
- Sent native files to OpenAI Responses as `input_file`; images continue as `input_image`.
- Reworked Chat sidebar bottom links into a single settings gear.
- Added unified `/settings` page for Artifacts, Provider & Models, System Health, and document settings.
- Redirected old Artifacts/Provider/System pages into `/settings` tabs.

### Validation

- `npx prisma format`
- `npm run prisma:deploy`
- `npm run prisma:generate`
- `npx prisma migrate status`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Authenticated HTTP smoke: login, `/chat`, `/settings?tab=documents`, and `/settings?tab=providers` all returned 200 with expected page content.

### Next

- Browser-level smoke still needs local browser tooling; test a real small file with a model where `Native files` is enabled.

## 2026-04-18 - Image Upload And Projects

### Done

- Added image attachments alongside spreadsheet attachments.
- Added support for pasted screenshots, drag/drop uploads, image preview chips, and message attachment history.
- Added provider content parts so OpenAI Responses and OpenAI-compatible adapters can send image input.
- Added `supportsImages` to model config and Provider Admin.
- Added single-level Chat Projects backed by `ConversationFolder`.
- Added protected image content endpoint for thumbnails.
- Updated specs and README handoff notes.

### Files Changed

- `prisma/schema.prisma`
- `prisma/migrations/0004_images_projects_attachments/migration.sql`
- `src/app/api/files/route.ts`
- `src/app/api/files/[fileId]/content/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/api/conversation-folders/route.ts`
- `src/app/api/conversation-folders/[folderId]/route.ts`
- `src/app/api/conversations/route.ts`
- `src/app/api/conversations/[conversationId]/route.ts`
- `src/app/api/conversations/[conversationId]/messages/route.ts`
- `src/app/api/models/route.ts`
- `src/app/api/admin/providers/[providerId]/models/route.ts`
- `src/app/api/admin/models/[modelId]/route.ts`
- `src/components/chat-workspace.tsx`
- `src/components/provider-admin.tsx`
- `src/lib/provider/types.ts`
- `src/lib/provider/openai-compatible.ts`
- `src/lib/provider/openai-responses.ts`
- `src/lib/provider/anthropic-messages.ts`
- `src/lib/storage/read-object.ts`
- `src/worker/parse-files.ts`
- `src/app/globals.css`
- `product-spec.md`
- `data-model.md`
- `README.md`
- `Log.md`

### Validation

- `npx prisma format`
- `npm run prisma:deploy`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run lint`
- `npx prisma migrate status`
- `npm run build`
- Browser smoke check: authenticated `/chat` loads, section links render, Project creation/delete API path works from UI flow, image upload creates a composer chip, response model header renders, and console has no errors.

### Blockers

- Real image-to-model send was not executed to avoid consuming provider quota. Enable `Images` on a vision-capable model before testing.

### Next

- Enable `Images` on the intended model and send one small screenshot through the app.

## 2026-04-18 - OpenAI-Style Chat UI

### Done

- Reworked `/chat` into a dedicated OpenAI-style chat surface instead of the admin-shell layout.
- Removed per-message requested/response model metadata; latest provider response model remains in the header.
- Removed the right-side Files panel and moved file attachment into the composer.
- Added composer `+` menu for upload and recent parsed files.
- Added attachment chips, automatic upload-on-send, parse polling, Enter-to-send, Shift+Enter newline, and a compact send icon.
- Kept conversation history, streaming chat, artifact save, and provider response model persistence.

### Files Changed

- `src/app/chat/page.tsx`
- `src/components/chat-workspace.tsx`
- `src/app/globals.css`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Browser smoke check: authenticated `/chat` loads, no right-side Files panel, header shows `response model`, composer shows `+`, compact send icon, and attachment menu shows upload/recent files.

### Blockers

- None.

### Next

- Test `+ -> 上傳檔案 -> Enter` with a small CSV/XLSX and confirm the parser worker completes before chat sends.

## 2026-04-18 - Provider Response Model Visibility

### Done

- Captured the provider response `model` field in OpenAI-compatible, OpenAI Responses, and Claude Messages adapters.
- Added `Message.providerResponseModel` so assistant messages can persist the actual provider-returned model identifier.
- Returned `providerResponseModel` from conversation message history.
- Updated Chat UI to show `requested` model and latest `response model` in the header, plus per-assistant-message response model metadata.
- Refreshed conversation history after a streamed answer completes so the persisted provider response model appears in the UI.
- Updated product/data/README handoff notes for requested model versus provider response model verification.

### Files Changed

- `src/lib/provider/types.ts`
- `src/lib/provider/openai-compatible.ts`
- `src/lib/provider/openai-responses.ts`
- `src/lib/provider/anthropic-messages.ts`
- `prisma/schema.prisma`
- `prisma/migrations/0003_add_message_provider_response_model/migration.sql`
- `src/app/api/chat/route.ts`
- `src/app/api/conversations/[conversationId]/messages/route.ts`
- `src/components/chat-workspace.tsx`
- `product-spec.md`
- `data-model.md`
- `README.md`
- `Log.md`

### Validation

- `npx prisma format`
- `npm run prisma:deploy`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run lint`
- `npx prisma migrate status`
- `npm run build`
- Browser smoke check: `/login` loads, login reaches `/chat`, and the Chat header renders `response model`.

### Blockers

- None.

### Next

- Send a small real chat request and confirm the header changes from `response model: -` or `waiting...` to the provider-returned model string.

## 2026-04-17 - Provider And Model Hard Delete

### Done

- Added admin DELETE APIs for providers and models.
- Updated deletion behavior so referenced providers/models can still be hard deleted.
- Provider deletion removes child models first; historical conversation/message/run foreign keys are set to `null`.
- Added Delete buttons to Provider Admin tables for providers and models.
- Added danger button styling and updated deletion policy docs.

### Files Changed

- `src/app/api/admin/providers/[providerId]/route.ts`
- `src/app/api/admin/models/[modelId]/route.ts`
- `src/components/provider-admin.tsx`
- `src/app/globals.css`
- `product-spec.md`
- `data-model.md`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- API smoke test created a referenced temporary provider/model/conversation/message/run, deleted model and provider through admin APIs, and confirmed provider/model foreign keys became `null`.

### Blockers

- None.

### Next

- Reconfigure providers from `/admin/providers`; use Delete for incorrect provider/model items.

## 2026-04-17 - README Handoff Review

### Done

- Reviewed whether `README.md` is sufficient for a new chat handoff.
- Added local runtime URLs, service ports, admin login handling, Docker services, and resume checklist.
- Added current provider/model metadata without secrets.
- Added next development targets for chat and Excel/CSV File Q&A.

### Files Changed

- `README.md`
- `Log.md`

### Validation

- README, Log, and Memory were read before editing.
- No secrets or plaintext API keys were written.

### Blockers

- None.

### Next

- In the next chat, start with `memory load`, then follow the README resume checklist.

## 2026-04-17 - Memory Sync

### Done

- Synced README status with the current state: official OpenAI `gpt-5.4` provider/model is configured and model metadata is visible in chat.
- Added a durable memory rule: verify model identity from requested model metadata, not from model self-identification.

### Files Changed

- `README.md`
- `Memory.md`
- `Log.md`

### Validation

- Memory files read in order: `README.md`, `Log.md`, `Memory.md`.
- No secrets or API keys were written to memory files.

### Blockers

- None.

### Next

- Continue with real `gpt-5.4` chat checks, then test Excel/CSV upload and File Q&A.

## 2026-04-17 - Requested Model Visibility

### Done

- Added requested provider/model headers to chat responses.
- Returned message provider/model metadata when loading conversation history.
- Updated Chat UI to show the selected `modelId` in the header, model selector, and assistant message metadata.
- Added small UI styling for model metadata labels.

### Files Changed

- `src/app/api/chat/route.ts`
- `src/app/api/conversations/[conversationId]/messages/route.ts`
- `src/components/chat-workspace.tsx`
- `src/app/globals.css`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`

### Blockers

- None.

### Next

- Use the visible requested model metadata instead of model self-identification when confirming whether `gpt-5.4` was requested.

## 2026-04-17 - Official OpenAI Provider Guidance

### Done

- Updated OpenAI Responses adapter so `https://api.openai.com` uses Bearer authorization while relay domains can keep raw authorization.
- Confirmed typecheck and lint after the adapter change.

### Files Changed

- `src/lib/provider/openai-responses.ts`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`

### Blockers

- None.

### Next

- Add the official OpenAI provider through `/admin/providers`, then create and validate the chosen model.

## 2026-04-17 - Provider Key GUI

### Done

- Reworked Provider Admin into clear sections for creating providers, editing providers/API keys, and creating models.
- Added GUI support for rotating provider API keys; leaving the new key field empty keeps the current encrypted key.
- Cleaned garbled Provider Admin Chinese UI text.
- Kept the CLI helper as an optional fallback, not the main workflow.

### Files Changed

- `src/components/provider-admin.tsx`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- API smoke test: login `200`, provider list `200`.

### Blockers

- None.

### Next

- Enter the exact relay API key in `/admin/providers`, add `gpt-5.4`, then validate the model connection.

## 2026-04-17 - AI Coding Relay Styles

### Done

- Added provider API styles for OpenAI Responses and Claude Messages relay endpoints.
- Kept OpenAI Chat Completions support and made base URL handling accept root URLs or `/v1` URLs.
- Added Admin UI API style selection for providers.
- Added an AI Coding 2233 helper script that prompts for the API key and upserts the Responses provider plus `gpt-5.4` model.
- Updated README and specs to reflect the broader provider adapter support.

### Files Changed

- `prisma/schema.prisma`
- `prisma/migrations/0002_add_provider_api_styles/migration.sql`
- `src/lib/provider/openai-responses.ts`
- `src/lib/provider/anthropic-messages.ts`
- `src/lib/provider/openai-compatible.ts`
- `src/lib/provider/index.ts`
- `src/app/api/admin/providers/route.ts`
- `src/app/api/admin/providers/[providerId]/route.ts`
- `src/components/provider-admin.tsx`
- `scripts/add-ai-coding-provider.ps1`
- `scripts/add-ai-coding-provider.ts`
- `README.md`
- `architecture.md`
- `product-spec.md`
- `data-model.md`
- `Log.md`

### Validation

- `npx prisma migrate deploy`
- `npm run prisma:generate`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npx prisma validate`
- API smoke test: login `200`, provider list `200`.

### Blockers

- The key read from screenshot returned `401 Unauthorized`; need a clean text copy of the key or the user can run the helper script and paste it into the hidden prompt.

### Next

- Add/validate the AI Coding 2233 provider with the exact API key, then test `gpt-5.4` streaming chat.

## 2026-04-17 - Docker Live Startup

### Done

- Confirmed Docker Desktop + WSL2 is available after Ubuntu-24.04 installation.
- Ran first-run setup successfully: compose services started, Prisma migration applied, admin user seeded.
- Started Next.js dev server on `http://localhost:3000` and file parse worker in the background.
- Created the MinIO bucket and verified authenticated health/model APIs.
- Added a small local `.env` loader for standalone worker runs.
- Tightened MinIO health check so a missing bucket fails the check instead of only appearing in detail text.

### Files Changed

- `src/lib/load-dotenv.ts`
- `src/worker/parse-files.ts`
- `src/app/api/admin/system/health/route.ts`
- `.env`
- `Log.md`

### Validation

- `docker ps` shows Postgres, Redis, and MinIO healthy.
- `npm run typecheck`
- `npm run lint`
- API smoke test: login `200`, `/api/admin/system/health` `200`, `/api/models` `200`.
- Health checks passed for server env, database, redis, and MinIO bucket.

### Blockers

- No provider/model is configured yet because no relay API key has been entered.

### Next

- Open `http://localhost:3000`, log in as the seeded admin, then add a relay provider and model under `/admin/providers`.

## 2026-04-17 - Operational Readiness

### Done

- Added `/admin/system` page and `/api/admin/system/health` for DB, Redis, MinIO, env, provider/model, user, and file queue checks.
- Added first-run and verification scripts for PowerShell: `check-env.ps1`, `first-run.ps1`, `dev-services.ps1`, and `verify-app.ps1`.
- Added `npm run verify`.
- Added file soft delete API/UI and conversation soft delete API/UI.
- Updated navigation and README status.

### Files Changed

- `src/components/app-shell.tsx`
- `src/app/admin/system/page.tsx`
- `src/components/system-health.tsx`
- `src/app/api/admin/system/health/route.ts`
- `src/app/api/files/[fileId]/route.ts`
- `src/app/api/conversations/[conversationId]/route.ts`
- `src/components/chat-workspace.tsx`
- `src/app/globals.css`
- `scripts/check-env.ps1`
- `scripts/first-run.ps1`
- `scripts/dev-services.ps1`
- `scripts/verify-app.ps1`
- `package.json`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`
- `npx prisma validate` with a local `DATABASE_URL`

### Blockers

- Docker CLI is still not installed/available in this shell, so the live compose services cannot be started here.

### Next

- Run `.\scripts\first-run.ps1` once Docker is available, then open `/admin/system` and `/admin/providers` to finish live setup.

## 2026-04-17 - Run Traceability And Artifacts

### Done

- Chat requests now create a `Run`, update it to completed/failed, and expose `x-run-id` plus `x-assistant-message-id` headers.
- Added artifact APIs for list, create, view, soft delete, and download.
- Added Chat UI action to save completed assistant responses as Markdown artifacts.
- Added `/artifacts` page and navigation entry for listing, previewing, downloading, and soft-deleting artifacts.

### Files Changed

- `src/app/api/chat/route.ts`
- `src/app/api/artifacts/route.ts`
- `src/app/api/artifacts/[artifactId]/route.ts`
- `src/app/api/artifacts/[artifactId]/download/route.ts`
- `src/components/chat-workspace.tsx`
- `src/components/app-shell.tsx`
- `src/app/artifacts/page.tsx`
- `src/components/artifact-list.tsx`
- `src/app/globals.css`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`

### Blockers

- Docker remains unavailable in the current Windows shell, so live DB/service startup is still pending.

### Next

- Start Docker services in a Docker-enabled WSL2 shell, run migrations/seed, and test the full flow with a real relay provider.

## 2026-04-17 - Provider Admin And Chat Persistence

### Done

- Added `/admin/providers` UI with provider creation, model creation, masked key display, capability flags, enable/disable controls, and model validation action.
- Added provider/model PATCH APIs for enable/disable and metadata updates with audit logging.
- Added conversation list and conversation messages APIs.
- Updated Chat UI to load persistent conversations, open saved messages, upload files, list files, and attach completed parsed files as chat context.
- Updated chat route to include parsed Excel/CSV context from owned completed files and require valid file ownership/status.

### Files Changed

- `src/components/app-shell.tsx`
- `src/components/provider-admin.tsx`
- `src/components/chat-workspace.tsx`
- `src/app/admin/providers/page.tsx`
- `src/app/api/admin/providers/[providerId]/route.ts`
- `src/app/api/admin/models/[modelId]/route.ts`
- `src/app/api/conversations/route.ts`
- `src/app/api/conversations/[conversationId]/messages/route.ts`
- `src/app/api/chat/route.ts`
- `src/app/globals.css`
- `README.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`

### Blockers

- Docker is still unavailable in the current Windows shell, so live DB/service startup remains unvalidated here.

### Next

- Run Docker Compose in WSL2/Docker-enabled shell, apply migration, seed admin, configure the first relay provider/model, and run a full login -> provider test -> chat -> file upload flow.

## 2026-04-17 - App Foundation

### Done

- Scaffolded the V1 Next.js App Router foundation in the repo root.
- Added Prisma schema and SQL migration for users, conversations, messages, files, file indexes, runs, artifacts, providers, models, and audit logs.
- Added encrypted provider secret handling, JWT session helpers, Redis rate limiting, MinIO storage helpers, OpenAI-compatible provider adapter, auth routes, chat route/UI, file upload route, and parser worker.
- Added Dockerfile, Docker Compose services, backup helper, restore notes, package scripts, and real README project map.
- Replaced vulnerable `xlsx` dependency with `exceljs` and `csv-parse`.

### Files Changed

- `package.json`
- `package-lock.json`
- `README.md`
- `.env.example`
- `.gitignore`
- `.dockerignore`
- `Dockerfile`
- `compose.yaml`
- `next.config.ts`
- `tsconfig.json`
- `eslint.config.mjs`
- `next-env.d.ts`
- `prisma/schema.prisma`
- `prisma/migrations/0001_init/migration.sql`
- `prisma/seed.ts`
- `src/`
- `scripts/backup.ps1`
- `scripts/restore-notes.md`
- `data-model.md`
- `Log.md`

### Validation

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm audit --omit=dev`
- `npx prisma validate` with a local `DATABASE_URL`

### Blockers

- Docker is not available in the current Windows shell, so `docker compose config` and live service startup were not validated.
- No real relay API/provider key has been configured yet.

### Next

- Install/enable Docker for WSL2 or run commands inside the Docker-enabled environment.
- Start Postgres/Redis/MinIO, run migrations, seed admin, and add provider admin UI.

## 2026-04-17

### Done

- Created V1 specification documents for the Network Engineer AI Platform.
- Captured product scope, architecture, data model, milestones, runtime policies, deletion policy, provider security, and testing expectations.

### Files Changed

- `product-spec.md`
- `architecture.md`
- `data-model.md`
- `milestone-v1.md`
- `Log.md`

### Validation

- Verified the four target spec files did not exist before creation.
- Added each file at repo root without overwriting existing content.

### Blockers

- None.

### Next

- Scaffold the application stack when ready: Next.js app, Docker Compose services, auth, provider admin, and chat foundation.

## YYYY-MM-DD

### Done

- 

### Files Changed

- 

### Validation

- 

### Blockers

- 

### Next

- 
