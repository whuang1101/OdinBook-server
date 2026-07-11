const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/user");

function configureLocalStrategy(passport) {
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const email = String(username || "").trim().toLowerCase();
      const user = await User.findOne({ email }).select("+password");
      if (!user || !user.password) {
        return done(null, false, { message: "Incorrect email or password" });
      }

      const matches = await bcrypt.compare(password, user.password);
      if (!matches) {
        return done(null, false, { message: "Incorrect email or password" });
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

module.exports = { configureLocalStrategy };
