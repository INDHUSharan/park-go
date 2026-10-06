# ParkGo — Dubai smart-parking app (prototype)

Clickable prototype of the ParkGo driver app for ANPR-enabled parking sites.

- **`index.html`** — the app. Open it on a phone for the full-screen version, then use *Add to Home Screen* so it launches like an installed app.
- **`parking-app-screens.html`** — all screens side by side, grouped by journey (design reference).
- **`build-app.js`** — regenerates `index.html` from `parking-app-screens.html` after design changes: `node build-app.js`.

## Main journey
1. Get started: splash → onboarding → location permission → login (+971) → OTP → profile
2. Find a site: map / search → site details
3. Go to the site: Navigate opens Google Maps; back in the app, the map offers **Arrived? Pay now**
4. Pay & enter: select vehicle → duration → payment → enter within 15 minutes
5. Parked & leaving: live timer → extend → exit payment → receipt

Also: reserve for later, ticketing (QR) sites, My Parking history, wallet, vehicles, settings.

This is a front-end prototype only: data, payments and maps are mocked.
