require("dotenv").config();

const mongoose = require("mongoose");
const { createApp } = require("./app");
const { getMongoUri } = require("./config/env");

const port = Number(process.env.PORT) || 3000;

async function start() {
  const mongoUri = getMongoUri();
  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(mongoUri);
  const server = createApp().listen(port, "0.0.0.0", () => {
    console.log(`Server listening on ${port}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received; shutting down`);
    server.close(async () => {
      await mongoose.disconnect();
      process.exit(0);
    });
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
  return server;
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = { start };
