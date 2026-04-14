---
Document Context:
  Created: 2026-04-14
  Source: Audit of Android app for Google Play closed testing submission
  Status: REFERENCE
  Purpose: Checklist of non-code tasks Lewis needs to complete for Play Store submission
---

# Play Store Submission Checklist

Non-code items required for closed testing and eventual production launch. Code items (signing config, registration, OAuth, password reset) tracked separately.

---

## Closed Testing (must complete before first upload)

### Privacy Policy
- [ ] Write a privacy policy page covering: data collected (username, password hash, workout data), where stored (your server at 170.64.189.221), no third-party sharing, no analytics/tracking, contact info
- [ ] Host as a static HTML page on the droplet (e.g. `https://lightweight.3rigby.xyz/privacy`)
- [ ] Enter the URL in Play Console under App content > Privacy policy

### Data Safety Form
- [ ] Complete in Play Console under App content > Data safety
- [ ] Declare: account credentials collected (username/password), workout data collected, data stored on your server, data not shared with third parties, no analytics SDKs, data deletion available (you can delete accounts via lw-admin or add a server endpoint)
- [ ] If adding Google OAuth: also declare Google account info collected for authentication purposes

### Google Play Developer Account
- [ ] Register at https://play.google.com/console ($25 USD one-time)
- [ ] Complete identity verification (can take 1-3 days)

### Store Listing (minimal for closed testing)
- [ ] App name: "Lightweight"
- [ ] Short description (80 chars max): e.g. "Frictionless workout tracking with progressive overload"
- [ ] Full description (4000 chars max): what the app does, who it's for
- [ ] App icon: 512x512 PNG (export from adaptive icon foreground on dark background)
- [ ] Feature graphic: 1024x500 PNG (can be simple — dark background, geometric mark, wordmark)
- [ ] 2-3 phone screenshots (take from your device during a workout session)
- [ ] App category: Health & Fitness
- [ ] Contact email

### Content Rating
- [ ] Complete the IARC questionnaire in Play Console (takes ~5 minutes, mostly "no" answers for a workout tracker)

## Production Launch (Phase 3, not needed for closed testing)

- [ ] Content rating certificate
- [ ] Target audience declaration
- [ ] Ads declaration (no ads)
- [ ] More polished screenshots (multiple device sizes)
- [ ] Promotional text
