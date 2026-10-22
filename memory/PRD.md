# Streetmotion Official — PRD / Working Notes

Mobile-first Expo/React Native app + FastAPI/MongoDB backend for Oklahoma City automotive
events & community (events, RSVPs, garages, clubs, crews, nearby map, talent, messaging,
notifications, admin tools, OCR flyers, routes, GPS timer). Frontend points to the
PRODUCTION backend at api.okccarmeets.com.

## Latest work (June 2026) — Native crash fixes ("kicks user out")

User reported that, even after an OTA, two screens still crashed on their native build:
1. Opening the Clubs section.
2. Opening an individual public garage from the Public Garages page.

### Root causes found & fixed (JS-only, OTA-eligible)
1. **user-garage/[userId].tsx** had a dead `useFonts({ RockSalt_400Regular })` call with NO
   imports → guaranteed `ReferenceError` crash on mount. Removed it (font 'RockSalt-Regular'
   is already loaded globally in app/_layout.tsx). This was the public-garage crash.
2. **Text-node crash class**: `{value && (<JSX/>)}` leaks a bare `0` (e.g. memberCount===0)
   or `""` (empty string field) as a direct child of a `<View>`, throwing
   "Unexpected text node: A text node cannot be a child of a <View>". On web this is only a
   console error, but on native it HARD-CRASHES the screen. This was the Clubs crash
   (clubs have memberCount:0 and website:"").

### Fix applied
Converted all risky `{value && (<JSX/>)}` short-circuits (string & number fields) to
`{value ? (<JSX/>) : null}` across: clubs/index, user-garage/[userId], garage/[id],
components/profile/CarShowcase, event/[id]/index, events/calendar, talent/[id],
(tabs)/talent, admin/pending-clubs, messages/[userId], (tabs)/home, routes/[id],
routes/index, feedback/history, admin/pending, admin/event-search, admin/talent-invites,
talent/invite/[code], admin/feedback. (Boolean guards like isActive/isRecurring left as-is.)

### Verification
testing_agent iteration_1 + iteration_2: all target screens render with ZERO
"Unexpected text node" and ZERO ReferenceError across clubs, user-garage, garage list,
garage detail, event detail, calendar, talent list & detail. Tested on 390x844 against
live prod backend via preview URL.

### Action required by user
Publish a NEW OTA update (same branch/channel as before) — the previous OTA did NOT contain
these fixes. OTA only reaches devices whose installed binary has a matching runtimeVersion.

## Approved events not showing on Events page (June 2026)

User reported: user-submitted events go to admin, get approved, but never appear on the
Events page. Root cause: approval works correctly (isApproved=True, GET /events returns all
approved). The Events page (app/(tabs)/home.tsx) default "within 20 miles of OKC" radius
filter fell back to a hardcoded city whitelist for events WITHOUT latitude/longitude.
User-submitted events have null coords unless the submitter taps "Use My Location", so any
approved event whose city wasn't in the short whitelist (Owasso, Tulsa, Stillwater, Chickasha,
blank city, venue names, etc.) was hidden. Verified against prod: 304 approved events, 280
with no coords, 138 of those hidden by the old whitelist.
Fix: in filterEvents(), events without coordinates now stay visible by default; the radius
filter only excludes events that genuinely have far-away coordinates. (Frontend-only, OTA-eligible.)

## Talent invite EMAIL sending (June 2026)

Admin "email invite" previously did nothing (backend had a literal TODO; only a code
was created, no email sent). Built real sending via Emergent-managed email:
- NEW: backend/email_service.py (send_email + guardrail gate + build_talent_invite_email
  template). Uses EMAIL_BASE_URL constant https://integrations.emergentagent.com, auth via
  X-Email-Key header -> works from the self-hosted VPS too.
- backend/routes/talent.py create_invite: if email provided, sends the invite email with
  the code + in-app instructions (no links/forms; passes the gate). Response now returns emailSent.
