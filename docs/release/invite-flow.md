---
Document Context:
  Created: 2026-04-14
  Source: Discussion about invite distribution for Play Store closed testing and production
  Status: DRAFT PLAN
  Purpose: Design for invite-based user acquisition that works across closed testing and production
---

# Invite Flow

Invite-based registration that bridges the web and native app installs. The existing Lightweight web app hosts invite landing pages that present both the invite code and the app store download link.

---

## User Journey

1. Existing user generates an invite in-app (or web)
2. Shares the link: `lightweight.3rigby.xyz/join/ABC123`
3. New user taps link → opens invite landing page on the web
4. Page shows:
   - Invite code with prominent **copy to clipboard** button
   - Play Store download link (CTA)
   - Brief app description / branding
5. New user copies code, taps Play Store link, installs
6. Opens app → Create Account → pastes invite code → registers
7. Social graph edge recorded (who invited whom)

## Why Not Play Install Referrer?

The Play Install Referrer API can silently pass a referrer string through the Play Store install flow — no typing needed. However:

- **Closed testing**: The opt-in link (`play.google.com/apps/testing/...`) doesn't support the `&referrer=` parameter. Users must opt in before the app is visible, so the referrer link and install are separate steps.
- **Production**: Referrer works seamlessly. One link, silent code injection.

### Phased approach

- **Closed testing (now)**: Web landing page with copy-to-clipboard. Simple, works immediately.
- **Production (later)**: Add referrer API as an enhancement. The invite page detects if the app is likely not installed (Android user agent, no app link handler) and redirects to Play Store with `&referrer=invite_CODE`. If the referrer arrives, skip the code field. If not (enterprise accounts, edge cases), fall back to manual paste. The landing page remains the canonical share link either way.

## What Exists Today

- Server: invite CRUD (`POST /api/v1/invites`, `GET /api/v1/invites`)
- Server: invite validation (`GET /api/v1/auth/join/:code`)
- Server: invite-based registration (`POST /api/v1/auth/join/:code`)
- Web: `/join/:code` page with validation + registration form
- Android: registration screen with invite code field

## What Needs Building

- [ ] Web: redesign `/join/:code` page as an invite landing page with copy-to-clipboard + Play Store link
- [ ] Android: invite management screen (create invite, see list, share link)
- [ ] Production (later): Install Referrer API integration for silent code injection
