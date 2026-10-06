# PipeBook

Voice-first jobs, invoices, service reminders and Making-Tax-Digital-ready
records for solo UK plumbers. See [docs/PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)
for the who, what and why.

Built with Expo (React Native) + expo-router + zustand. Data is stored locally on
the device (AsyncStorage), so the app works fully offline.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS), or press `w` to
open it in a browser.

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
| `store/bookStore.ts` | Persisted app state |
