const express = require("express");
const multer = require("multer");
const userController = require("../controllers/userController");
const { ensureAuthenticated } = require("../middleware/auth");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    if (!file.mimetype.startsWith("image/")) {
      const error = new Error("Profile image must be an image file");
      error.status = 400;
      callback(error);
      return;
    }
    callback(null, true);
  },
});

router.get("/email/:email", userController.getEmail);
router.get("/:id", ensureAuthenticated, userController.getUser);
router.post("/newUser", upload.single("image_url"), userController.postNewUser);
router.put("/name/edit", ensureAuthenticated, userController.editName);
router.put("/edit/bio", ensureAuthenticated, userController.editBio);
router.put("/edit/details", ensureAuthenticated, userController.editDetails);
router.put("/friend/remove", ensureAuthenticated, userController.removeFriend);
router.put("/image/edit", ensureAuthenticated, upload.single("image_url"), userController.editProfileImage);
router.delete("/", ensureAuthenticated, userController.deleteUser);

module.exports = router;
