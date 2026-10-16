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

## Standing constraints
- Frontend API base is hardcoded to production api.okccarmeets.com (utils/api.ts).
- Native/launcher/store icon changes require a fresh binary build (not OTA).
- Do not change slug away from oklahoma-city-car-meets (linked EAS project).