- frontend/app/admin/talent-invites.tsx: alert shows whether the email actually sent.
- Env vars required in backend .env: EMERGENT_EMAIL_KEY and EMAIL_FROM_NAME="StreetMotion Official".
Tested locally: POST invite with email -> emailSent True.
DEPLOY: backend changes need VPS redeploy (new file email_service.py + talent.py) AND the two
.env vars added on the VPS (.env is gitignored so it won't arrive via git pull). Frontend alert
change ships via OTA.

## Standing constraints
- Frontend API base is hardcoded to production api.okccarmeets.com (utils/api.ts).
- Native/launcher/store icon changes require a fresh binary build (not OTA).
- Do not change slug away from oklahoma-city-car-meets (linked EAS project).


## [Update] iOS OTA root cause + Image→R2 migration + scaling (this session)

### iOS OTA never applied — ROOT CAUSE FOUND & FIXED
- Dashboard proof: iOS OTA = 100% crash on boot (0 launches, 2 crashes); Android fine. iOS silently quarantines a crashing OTA and rolls back to embedded bundle.
- Root cause: stale `resolutions: { "react-native-worklets": "0.5.1" }` in package.json (from reanimated 4.1.1 era) while reanimated@4.5.1 needs worklets 0.10.x. Reanimated's startup JS↔native version check threw a fatal → OTA quarantine.
- Fix: removed the stale resolution; cleaned yarn.lock to only worklets 0.10.1; hardened module-scope notification handler in AuthContext (try/catch + new shouldShowBanner/List shape); removed startup Updates.reloadAsync() (iOS crash risk); fallbackToCacheTimeout 0→30000.
- Added temp OTA diagnostics: app/ota-debug.tsx (reads Updates.readLogEntriesAsync + checkForUpdateAsync) and a tappable green marker line on the Talent tab. REMOVE after confirmation.
- Requires a NEW iOS build (native worklets must be recompiled). Build # auto-incremented 7→8 via eas.json autoIncrement (store had 6) — expected.

### Image storage migration: base64-in-Mongo → Cloudflare R2 (public CDN)
- Reason: /api/events returned ~16.7MB (base64 photos inline) → timed out for users on weak networks; won't survive the hundreds× traffic spike the user expects.
- Backend (DONE, 13/13 backend tests pass):
  - backend/storage.py: R2 (boto3) upload helpers + normalize_photo(s) (base64→R2 URL, http passthrough, fail-safe). Env: R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET/PUBLIC_BASE_URL (set in workspace .env; MUST also be set on VPS).
  - routes/media.py: POST /api/upload (multipart→R2→{url}).
  - events.py: create/update normalize base64→R2; reads pass base_url; new serve fallback GET /api/events/{id}/photo/{i}/image.jpg for legacy base64.
  - helpers.py event_helper: _event_photo_urls never returns base64 (R2 URL passthrough or serve-endpoint URL).
  - server.py ensure_indexes(): indexes on users.email, events(isApproved,date)/userId/city, favorites, user_cars, messages, notifications, crews.members, clubs, rsvps, talent_invites.
  - migrate_events_to_r2.py: idempotent one-off to move existing base64 → R2 (run on VPS).
- Backward compatible: old clients still POST base64 (backend converts); reads return URLs that both old & new clients render. No frontend changes required for correctness.
- NOTE: R2_PUBLIC_BASE_URL is currently an r2.dev dev URL (rate-limited). For the traffic spike, recommend a Cloudflare custom domain.
- TODO (fast-follow, NOT yet done): apply same R2 pattern to talent profile photos, event_gallery, user avatars; optional frontend direct-upload via src/utils/upload.ts (write-side efficiency); infra: multiple uvicorn workers + larger Mongo pool + async push fan-out.

### VPS deploy steps for this session's backend work
1. Save to GitHub; on VPS git pull.
2. Add R2_* vars to /opt/okcarevents/backend/.env (same values entered in the secure card).
3. venv active: pip install -r requirements.txt (boto3).
4. Restart okcarevents.service.
5. Run: python migrate_events_to_r2.py (moves existing base64 events to R2).
6. Verify /api/events payload is now small.

