const express = require("express");
const passport = require("passport");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");

require("./auth/facebookAuth");
require("./auth/localAuth");

const authRouter = require("./routes/authRouter");
const postRouter = require("./routes/postRouter");
const friendRequestRouter = require("./routes/friendRequestRouter");
const userRouter = require("./routes/userRouter");
const commentRouter = require("./routes/commentRouter");
const User = require("./models/user");

function getClientOrigin() {
  return process.env.CLIENT_ORIGIN || process.env.ORIGIN || "http://localhost:5173";
}

function createSessionStore() {
  if (process.env.NODE_ENV === "test") {
    return undefined;
  }

  const mongoUri = process.env.MONGO_URI || process.env.SECRET_KEY;

  try {
    const MongoStore = require("connect-mongo");
    if (mongoUri) {
      return MongoStore.create({ mongoUrl: mongoUri });
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  return undefined;
}

function createApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const clientOrigin = getClientOrigin();

  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: clientOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  }));

  app.use(session({
    name: "odinbook.sid",
    secret: process.env.SESSION_SECRET || process.env.KEY || "dev-session-secret",
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

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  app.get("/health", (req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use("/uploads", express.static("uploads"));
  app.use("/auth", authRouter);
  app.use("/friends", friendRequestRouter);
  app.use("/posts", postRouter);
  app.use("/users", userRouter);
  app.use("/comments", commentRouter);

  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({ message: err.message || "Internal server error" });
  });

  return app;
}

module.exports = { createApp, getClientOrigin };
