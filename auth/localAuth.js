const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");

function configureLocalStrategy(passport) {
  passport.use(new LocalStrategy(async (username, password, done) => {
    try {
      const email = String(username || "").trim().toLowerCase();
      const user = await userRepository.findByEmailForAuth(email);
      if (!user || !user.password_hash) {
        return done(null, false, { message: "Incorrect email or password" });
      }

      const matches = await bcrypt.compare(password, user.password_hash);
      if (!matches) {
        return done(null, false, { message: "Incorrect email or password" });
      }

      delete user.password_hash;
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));
}

module.exports = { configureLocalStrategy };
