const express = require("express");
const router = express.Router();
const friendRequestController = require("../controllers/friendRequestController")
router.get("/suggestions/:userId", friendRequestController.getSuggestions);
router.get("/pending/:id", friendRequestController.getPending);
router.get("/request/:id", friendRequestController.getRequests);

router.post("/add", friendRequestController.addFriend)
router.post("/remove", friendRequestController.removeRequest)


module.exports = router;