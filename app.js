const path = require("path");
const express = require("express");
const passport = require("passport");
const cors = require("cors");
const session = require("express-session");

const { configurePassport } = require("./auth/passport");
const { getClientOrigins, hasDatabaseConfig, getSessionSecret } = require("./config/env");
const { pool, schema } = require("./db/pool");
const { errorHandler, notFound } = require("./middleware/errors");
const authRouter = require("./routes/authRouter");
const postRouter = require("./routes/postRouter");
const friendRequestRouter = require("./routes/friendRequestRouter");
const userRouter = require("./routes/userRouter");
const commentRouter = require("./routes/commentRouter");

function createSessionStore() {
  if (process.env.NODE_ENV === "test") {
    return undefined;
  }

  if (!hasDatabaseConfig()) {
    return undefined;
  }

  const PgStore = require("connect-pg-simple")(session);
  return new PgStore({ pool, schemaName: schema, tableName: "user_sessions" });
}

function createCorsOptions() {
  const allowedOrigins = new Set(getClientOrigins());
  return {
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ""))) {
        callback(null, true);
        return;
      }
      const error = new Error("Origin is not allowed");
      error.status = 403;
      callback(error);
    },
  };
}

function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const { facebookEnabled } = configurePassport(passport);

  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.locals.facebookEnabled = facebookEnabled;
  app.use(cors(createCorsOptions()));
  app.use(express.json({ limit: "1mb" }));
  app.use(session({
    name: "odinbook.sid",
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    store: createSessionStore(),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/health", (req, res) => res.status(200).json({ ok: true }));
  app.use("/uploads", express.static(path.join(__dirname, "uploads")));
  app.use("/auth", authRouter);
  app.use("/friends", friendRequestRouter);
  app.use("/posts", postRouter);
  app.use("/users", userRouter);
  app.use("/comments", commentRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, createCorsOptions };
