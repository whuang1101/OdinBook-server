const passport = require("passport");
const FacebookStrategy = require("passport-facebook").Strategy;
require("dotenv").config();
const User = require("../models/user");
passport.use(new FacebookStrategy({
  clientID: process.env.FACEBOOK_APP_ID,
  clientSecret: process.env.FACEBOOK_APP_SECRET,
  callbackURL: `${process.env.PUBLIC_API_URL || "http://localhost:3000"}/auth/facebook/callback`,
  auth_type: "reauthenticate",
  enableProof: true,
  profileFields: ["id", "displayName", "email", "picture.type(large)"],
  scope: ["email"],
  
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ facebookId: profile.id });
    if (!user) {
      user = new User({
        facebookId: profile.id,
        name: profile.displayName,
        email: profile._json.email,
        image_url: profile.photos ? profile.photos[0].value : `${process.env.PUBLIC_API_URL || "http://localhost:3000"}/uploads/anonymous.jpeg`,
        bio: "",
        job: "",
        lives: "",
        studies_at: "",
        friends_list: [],
        comments: [],
        posts: []
      });
      await user.save();
    }
    // Return the user to Passport.js
    return done(null, user);
  } catch (err) {
    console.log("bad");
    return done(err, null);
  }
}));
