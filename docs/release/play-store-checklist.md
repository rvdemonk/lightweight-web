---
Document Context:
  Created: 2026-04-14
  Updated: 2026-04-15
  Source: Audit of Android app for Google Play closed testing submission
  Status: REFERENCE
  Purpose: Checklist of non-code tasks Lewis needs to complete for Play Store submission
---

# Play Store Submission Checklist

Non-code items required for closed testing and eventual production launch. Code items (signing config, registration, OAuth, password reset) tracked separately.

---

## Closed Testing (must complete before first upload)

### Privacy Policy
- [x] Write a privacy policy page covering: data collected (username, password hash, workout data), where stored (your server at 170.64.189.221), no third-party sharing, no analytics/tracking, contact info
- [x] Host as a static HTML page on the droplet (`https://lightweight.3rigby.xyz/privacy.html`)
- [ ] Enter the URL in Play Console under App content > Privacy policy

### Data Safety Form
- [ ] Complete in Play Console under App content > Data safety
- [x] Pre-draft answers ready (docs/release/data-safety-answers.md)

### Google Play Developer Account
- [x] Register at https://play.google.com/console ($25 USD one-time)
- [x] Identity verification complete (individual, "clovis", Account ID 8023872526424149014)

### Store Listing (minimal for closed testing)
- [x] App name: "Lightweight"
- [x] Short description drafted (docs/release/store-listing-draft.md)
- [x] Full description drafted (docs/release/store-listing-draft.md)
- [x] App icon: 512x512 PNG (docs/release/app-icon-512.png)
- [x] Feature graphic: 1024x500 PNG (docs/release/feature-graphic-1024x500.png)
- [ ] 2-3 phone screenshots (take from device during a workout session)
- [ ] App category: Health & Fitness
- [x] Contact email: 3rigby@proton.me

### Content Rating
- [ ] Complete the IARC questionnaire in Play Console (takes ~5 minutes, mostly "no" answers for a workout tracker)

### Build & Upload
- [x] Release signing configured (keystore.properties, R8/minification)
- [ ] Build signed AAB (`./gradlew bundleRelease`)
- [ ] Upload AAB to Play Console closed testing track

### Closed Testing Gate
- [ ] Recruit 12 testers (must provide email addresses)
- [ ] Testers must remain active for 14 continuous days
- [ ] Only then can production or open testing be requested

## Production Launch (Phase 3, not needed for closed testing)

- [ ] Content rating certificate
- [ ] Target audience declaration
- [ ] Ads declaration (no ads)
- [ ] More polished screenshots (multiple device sizes)
- [ ] Promotional text
