const { Pool } = require("pg");

const schema = process.env.DB_SCHEMA || "odinbook";
if (!/^[a-z_][a-z0-9_]*$/i.test(schema)) {
  throw new Error("DB_SCHEMA must be a valid PostgreSQL identifier");
}

function poolConfig() {
  const config = {
    max: Number(process.env.PGPOOL_MAX) || 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  if (process.env.DATABASE_URL) {
    config.connectionString = process.env.DATABASE_URL;
  }

  if (process.env.PGSSLMODE === "require" || process.env.NODE_ENV === "production") {
    config.ssl = { rejectUnauthorized: false };
  }

  return config;
}

const pool = new Pool(poolConfig());

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function table(name) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error("Invalid table name");
  }
  return `"${schema}"."${name}"`;
}

module.exports = { pool, schema, table, transaction };
