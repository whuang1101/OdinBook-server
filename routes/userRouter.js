const express = require("express");
const router = express.Router();
const multer  = require('multer')
const userController = require("../controllers/userController")
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() ;
      cb(null,+ uniqueSuffix + file.originalname)
    }
  })
  
  const upload = multer({ storage: storage })
  
router.get("/:id", userController.getUser);
router.get("/email/:email", userController.getEmail);
router.post("/newUser",upload.single("image_url"), userController.postNewUser);
router.put("/name/edit",userController.editName)
router.put("/edit/bio", userController.editBio);
router.put("/edit/details", userController.editDetails);
router.put("/friend/remove", userController.removeFriend);
router.put("/image/edit",upload.single("image_url"), userController.editProfileImage);
router.delete("/", userController.deleteUser);


module.exports = router;