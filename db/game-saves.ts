import { env } from "cloudflare:workers";

const runtimeEnv = env as { DB: D1Database };

const createTableSql = `CREATE TABLE IF NOT EXISTS game_saves (
  profile_id TEXT PRIMARY KEY NOT NULL,
  state_json TEXT NOT NULL,
  version TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

async function ensureTable() {
  await runtimeEnv.DB.prepare(createTableSql).run();
}

export async function readRemoteSave(
  profileId: string,
): Promise<string | null> {
  await ensureTable();
  const row = await runtimeEnv.DB.prepare(
    "SELECT state_json FROM game_saves WHERE profile_id = ?1",
  )
    .bind(profileId)
    .first<{ state_json: string }>();
  return row?.state_json ?? null;
}

export async function writeRemoteSave(
  profileId: string,
  stateJson: string,
  version: string,
): Promise<void> {
  await ensureTable();
  await runtimeEnv.DB.prepare(
    `INSERT INTO game_saves (profile_id, state_json, version, updated_at)
    VALUES (?1, ?2, ?3, CURRENT_TIMESTAMP)
    ON CONFLICT(profile_id) DO UPDATE SET state_json = excluded.state_json, version = excluded.version, updated_at = CURRENT_TIMESTAMP`,
  )
    .bind(profileId, stateJson, version)
    .run();
}

export async function deleteRemoteSave(profileId: string): Promise<void> {
  await ensureTable();
  await runtimeEnv.DB.prepare("DELETE FROM game_saves WHERE profile_id = ?1")
    .bind(profileId)
    .run();
}
