---
Document Context:
  Created: 2026-04-14
  Source: Play Store closed testing preparation — Data Safety form answers
  Status: REFERENCE
  Purpose: Pre-drafted answers for the Google Play Data Safety form, ready to click through
---

# Data Safety Form Answers

Pre-drafted answers for completing the Data Safety form in Play Console (App content > Data safety). Walk through each section and select the answers below.

---

## Overview Questions

**Does your app collect or share any of the required user data types?**
→ Yes

**Is all of the user data collected by your app encrypted in transit?**
→ Yes (all communication over HTTPS)

**Do you provide a way for users to request that their data is deleted?**
→ Yes (via email to 3rigby@proton.me — 30-day processing)

## Data Types Collected

### Personal info
- **Name**: No
- **Email address**: No
- **User IDs**: Yes (username)
  - Is this data collected, shared, or both? → Collected
  - Is this data processed ephemerally? → No
  - Is this data required or optional? → Required
  - Why is this data collected? → App functionality, Account management
- **Address**: No
- **Phone number**: No
- **Race and ethnicity**: No
- **Political or religious beliefs**: No
- **Sexual orientation**: No
- **Other personal info**: No

### Financial info
→ Nothing selected (none collected)

### Health and fitness
- **Health info**: No
- **Fitness info**: Yes (exercises, sets, reps, weights, session history)
  - Is this data collected, shared, or both? → Collected
  - Is this data processed ephemerally? → No
  - Is this data required or optional? → Required (it's the core product)
  - Why is this data collected? → App functionality

### Messages
→ Nothing selected

### Photos and videos
→ Nothing selected

### Audio
→ Nothing selected

### Files and docs
→ Nothing selected

### Calendar
→ Nothing selected

### Contacts
→ Nothing selected

### App activity
→ Nothing selected (no analytics)

### Web browsing
→ Nothing selected

### App info and performance
- **Crash logs**: No
- **Diagnostics**: No
- **Other app performance data**: No

### Device or other IDs
→ Nothing selected (no device identifiers collected)

## Data Sharing

**Is any of the collected data shared with third parties?**
→ No (for every data type)

## Data Handling

For each data type declared:

**User IDs (username)**
- Data is encrypted in transit → Yes
- Data can be deleted by user → Yes
- Linked to user identity → Yes

**Fitness info (workout data)**
- Data is encrypted in transit → Yes
- Data can be deleted by user → Yes
- Linked to user identity → Yes

## Additional Disclosures

**Does your app target children or comply with children's privacy laws?**
→ No, the app is not directed at children. Minimum age 13.

**Does your app contain ads?**
→ No

## Notes

- Password is not declared as a separate data type — Google considers hashed credentials part of "Account management" under User IDs
- If you add Google OAuth later, also declare "Other personal info" under Personal info for the Google account identifier
- For production launch, Google will require in-app or web-based account deletion (not just email) — plan for this before Phase 3
