const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController")
router.get("/:id", userController.getUser);
router.put("/edit/bio", userController.editBio);
router.put("/edit/details", userController.editDetails)
module.exports = router;