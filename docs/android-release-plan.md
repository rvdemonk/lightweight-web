---
Document Context:
  Created: 2026-04-12
  Source: Discussion about Android app architecture, distribution strategy, and Play Store publishing
  Status: BINDING PLAN
  Purpose: Step-by-step plan from current state to Android app on Play Store with user migration from web
---

# Android Release Plan

Native Kotlin/Compose app hitting the existing Rust/Axum backend. Local-first SQLite on device, server handles auth and (future) premium sync. Distribution via Play Store closed testing, seeded from existing web app users.

---

## Architecture

- **Android app**: Kotlin + Jetpack Compose, local SQLite on device
- **Shared logic**: `lightweight-calc` crate exposed via UniFFI to Kotlin (e1RM, trends, PR detection, validation)
- **Server**: Rust/Axum stays as-is — handles registration, invite validation, login. No changes needed for v1
- **Web frontend**: Continues serving current users; becomes premium desktop analytics view long-term

## Distribution Strategy

### Phase 1: Web App Seeding (now)
- Olly distributes invite links to his colleagues
- Users onboard via web app at lightweight.3rigby.xyz
- Accounts and workout data accumulate on the server

### Phase 2: Android Build + Closed Testing
1. Google Play Console developer account ($25 USD one-time) — registering now
2. Build signed AAB (`./gradlew bundleRelease`)
3. Upload to **closed testing** track — produces a shareable join link, no need to collect individual emails
4. Google reviews the build (~1-3 days first time)
5. Once approved, add a banner/popup in the web app linking to the Play Store closed testing URL
6. Existing web users tap the link, install, log in with the same credentials

### Phase 3: Production Launch
1. Iterate on closed testing feedback — fix bugs, polish UX
2. Prepare store listing: screenshots, description, privacy policy URL, content rating, data safety declaration
3. Promote to production release — fresh public listing
4. Closed testing users leave day-one reviews

## Premium Tier (future)

- **Free**: Android app, local SQLite, works fully offline
- **Premium**: Server sync + desktop web analytics (advanced progression charts, volume trends, periodisation)
- Revenue covers server costs for sync infrastructure
- Web frontend stops receiving investment as primary UX; becomes premium desktop dashboard

## Open Questions

- Privacy policy: need a hosted page (could be a static page on the droplet)
- App signing key management: where to store the keystore securely
- Deep links for invite codes: Android intent filters for `/join/:code` URLs
