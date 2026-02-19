import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
}

export interface TableInfo {
  name: string;
  columns: {
    name: string;
    type: string;
    notnull: boolean;
    pk: boolean;
    defaultValue: string | null;
  }[];
  rowCount: number;
}

export interface SchemaInfo {
  tables: TableInfo[];
  totalTables: number;
}

function openDb(dbPath: string): Database.Database {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database file not found: ${dbPath}`);
  }
  return new Database(dbPath, { readonly: true });
}

function openDbWritable(dbPath: string): Database.Database {
  return new Database(dbPath);
}

export function query(
  dbPath: string,
  sql: string,
  readonly = true,
): QueryResult {
  const db = readonly ? openDb(dbPath) : openDbWritable(dbPath);
  try {
    const trimmed = sql.trim();
    const isSelect = /^(SELECT|PRAGMA|EXPLAIN|WITH)\b/i.test(trimmed);

    if (readonly && !isSelect) {
      throw new Error(
        "Write operations are not allowed in read-only mode. Set readonly=false to enable writes.",
      );
    }

    if (isSelect) {
      const stmt = db.prepare(trimmed);
      const rows = stmt.all() as Record<string, unknown>[];
      const firstRow = rows[0];
      const columns = firstRow ? Object.keys(firstRow) : [];
      return { columns, rows, rowCount: rows.length };
    } else {
      db.exec(trimmed);
      return { columns: [], rows: [], rowCount: 0 };
    }
  } finally {
    db.close();
  }
}

export function schema(dbPath: string): SchemaInfo {
  const db = openDb(dbPath);
  try {
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];

    const tableInfos: TableInfo[] = tables.map((t) => {
      const columns = db.prepare(`PRAGMA table_info("${t.name}")`).all() as {
        name: string;
        type: string;
        notnull: number;
        pk: number;
        dflt_value: string | null;
      }[];

      const countResult = db
        .prepare(`SELECT COUNT(*) as count FROM "${t.name}"`)
        .get() as { count: number };

      return {
        name: t.name,
        columns: columns.map((c) => ({
          name: c.name,
          type: c.type,
          notnull: c.notnull === 1,
          pk: c.pk === 1,
          defaultValue: c.dflt_value,
        })),
        rowCount: countResult.count,
      };
    });

    return { tables: tableInfos, totalTables: tableInfos.length };
  } finally {
    db.close();
  }
}

export function tableInfo(dbPath: string, tableName: string): TableInfo {
  const db = openDb(dbPath);
  try {
    const columns = db.prepare(`PRAGMA table_info("${tableName}")`).all() as {
      name: string;
      type: string;
      notnull: number;
      pk: number;
      dflt_value: string | null;
    }[];
    if (columns.length === 0) {
      throw new Error(`Table "${tableName}" not found`);
    }

    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM "${tableName}"`)
      .get() as { count: number };

    return {
      name: tableName,
      columns: columns.map((c) => ({
        name: c.name,
        type: c.type,
        notnull: c.notnull === 1,
        pk: c.pk === 1,
        defaultValue: c.dflt_value,
      })),
      rowCount: countResult.count,
    };
  } finally {
    db.close();
  }
}

export function explain(dbPath: string, sql: string): string {
  const db = openDb(dbPath);
  try {
    const rows = db.prepare(`EXPLAIN QUERY PLAN ${sql}`).all() as Record<
      string,
      unknown
    >[];
    return rows.map((r) => `${r.id} | ${r.parent} | ${r.detail}`).join("\n");
  } finally {
    db.close();
  }
}

export function listDatabases(directory: string): string[] {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.(db|sqlite|sqlite3)$/i.test(e.name))
    .map((e) => path.join(directory, e.name))
    .sort();
}
