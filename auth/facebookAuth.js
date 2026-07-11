const FacebookStrategy = require("passport-facebook").Strategy;
const User = require("../models/user");
const { getPublicApiUrl } = require("../config/env");

function configureFacebookStrategy(passport) {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return false;
  }

  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: `${getPublicApiUrl()}/auth/facebook/callback`,
    enableProof: true,
    profileFields: ["id", "displayName", "email", "picture.type(large)"],
    scope: ["email"],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ facebookId: profile.id });
      if (!user) {
        user = await User.create({
          facebookId: profile.id,
          name: profile.displayName,
          email: profile.emails?.[0]?.value || profile._json?.email,
          image_url: profile.photos?.[0]?.value || `${getPublicApiUrl()}/uploads/anonymous.jpeg`,
          bio: "",
          job: "",
          lives: "",
          studies_at: "",
        });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }));

  return true;
}

module.exports = { configureFacebookStrategy };
