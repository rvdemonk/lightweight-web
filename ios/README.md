# Lightweight iOS

Native SwiftUI client. See `docs/workorders/feature-ios-port/spec.md` for the workorder.

## Setup

The `.xcodeproj` is generated, not checked in:

```sh
brew install xcodegen   # once
cd ios && xcodegen generate
open Lightweight.xcodeproj
```

Re-run `xcodegen generate` after adding/removing source files (everything under `Lightweight/` is included automatically).

- iOS 26 minimum, Swift 6 strict concurrency, GRDB 7 (SPM, resolved on first open/build)
- Signing: select your team in Xcode → target → Signing & Capabilities (device builds only; simulator needs none)

## Layout

- `App/` — entry point, app-level state (auth phase, sync)
- `Models/` — Codable DTOs mirroring the server contract (snake_case JSON; reference: `crates/core/src/models.rs`, `android/.../DataDtos.kt`)
- `Networking/` — APIClient (async URLSession), Keychain token storage
- `Store/` — GRDB database, schema mirrors the server's, flat records + queries (the repository seam)
- `Features/` — SwiftUI screens
