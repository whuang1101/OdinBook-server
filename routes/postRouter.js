const express = require("express");
const router = express.Router();
const postController = require("../controllers/postController")
router.get("/:userId", postController.get);
router.post("/", postController.post);

module.exports = router;