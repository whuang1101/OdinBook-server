const User = require("../models/user");
const { configureFacebookStrategy } = require("./facebookAuth");
const { configureLocalStrategy } = require("./localAuth");

let configured = false;
let facebookEnabled = false;

function configurePassport(passport) {
  if (configured) {
    return { facebookEnabled };
  }

  configureLocalStrategy(passport);
  facebookEnabled = configureFacebookStrategy(passport);

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      done(null, await User.findById(id));
    } catch (error) {
      done(error);
    }
  });

  configured = true;
  return { facebookEnabled };
}

module.exports = { configurePassport };
