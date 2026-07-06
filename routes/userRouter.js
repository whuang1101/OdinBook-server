const express = require("express");
const router = express.Router();
const multer  = require('multer')
const userController = require("../controllers/userController")
const { ensureAuthenticated } = require("../middleware/auth");
const upload = multer({ storage: multer.memoryStorage() })
  
router.get("/email/:email", userController.getEmail);
router.get("/:id", ensureAuthenticated, userController.getUser);
router.post("/newUser",upload.single("image_url"), userController.postNewUser);
router.put("/name/edit", ensureAuthenticated, userController.editName)
router.put("/edit/bio", ensureAuthenticated, userController.editBio);
router.put("/edit/details", ensureAuthenticated, userController.editDetails);
router.put("/friend/remove", ensureAuthenticated, userController.removeFriend);
router.put("/image/edit", ensureAuthenticated, upload.single("image_url"), userController.editProfileImage);
router.delete("/", ensureAuthenticated, userController.deleteUser);


module.exports = router;
