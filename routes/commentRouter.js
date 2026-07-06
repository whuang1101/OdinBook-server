const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController")
const { ensureAuthenticated } = require("../middleware/auth");

router.post("/add", ensureAuthenticated, commentController.addPost);
router.get("/:id", commentController.getComment);
router.put("/edit", ensureAuthenticated, commentController.editComment)
router.delete("/delete", ensureAuthenticated, commentController.deleteComment)
module.exports = router
