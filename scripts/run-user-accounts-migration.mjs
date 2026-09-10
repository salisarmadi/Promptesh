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
  await client.connect();
  await client.query(await readFile("db/migrations/003-user-accounts.sql", "utf8"));
  await client.query(await readFile("db/migrations/004-user-library.sql", "utf8"));
  const result = await client.query(
    `SELECT to_regclass('public.user_accounts')::text AS users,
            to_regclass('public.user_sessions')::text AS sessions,
            to_regclass('public.user_submissions')::text AS submissions,
            to_regclass('public.user_saved_images')::text AS saved_images,
            to_regclass('public.user_copy_history')::text AS copy_history`
  );
  console.log(JSON.stringify(result.rows[0], null, 2));
} finally {
  await client.end().catch(() => {});
}
