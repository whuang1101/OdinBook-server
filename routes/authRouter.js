const express = require("express");
const router = express.Router();
const passport = require("passport");
require("dotenv").config();

router.post("/local",passport.authenticate('local', { failureRedirect: '/login' }),
function(req, res) {
  res.status(200).json(req.user)
})
router.get("/me", (req,res)=>{
  if(req.user){
    res.status(200).json(req.user);
  }
  else{
    res.status(401).json(false);
  }
}
)
router.get("/local/success", (req,res)=>{
  if(req.user){
    res.status(200).json(req.user);
  }
  else{
    res.status(401).json(false);
  }
})
router.get('/facebook',
  passport.authenticate('facebook', { scope: 'email' }));

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: `${process.env.CLIENT_ORIGIN || process.env.ORIGIN}/login` }),
  function(req, res) {
    res.redirect(`${process.env.CLIENT_ORIGIN || process.env.ORIGIN}`);
  });
router.get("/login/success", (req,res)=> {
  if(req.user){
    res.status(200).json(req.user);
  }
  else{
    res.status(401).json(false);
  }
})
router.post("/logout", function(req, res, next) {
  const finish = () => {
    if (req.session) {
      req.session.destroy(() => {
        res.clearCookie("odinbook.sid");
        res.status(200).json({ message: "Logged out" });
      });
      return;
    }

    res.status(200).json({ message: "Logged out" });
  };

  if (req.logout.length > 0) {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      finish();
    });
    return;
  }

  req.logout();
  finish();
})
module.exports = router;
