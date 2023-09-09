const express = require("express");
const router = express.Router();
const commentController = require("../controllers/commentController")
router.post("/add", commentController.addPost);
router.get("/:id", commentController.getComment);
router.put("/edit", commentController.editComment)
router.delete("/delete", commentController.deleteComment)
module.exports = router