require("dotenv").config();

const mongoose = require("mongoose");
const { createApp } = require("./app");

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI || process.env.SECRET_KEY;

async function start() {
  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(mongoUri);

  const app = createApp();
  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on ${port}`);
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
