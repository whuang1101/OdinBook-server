const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController")
const { ensureAuthenticated } = require("../middleware/auth");

router.get("/self/:userId", ensureAuthenticated, postController.getSelfPosts);
router.get("/single/:postId", postController.getSingle);
router.get("/:userId", ensureAuthenticated, postController.get);
router.post("/", ensureAuthenticated, postController.post);
router.put("/like/add", ensureAuthenticated, postController.addLike)
router.put("/like/remove", ensureAuthenticated, postController.removeLike)
router.put("/edit", ensureAuthenticated, postController.editPost)
router.delete("/delete", ensureAuthenticated, postController.deletePost)

module.exports = router;
