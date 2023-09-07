const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController")
router.get("/:userId", postController.get);
router.post("/", postController.post);
router.put("/like/add", postController.addLike)
router.put("/like/remove", postController.removeLike)

module.exports = router;