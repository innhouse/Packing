# Family Packing — project notes (read this first)

A private family packing-list app: each family member keeps their own list
for each trip, with live sync between iPhone and web. Built the same way as
Family Rides (`innhouse/family-rides`): Expo SDK 57, web on EAS Hosting,
iPhone through TestFlight, Firebase Firestore behind it.

The owner (Amin) is not a developer. Explain changes in plain language and
ship them without asking for terminal work unless unavoidable.

## Status (2026-11-15)
- **First deploy done.** Firestore database created (northamerica-northeast2,
  Standard) and `firestore.rules` published. Web is live at
  https://family-packing.expo.app. EAS project `@ddduber/family-packing`.
- **iPhone**: build 3 submitted to TestFlight 2026-11-15, App Store Connect
  app id `6835168315` (listing name "Family Packing (da7c75)" because the
  plain name was taken; the home-screen name is still Family Packing).
  Internal group "Team (Expo)". **Expires ~2027-02-13; rebuild + resubmit
  before then.** Not yet opened on a phone.
- Reading and writing Firestore works from the web. Live sync between two
  devices has not been deliberately tested yet.
- Amin's list for the Malta trip was imported from the old web checklist
  (Claude artifact "Packing Checklist: Malta, Sicily, Naples & Budapest"),
  including its removed items.

## What it does
- **Family passcode** (added 2026-11-15, Amin's call): the first screen on a
  new device asks for it; the device then remembers it. It is the password of
  one shared Firebase Auth account (`family@family-packing.example`, see
  `src/auth.js` / `auth.web.js`), and `firestore.rules` only admits that
  account's uid, so the database refuses everyone else. Only Amin knows the
  passcode; it is not stored in the project. To change it, Amin runs
  `node scripts/set-passcode.js` in a terminal (the uid stays the same, so no
  rules change). Email/password sign-in is enabled via `firebase.json`
  (`firebase deploy --only auth`). Phone sign-in persistence has not yet been
  checked on a real iPhone.
- **Who**: pick your name once per device (no PINs). Anyone can add family members.
- **Trips** → **lists** (one per person, plus optional "Shared" lists).
- **List screen**: sections with items; tick, quantity, add, edit name/note,
  move to another section, move up/down, remove; add/rename/reorder/delete
  sections; "Removed" sheet restores items or whole sections one at a time or
  all at once; tap a heading to collapse; Sort A–Z / My order; One list (flat
  A–Z view with quantities and remove); search; Clear ticks; progress bar.
- **New list** starts from a template (`src/template.js`), a copy of any
  existing list, or text pasted from the "Copy for app" button on the web
  checklist that preceded this app.
- A brand-new database gets the "Malta, Sicily, Naples & Budapest" trip
  automatically when the first family member is added.

## Architecture in one breath
Single-file navigation in `App.js` (a `screen` state, no router), screens in
`src/screens/`. All data goes through `src/store/index.js`, which picks
`store/firestore.js` when Firebase is configured and `store/local.js`
(AsyncStorage) when it is not. Firestore: `members`, `trips`, `lists`
(sections live in the list doc as an ordered array; `total`/`done` are
denormalised for the trip screen), `lists/{id}/items` (one doc per item:
name, note, qty, checked, sectionId, order, removed, removedWithSection).

Offline: web uses Firestore's persistent cache (`src/firebase.web.js`). The
phone uses the plain JS SDK (memory cache), so `store/index.js` also keeps the
last-seen data in AsyncStorage for instant/offline opening; edits made
offline on the phone sync only if the app stays open until it reconnects.

## Rules (don't change without asking Amin)
- **Remove, never delete**: items and sections are flagged `removed` and can
  be restored. Trips and lists are flagged `hidden`.
- Sorting A–Z is a view; it never changes the saved order.
- View settings (collapsed, sort, one-list) are per device, not synced.
- No drag-and-drop yet: reordering is Move up/down in the ⋯ menu, to avoid
  native gesture libraries that could not be tested. Amin liked dragging in
  the web checklist; add it once the app runs on a phone.

## First deploy (DONE 2026-11-15; kept for reference. Steps 4–6 are the routine ones)
Apple sign-in for builds/submits must run in an interactive terminal; if the
"Get Verification Code" route fails, choose **sms** for the six-digit code.
1. Firebase (project `family-packing-ba2c3`, already in `.firebaserc`): the
   Firestore database has **not been created** (the console's location picker
   would not open on Amin's phone). Create it first:
   `firebase firestore:databases:create "(default)" --location northamerica-northeast2`
   (Standard edition; check `firebase firestore:databases:list` first in case
   he created it by hand since). Then publish the rules with
   `firebase deploy --only firestore:rules` (or paste `firestore.rules` into
   the console's Rules tab). Then test sync between two browsers.
2. `npm install`, then `npx eas-cli init` (Expo account `ddduber`) to create
   the EAS project; it writes `extra.eas.projectId` into `app.json`.
3. `npx expo install expo-updates` is already satisfied; run
   `npx eas-cli update:configure` so `updates.url` is added to `app.json`.
4. Web: `npx expo export --platform web; npx eas-cli deploy --prod`
   → https://family-packing.expo.app (or the name EAS assigns).
5. iPhone: `npx eas-cli build -p ios --profile production`, then
   `npx eas-cli submit -p ios --latest`. First submit creates the App Store
   Connect app (bundle id `ca.bc.innhouse.familypacking`); put its id in
   `eas.json` under `submit.production.ios.ascAppId`. Add testers to the
   internal TestFlight group. TestFlight builds expire after 90 days.
6. Later JS-only changes ship over the air:
   `npx eas-cli update --channel production --environment production --message "..."`

## Gotchas inherited from Family Rides
- Never touch `window.*` outside `Platform.OS === "web"`.
- `Alert.alert` does nothing on web; use `confirmAction` in `src/ui.js`.
- `window.confirm` is silently blocked in some embedded browsers (the Claude
  desktop browser pane), so on web `confirmAction` shows its own dialog via
  `<ConfirmHost />` in `App.js`. Don't go back to `window.confirm`.
- Lists can be hidden from the list screen ("Remove this list"); there is no
  in-app way to un-hide one (set `hidden: false` on the `lists` doc).
