# PipeBook

Voice-first jobs, invoices, service reminders and Making-Tax-Digital-ready
records for solo UK plumbers. See [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
for the who, what and why.

Built with Expo (React Native) + expo-router + zustand. Data is stored locally on
the device (AsyncStorage), so the app works fully offline. With an account, every
change is also backed up to Firebase (Auth + Firestore) whenever there's signal.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `w` to
open it in a browser.

## Switch on accounts & cloud backup (Firebase)

Until this is done the app works offline-only and Settings says backup isn't set up.

1. Go to https://console.firebase.google.com, **Add project**, call it `pipebook`
   (Google Analytics not needed).
2. **Build > Authentication > Get started > Email/Password > Enable**.
3. **Build > Firestore Database > Create database**, location `europe-west2 (London)`,
   start in **production mode**.
4. In Firestore's **Rules** tab, paste the contents of [`firestore.rules`](firestore.rules)
   and **Publish**. (Each plumber can only read and write their own data.)
5. **Project settings (gear) > General > Your apps > Web (`</>`)**, register an app
   called `PipeBook`, and copy the `firebaseConfig` values into `app.json` under
   `expo.extra.firebase`, replacing each `REPLACE_ME`.
6. Restart `npx expo start`. Settings now shows **Create account / Log in**.

The web config values aren't secret (they're shipped in every app build); the
Firestore rules are what protect the data.

### Testing locally without a real Firebase project

Run the emulators (needs Java): `npx firebase-tools emulators:start --only auth,firestore --project demo-pipebook`,
then put demo values in `expo.extra.firebase` (`"projectId": "demo-pipebook"`, any `apiKey`)
plus `"emulatorHost": "127.0.0.1"`. Don't commit that.

### How backup works

- Every change on the phone is timestamped and queued (`store/bookStore.ts`).
- A few seconds after a change, and whenever the app opens, `lib/cloudSync.ts`
  pulls the account's data, merges it with the queue (`lib/syncMerge.ts`, newest
  edit wins, invoice numbers never go backwards), uploads what's left, and clears
  the queue. No signal? It retries every minute and on next open.
- Anything logged before creating an account is uploaded on first sign-in.
- Logging out removes the data from the phone (it comes back on login), and
  warns first if anything hasn't backed up yet.

## Checks

```bash
npm run typecheck
npm test
```

## Layout

| Path | What |
|---|---|
| `app/(tabs)/index.tsx` | Jobs list + quick job entry |
| `app/job/[id].tsx` | Job detail, charges, send invoice, mark paid |
| `app/(tabs)/reminders.tsx` | Annual service / CP12 reminders |
| `app/(tabs)/money.tsx` | MTD quarter summary + expenses |
| `app/(tabs)/settings.tsx` | Rates, trading name, bank details |
| `lib/quickEntry.ts` | Parses "Mrs Smith, replaced tap, 1 hour, £85 parts" |
| `lib/taxQuarters.ts` | MTD quarters, deadlines, cash-basis summaries |
| `lib/reminders.ts` | Builds 12-month repeat-work reminders |
| `lib/pricing.ts` | Hourly labour, per-job rates and commission on parts |
| `components/ChargesEditor.tsx` | Job charges: rate, hours, commission, add a charge |
| `app/parts.tsx` | Import / manage supplier price lists |
| `lib/priceList.ts` | CSV parsing, header/column detection, VAT on import |
| `lib/partsSearch.ts` | "Used before" parts and search across price lists and standard parts |
| `data/standardParts.ts` | Built-in list of common UK plumbing parts (no prices) |
| `lib/priceListSync.ts`, `store/priceListStore.ts` | Price list storage and backup (chunked) |
| `lib/documentHtml.ts` | Invoice / quote PDF layout |
| `lib/shareDocument.ts` | Renders the PDF and opens the share sheet |
| `lib/cloudSync.ts`, `lib/syncMerge.ts` | Cloud backup and merge rules |
| `components/AccountCard.tsx` | Sign up / log in / backup status |
| `store/bookStore.ts` | Persisted app state |
