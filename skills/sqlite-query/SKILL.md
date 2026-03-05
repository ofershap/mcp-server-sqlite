---
name: sqlite-query
description: Query SQLite databases, inspect schemas, and explain queries via MCP. Use when working with local SQLite databases.
---

# SQLite Query via MCP

Use this skill when you need to query SQLite databases, inspect schemas, or optimize queries. Read-only by default for safety.

## Available Tools

| Tool             | What it does                                                             |
| ---------------- | ------------------------------------------------------------------------ |
| `query`          | Execute SQL (SELECT, PRAGMA, EXPLAIN, WITH). Returns results as a table. |
| `schema`         | Full schema: all tables with columns, types, and row counts              |
| `table_info`     | Detailed info for a single table: columns, constraints, row count        |
| `explain`        | Run EXPLAIN QUERY PLAN for query optimization                            |
| `list_databases` | List .db, .sqlite, .sqlite3 files in a directory                         |

## Workflow

1. `list_databases` to find .db files in the project
2. `schema` to understand the full database structure
3. `table_info` for detailed column info on specific tables
4. `query` to run SELECT queries and inspect data
5. `explain` to optimize slow queries

## Key Patterns

- Read-only by default — only SELECT, PRAGMA, EXPLAIN, and WITH are allowed
- Pass `readonly: false` in tool args to enable INSERT, UPDATE, DELETE
- `schema` returns everything at once — use it first to understand the database
- `query` returns tabular results — ideal for exploration and debugging
- Database path is passed per-tool call, not globally configured

## Safety

- Read-only mode is on by default — no accidental mutations
- Confirm with the user before enabling write mode (`readonly: false`)
- Large result sets are truncated — use LIMIT in queries for efficiency
