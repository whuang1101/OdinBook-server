require("dotenv").config();

const fs = require("node:fs/promises");
const path = require("node:path");
const { pool, schema, transaction } = require("./pool");

const migrationsDirectory = path.join(__dirname, "migrations");

function render(sql) {
  return sql.replaceAll("{{schema}}", `"${schema}"`);
}

async function migrate() {
  const files = (await fs.readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort();
  await transaction(async (client) => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`${schema}:migrations`]);
    const schemaExists = await client.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema]);
    if (!schemaExists.rowCount) await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`CREATE TABLE IF NOT EXISTS "${schema}".schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const applied = new Set((await client.query(`SELECT version FROM "${schema}".schema_migrations`)).rows.map(({ version }) => version));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = render(await fs.readFile(path.join(migrationsDirectory, file), "utf8"));
      await client.query(sql);
      await client.query(`INSERT INTO "${schema}".schema_migrations (version) VALUES ($1)`, [file]);
      console.log(`Applied migration ${file}`);
    }
  });
}

if (require.main === module) {
  migrate().then(() => pool.end()).catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
}

module.exports = { migrate };
