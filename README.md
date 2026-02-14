# Lightweight

Single-user workout tracker optimized for frictionless mobile logging. Rust backend + React frontend, single binary deployment.

## Features

- Progressive overload tracking
- One-handed mobile use between sets
- NGE-influenced dark aesthetic
- Single-user, self-hosted, no cloud dependencies

## Tech Stack

- **Backend**: Rust (Axum + SQLite)
- **Frontend**: React + TypeScript (Vite)
- **Deployment**: Single binary with embedded frontend

## Development

### Prerequisites

- Rust (via rustup)
- Node.js 18+

### Backend

```bash
cargo run -p lightweight-server
```

Runs on port 3000. Configure via:
- `LW_DB_PATH` - database location (default: `./dev.db`)
- `LW_PORT` - server port (default: `3000`)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on port 5173, proxies `/api` to backend.

### Type Checking

```bash
cargo check
cd frontend && npx tsc --noEmit
```

## Building for Production

```bash
# Build frontend first (rust-embed requires dist/)
cd frontend && npm run build && cd ..

# Build single binary
cargo build --release -p lightweight-server
```

Binary includes embedded frontend assets.

## Database

SQLite migrations in `migrations/`. Applied automatically on server start.
