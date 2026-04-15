# lw-mcp

MCP (Model Context Protocol) server for Lightweight. Exposes your workout data as tools that AI assistants like Claude Desktop can call directly in conversation.

Ask Claude "how's my bench press trending?" and it pulls your actual data.

## How it works

`lw-mcp` is a thin wrapper around the Lightweight API. It authenticates as you, exposes read-only query tools over stdio, and returns JSON that Claude interprets conversationally.

```
Claude Desktop  <--stdio-->  lw-mcp  <--HTTP-->  Lightweight API
```

## Tools

| Tool | Description |
|---|---|
| `list_exercises` | All exercises with muscle group and equipment |
| `list_templates` | Workout templates with exercise counts |
| `get_template` | Template detail with target sets/rep ranges |
| `list_sessions` | Recent sessions with date and status |
| `get_session` | Full session detail with exercises and sets |
| `analytics_report` | Watched exercise e1RM history, trends, movers, frequency |
| `analytics_summary` | All exercises with e1RM, trend, last trained, session count |
| `analytics_exercises` | Exercise list with session counts |
| `e1rm_progression` | e1RM over time for a specific exercise |
| `e1rm_movers` | Biggest e1RM gainers and losers |
| `weekly_volume` | Volume by muscle group |
| `exercise_volume` | Per-exercise volume (sets, reps, tonnage) |
| `session_frequency` | Sessions per week |
| `stale_exercises` | Exercises not trained recently |
| `watchlist` | Current watched exercises |

All tools are read-only.

## Setup

### 1. Build

```sh
cargo build -p lightweight-mcp --release
```

Binary lands at `target/release/lw-mcp`.

### 2. Authenticate

If you've already used the CLI (`lw login`), you're done — `lw-mcp` reads the same config at `~/.config/lightweight/cli.toml`.

Otherwise, set environment variables:

```sh
export LW_SERVER_URL=https://lightweight.3rigby.xyz
export LW_AUTH_TOKEN=your-bearer-token
```

### 3. Configure Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "lightweight": {
      "command": "/absolute/path/to/lw-mcp"
    }
  }
}
```

Or pass credentials via env if you haven't run `lw login`:

```json
{
  "mcpServers": {
    "lightweight": {
      "command": "/absolute/path/to/lw-mcp",
      "env": {
        "LW_SERVER_URL": "https://lightweight.3rigby.xyz",
        "LW_AUTH_TOKEN": "your-bearer-token"
      }
    }
  }
}
```

Restart Claude Desktop to pick up the new server.

## Auth

`lw-mcp` resolves credentials in this order:

1. `LW_SERVER_URL` / `LW_AUTH_TOKEN` environment variables
2. `~/.config/lightweight/cli.toml` (written by `lw login`)

Each user's token scopes all queries to their own data.
