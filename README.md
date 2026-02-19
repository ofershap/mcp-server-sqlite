# mcp-server-sqlite

[![npm version](https://img.shields.io/npm/v/mcp-server-sqlite.svg)](https://www.npmjs.com/package/mcp-server-sqlite)
[![npm downloads](https://img.shields.io/npm/dm/mcp-server-sqlite.svg)](https://www.npmjs.com/package/mcp-server-sqlite)
[![CI](https://github.com/ofershap/mcp-server-sqlite/actions/workflows/ci.yml/badge.svg)](https://github.com/ofershap/mcp-server-sqlite/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Query SQLite databases, inspect schemas, and explain queries directly from your AI assistant. Read-only by default for safety.

```bash
npx mcp-server-sqlite
```

> Works with Claude Desktop, Cursor, VS Code Copilot, and any MCP client. Zero auth — reads local .db files.

![Demo](assets/demo.gif)

## Tools

| Tool             | What it does                                                             |
| ---------------- | ------------------------------------------------------------------------ |
| `query`          | Execute SQL (SELECT, PRAGMA, EXPLAIN, WITH). Returns results as a table. |
| `schema`         | Get full schema: all tables with columns, types, and row counts.         |
| `table_info`     | Detailed info for a single table: columns, constraints, row count.       |
| `explain`        | Run EXPLAIN QUERY PLAN to optimize queries.                              |
| `list_databases` | List .db, .sqlite, .sqlite3 files in a directory.                        |

## Quick Start

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": ["mcp-server-sqlite"]
    }
  }
}
```

### Claude Desktop

Add to `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "sqlite": {
      "command": "npx",
      "args": ["mcp-server-sqlite"]
    }
  }
}
```

### VS Code (Copilot / MCP extension)

Configure the MCP server in your VS Code settings to run `npx mcp-server-sqlite`.

## Example prompts

- "Show me the schema of my database at ./data.db"
- "Query the users table: SELECT \* FROM users LIMIT 10"
- "Explain the query plan for this complex join"
- "What tables are in this database?"
- "Find all .db files in the current directory"

## Safety

**Read-only by default.** The `query` tool accepts only SELECT, PRAGMA, EXPLAIN, and WITH in readonly mode. Set `readonly=false` in the tool args to enable INSERT, UPDATE, DELETE, etc.

## Development

```bash
npm install
npm run typecheck
npm run build
npm test
npm run format
npm run lint
```

## Author

Ofer Shapira · [GitHub](https://github.com/ofershap)

## License

MIT
