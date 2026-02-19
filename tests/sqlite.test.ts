import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import Database from "better-sqlite3";
import {
  query,
  schema,
  tableInfo,
  explain,
  listDatabases,
} from "../src/sqlite.js";

let testDbPath: string;
let tempDir: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "mcp-sqlite-test-"));
  testDbPath = path.join(tempDir, "test.db");

  const db = new Database(testDbPath);
  db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      name TEXT,
      email TEXT
    );
    INSERT INTO users (id, name, email) VALUES (1, 'Alice', 'alice@example.com');
    INSERT INTO users (id, name, email) VALUES (2, 'Bob', 'bob@example.com');
    INSERT INTO users (id, name, email) VALUES (3, 'Carol', 'carol@example.com');
  `);
  db.close();
});

afterAll(() => {
  if (tempDir && fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
});

describe("query", () => {
  it("returns query results for SELECT", () => {
    const result = query(testDbPath, "SELECT * FROM users ORDER BY id");
    expect(result.rowCount).toBe(3);
    expect(result.columns).toEqual(["id", "name", "email"]);
    expect(result.rows[0]).toEqual({
      id: 1,
      name: "Alice",
      email: "alice@example.com",
    });
  });

  it("returns empty columns for empty result", () => {
    const result = query(testDbPath, "SELECT * FROM users WHERE id = 999");
    expect(result.rowCount).toBe(0);
    expect(result.columns).toEqual([]);
    expect(result.rows).toEqual([]);
  });

  it("allows PRAGMA in read-only mode", () => {
    const result = query(testDbPath, "PRAGMA table_info(users)");
    expect(result.rowCount).toBe(3);
    expect(result.columns).toContain("name");
    expect(result.columns).toContain("type");
  });

  it("throws for write operations in read-only mode", () => {
    expect(() =>
      query(
        testDbPath,
        "INSERT INTO users (id, name, email) VALUES (4, 'x', 'x')",
      ),
    ).toThrow("Write operations are not allowed");
  });

  it("allows write operations when readonly=false", () => {
    const result = query(
      testDbPath,
      "INSERT INTO users (id, name, email) VALUES (99, 'Test', 'test@x.com')",
      false,
    );
    expect(result.rowCount).toBe(0);
    expect(result.columns).toEqual([]);

    const select = query(testDbPath, "SELECT * FROM users WHERE id = 99");
    expect(select.rowCount).toBe(1);
    expect(select.rows[0]).toMatchObject({ name: "Test", email: "test@x.com" });

    query(testDbPath, "DELETE FROM users WHERE id = 99", false);
  });
});

describe("schema", () => {
  it("returns schema with tables and columns", () => {
    const info = schema(testDbPath);
    expect(info.totalTables).toBe(1);
    expect(info.tables).toHaveLength(1);
    const table = info.tables[0];
    expect(table).toBeDefined();
    expect(table?.name).toBe("users");
    expect(table?.rowCount).toBe(3);
    expect(table?.columns).toHaveLength(3);

    const idCol = table?.columns.find((c) => c.name === "id");
    expect(idCol).toBeDefined();
    expect(idCol?.type).toBe("INTEGER");
    expect(idCol?.pk).toBe(true);
    expect(idCol?.notnull).toBe(false);
  });
});

describe("tableInfo", () => {
  it("returns table info for existing table", () => {
    const info = tableInfo(testDbPath, "users");
    expect(info.name).toBe("users");
    expect(info.rowCount).toBe(3);
    expect(info.columns).toHaveLength(3);
    const nameCol = info.columns.find((c) => c.name === "name");
    expect(nameCol?.type).toBe("TEXT");
  });

  it("throws for non-existent table", () => {
    expect(() => tableInfo(testDbPath, "nonexistent")).toThrow(
      'Table "nonexistent" not found',
    );
  });
});

describe("explain", () => {
  it("returns query plan string", () => {
    const plan = explain(testDbPath, "SELECT * FROM users WHERE id = 1");
    expect(typeof plan).toBe("string");
    expect(plan.length).toBeGreaterThan(0);
    expect(plan).toMatch(/^\d+\s*\|\s*\d+\s*\|/);
  });
});

describe("listDatabases", () => {
  it("lists .db files in directory", () => {
    const dbs = listDatabases(tempDir);
    expect(dbs).toContain(testDbPath);
    expect(dbs).toHaveLength(1);
  });

  it("returns empty array when no databases", () => {
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "empty-"));
    const dbs = listDatabases(emptyDir);
    expect(dbs).toEqual([]);
    fs.rmSync(emptyDir, { recursive: true });
  });

  it("ignores non-database files", () => {
    fs.writeFileSync(path.join(tempDir, "not-a-db.txt"), "hello");
    const dbs = listDatabases(tempDir);
    expect(dbs).toHaveLength(1);
    const first = dbs[0];
    expect(first).toBeDefined();
    expect(first).toContain("test.db");
  });
});
