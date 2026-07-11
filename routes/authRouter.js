const express = require("express");
const passport = require("passport");
const { getClientOrigins } = require("../config/env");
const { userView } = require("../lib/userView");

const router = express.Router();

function currentUser(req, res) {
  if (!req.user) {
    return res.status(401).json(false);
  }
  return res.status(200).json(userView(req.user));
}

router.post("/local", (req, res, next) => {
  passport.authenticate("local", (error, user) => {
    if (error) {
      return next(error);
    }
    if (!user) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    return req.logIn(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }
      return res.status(200).json(userView(user));
    });
  })(req, res, next);
});

router.get("/me", currentUser);
router.get("/local/success", currentUser);
router.get("/login/success", currentUser);

router.get("/facebook", (req, res, next) => {
  if (!req.app.locals.facebookEnabled) {
    return res.status(503).json({ message: "Facebook login is not configured" });
  }
  return passport.authenticate("facebook", { scope: ["email"] })(req, res, next);
});

router.get("/facebook/callback", (req, res, next) => {
  if (!req.app.locals.facebookEnabled) {
    return res.status(503).json({ message: "Facebook login is not configured" });
  }
  const clientOrigin = getClientOrigins()[0];
  return passport.authenticate("facebook", { failureRedirect: `${clientOrigin}/login` })(req, res, () => {
    res.redirect(clientOrigin);
  });
});

router.post("/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) {
      return next(error);
    }

    if (!req.session) {
      return res.status(200).json({ message: "Logged out" });
    }

    return req.session.destroy((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }
      res.clearCookie("odinbook.sid");
      return res.status(200).json({ message: "Logged out" });
    });
  });
});

module.exports = router;
