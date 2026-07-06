const express = require("express");
const router = express.Router();
const friendRequestController = require("../controllers/friendRequestController")
const { ensureAuthenticated } = require("../middleware/auth");

router.get("/suggestions/:userId", ensureAuthenticated, friendRequestController.getSuggestions);
router.get("/pending/:id", ensureAuthenticated, friendRequestController.getPending);
router.get("/request/:id", ensureAuthenticated, friendRequestController.getRequests);
router.get("/:id", ensureAuthenticated, friendRequestController.getAllFriends)
router.post("/add", ensureAuthenticated, friendRequestController.addFriend)
router.post("/remove", ensureAuthenticated, friendRequestController.removeRequest)
router.delete("/cancel/request", ensureAuthenticated, friendRequestController.cancelFriendRequest)
router.put("/request/accept", ensureAuthenticated, friendRequestController.acceptRequest)
module.exports = router;
