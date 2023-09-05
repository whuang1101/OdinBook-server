const express = require("express");
const router = express.Router();
const passport = require("passport");
require("dotenv").config();

// Define the Facebook authentication route
router.get('/facebook',
  passport.authenticate('facebook', { scope: 'email' }));

// Define the Facebook callback route
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect(`${process.env.ORIGIN}`);
  });
router.get("/login/success", (req,res,next)=> {
  if(req.user){
    res.status(200).json(req.user);
  }
  else{
    res.status(404).json(false);
  }
})

module.exports = router;