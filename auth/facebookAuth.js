const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
require("dotenv").config();
const User = require("../models/user");
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: `${process.env.SELF}/auth/facebook/callback`,
  auth_type: "reauthenticate",
  enableProof: true,
  profileFields: ["id", "displayName", "email","photos"],
  scope: ["email"],
  
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ facebookId: profile.id });

    if (!user) {
      user = new User({
        facebookId: profile.id,
        name: profile.displayName,
        email: profile.email,
        image_url: profile.photos[0].value,
        bio: ""
      });
      await user.save();
    }

    // Return the user to Passport.js
    return done(null, user);
  } catch (err) {
    return done(err, null);
  }
}));