const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController")
router.get("/self/:userId", postController.getSelfPosts);
router.get("/single/:postId", postController.getSingle);
router.get("/:userId", postController.get);
router.post("/", postController.post);
router.put("/like/add", postController.addLike)    
router.put("/like/remove", postController.removeLike)
router.put("/edit", postController.editPost)
router.delete("/delete",postController.deletePost)

module.exports = router;