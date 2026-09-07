#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd(), true);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
});

try {
  const sql = await readFile("db/migrations/002-admin-support.sql", "utf8");
  await client.connect();
  await client.query(sql);

  const columns = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE (table_name = 'images' AND column_name = 'updated_at')
         OR (table_name = 'categories' AND column_name = 'description')
      ORDER BY table_name, column_name`
  );

  const activity = await client.query(
    `SELECT to_regclass('public.admin_activity')::text AS name`
  );

  console.log(JSON.stringify({ columns: columns.rows, admin_activity: activity.rows[0]?.name }, null, 2));
} finally {
  await client.end().catch(() => {});
}
