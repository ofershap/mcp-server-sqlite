import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import path from "node:path";
import { z } from "zod";
import type { TableInfo } from "./sqlite.js";
import { query, schema, tableInfo, explain, listDatabases } from "./sqlite.js";

function formatQueryResult(
  columns: string[],
  rows: Record<string, unknown>[],
): string {
  if (columns.length === 0 && rows.length === 0) {
    return "(No columns returned)";
  }
  if (columns.length === 0) {
    return `(${rows.length} row(s) affected)`;
  }
  const widths = columns.map((col) =>
    Math.max(col.length, ...rows.map((r) => String(r[col] ?? "").length)),
  );
  const sep = widths.map((w) => "-".repeat(w)).join("-+-");
  const header = columns.map((c, i) => c.padEnd(widths[i] ?? 0)).join(" | ");
  const lines = [header, sep];
  for (const row of rows) {
    const line = columns
      .map((c, i) => String(row[c] ?? "").padEnd(widths[i] ?? 0))
      .join(" | ");
    lines.push(line);
  }
  return lines.join("\n");
}

function formatSchema(schemaInfo: {
  tables: {
    name: string;
    columns: {
      name: string;
      type: string;
      notnull: boolean;
      pk: boolean;
      defaultValue: string | null;
    }[];
    rowCount: number;
  }[];
  totalTables: number;
}): string {
  const lines: string[] = [`Schema: ${schemaInfo.totalTables} table(s)`, ""];
  for (const t of schemaInfo.tables) {
    const colSpecs = t.columns.map((c) => {
      let spec = `${c.name} (${c.type})`;
      if (c.pk) spec += " PK";
      if (c.notnull) spec += " NOT NULL";
      if (c.defaultValue != null) spec += ` DEFAULT ${c.defaultValue}`;
      return spec;
    });
    lines.push(`### ${t.name} (${t.rowCount} rows)`);
    lines.push(colSpecs.map((s) => `  - ${s}`).join("\n"));
    lines.push("");
  }
  return lines.join("\n").trimEnd();
}

const server = new McpServer({
  name: "mcp-server-sqlite",
  version: "1.0.0",
});

server.tool(
  "query",
  "Execute a SQL query against a SQLite database. Returns results as a formatted table. Read-only by default.",
  {
    db: z.string().describe("Path to the .db or .sqlite file"),
    sql: z.string().describe("SQL query to execute"),
    readonly: z
      .boolean()
      .default(true)
      .describe("If true, only SELECT/PRAGMA/EXPLAIN allowed"),
  },
  async ({ db, sql, readonly }) => {
    try {
      const resolved = path.resolve(db);
      const result = query(resolved, sql, readonly);
      const text = formatQueryResult(result.columns, result.rows);
      return {
        content: [
          {
            type: "text",
            text: `Rows: ${result.rowCount}\n\n${text}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "schema",
  "Get the schema of a SQLite database: all tables with columns and row counts.",
  {
    db: z.string().describe("Path to the .db or .sqlite file"),
  },
  async ({ db }) => {
    try {
      const resolved = path.resolve(db);
      const schemaInfo = schema(resolved);
      const text = formatSchema(schemaInfo);
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "table_info",
  "Get detailed info about a single table: columns, types, constraints, and row count.",
  {
    db: z.string().describe("Path to the .db or .sqlite file"),
    table: z.string().describe("Table name"),
  },
  async ({ db, table }) => {
    try {
      const resolved = path.resolve(db);
      const info = tableInfo(resolved, table);
      const colSpecs = info.columns.map((c: TableInfo["columns"][number]) => {
        let spec = `${c.name} (${c.type})`;
        if (c.pk) spec += " PK";
        if (c.notnull) spec += " NOT NULL";
        if (c.defaultValue != null) spec += ` DEFAULT ${c.defaultValue}`;
        return spec;
      });
      const text = [
        `### ${info.name} (${info.rowCount} rows)`,
        "",
        ...colSpecs.map((s: string) => `- ${s}`),
      ].join("\n");
      return { content: [{ type: "text", text }] };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "explain",
  "Explain the query plan for a SQL query (EXPLAIN QUERY PLAN). Helps optimize queries.",
  {
    db: z.string().describe("Path to the .db or .sqlite file"),
    sql: z.string().describe("SQL query to explain"),
  },
  async ({ db, sql }) => {
    try {
      const resolved = path.resolve(db);
      const plan = explain(resolved, sql);
      return {
        content: [{ type: "text", text: `Query plan:\n${plan}` }],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

server.tool(
  "list_databases",
  "List all SQLite database files (.db, .sqlite, .sqlite3) in a directory.",
  {
    directory: z
      .string()
      .default(".")
      .describe("Directory path to scan (default: current directory)"),
  },
  async ({ directory }) => {
    try {
      const resolved = path.resolve(directory);
      const dbs = listDatabases(resolved);
      if (dbs.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No .db, .sqlite, or .sqlite3 files found in ${resolved}`,
            },
          ],
        };
      }
      const text = dbs.map((p: string) => `- ${p}`).join("\n");
      return {
        content: [
          {
            type: "text",
            text: `Found ${dbs.length} database(s):\n\n${text}`,
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${err instanceof Error ? err.message : String(err)}`,
          },
        ],
        isError: true,
      };
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
