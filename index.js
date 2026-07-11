require("dotenv").config();

const { createApp } = require("./app");
const { hasDatabaseConfig } = require("./config/env");
const { migrate } = require("./db/migrate");
const { pool } = require("./db/pool");

const port = Number(process.env.PORT) || 3000;

async function start() {
  if (!hasDatabaseConfig()) {
    throw new Error("DATABASE_URL or PGHOST is required");
  }

  await pool.query("SELECT 1");
  if (process.env.AUTO_MIGRATE !== "false") await migrate();

  const server = createApp().listen(port, "0.0.0.0", () => {
    console.log(`Server listening on ${port}`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received; shutting down`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  return server;
}

if (require.main === module) {
  start().catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
}

module.exports = { start };
