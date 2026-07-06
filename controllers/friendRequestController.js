const asyncHandler = require("express-async-handler");
const User = require("../models/user")
const FriendRequest = require("../models/friendRequest")
const mongoose = require("mongoose");
const friendRequest = require("../models/friendRequest");

module.exports.getSuggestions = asyncHandler(async(req,res,next) => {
    const userId = req.params.userId;
    if (String(req.user._id) !== String(userId)) {
        return res.status(403).json({ message: "You can only view your own suggestions" });
    }

    const user = await User.findById(userId).select("friends_list");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const friendRequests = await FriendRequest.find({
        $or: [{ sender: req.params.userId }, { recipient: req.params.userId }]
    }).select("sender recipient").exec();
    const excludedIds = new Set([String(userId), ...user.friends_list.map(String)]);

    friendRequests.forEach((request) => {
        excludedIds.add(String(request.sender));
        excludedIds.add(String(request.recipient));
    });

    const suggestions = await User.find({
        _id: { $nin: Array.from(excludedIds).map((id) => new mongoose.Types.ObjectId(id)) },
    }).limit(50);

    res.status(200).json(suggestions)
}   
)
//Create friend Request
module.exports.addFriend = asyncHandler(async (req, res, next) => {
    const senderId = req.body.senderId;
    const recipientId = req.body.recipientId;
    if (String(req.user._id) !== String(senderId)) {
        return res.status(403).json({ message: "You can only send requests as yourself" });
    }
    if (String(senderId) === String(recipientId)) {
        return res.status(400).json({ message: "Cannot friend yourself" });
    }

    const existing = await FriendRequest.findOne({
        $or:[{sender: senderId, recipient: recipientId}, {sender: recipientId, recipient: senderId}]
    });
    if (existing) {
        return res.status(200).json({ message: "Friend request already exists" });
    }
    
    const newFriendRequest = new FriendRequest({
        date: new Date(),
        sender: senderId,
        recipient: recipientId,
        status: 2,
    });

    try {
        const savedRequest = await newFriendRequest.save();
        if (savedRequest) {
            res.status(200).json({ message: 'Friend request saved successfully' });
        } else {
            res.status(404).json({ message: 'Failed to save friend request' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

//Delete friend request can be used for denied or cancel
module.exports.removeRequest = asyncHandler(async (req, res, next) => {
    const senderId = req.body.senderId;
    const recipientId = req.body.recipientId;
    const findRequest = await friendRequest.findOneAndDelete({$or:[{sender: senderId,recipient:recipientId }, {recipient:senderId, sender:recipientId}]});

    if(findRequest){
        res.status(200).json("Deleted");
    }
    else{
        res.status(404).json("Request not found");
    }
});
module.exports.cancelFriendRequest = asyncHandler(async(req, res, next) => {
    const requestId = req.body.recipientId;
    const request = await FriendRequest.findById(requestId);
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    if (String(request.sender) !== String(req.user._id)) {
        return res.status(403).json({ message: "You can only cancel your own requests" });
    }
    const deleteRequest = await FriendRequest.findByIdAndDelete(requestId);
    if(deleteRequest) {
        res.status(200).json({ message: "Request cancelled" });
    }
    else{
        res.status(404).json({ message: "Request not found" });
    }
});
// Gets all pending requests from users side
module.exports.getPending = asyncHandler(async(req,res,next) => {
    const id = req.params.id;
    if (String(req.user._id) !== String(id)) {
        return res.status(403).json({ message: "You can only view your own pending requests" });
    }
    const findPending = await FriendRequest.find(
    {
        sender: id,
        status:2
    },
    ).populate("recipient")
    if(findPending){
        res.status(200).json(findPending);
    }
    else{
        res.status(404).json({message:"No pending requests found"})
    }
})
module.exports.getRequests = asyncHandler(async(req,res,next) => {
    const id = req.params.id;
    if (String(req.user._id) !== String(id)) {
        return res.status(403).json({ message: "You can only view your own requests" });
    }
    const findPending = await FriendRequest.find(
    {
        recipient: id,
        status:2
    },
    ).populate("sender")
    if(findPending){
        res.status(200).json(findPending);
    }
    else{
        res.status(404).json({message:"No pending requests found"})
    }
})
module.exports.acceptRequest = asyncHandler(async(req,res,next)=> {
    const requestId = req.body.id;
    const updateRequest = await friendRequest.findByIdAndUpdate(requestId, {status: 1});
    if(updateRequest){
        if (String(updateRequest.recipient) !== String(req.user._id)) {
            return res.status(403).json({ message: "You can only accept requests sent to you" });
        }
        const updateSender = await User.findByIdAndUpdate(updateRequest.sender, {$addToSet: {friends_list: updateRequest.recipient}});
        const updateRecipient = await User.findByIdAndUpdate(updateRequest.recipient, {$addToSet: {friends_list: updateRequest.sender}});
        if(updateSender && updateRecipient){
            res.status(200).json("Friend Added");
        }
        else{
            res.status(404).json("Friend not added");
        }
    }
    else{
        res.status(404).json("Request not found");
    }

})
module.exports.getAllFriends = asyncHandler(async(req,res,next) => {
    const id = req.params.id;
    const userFriend = await User.findById(id).populate("friends_list");
    if(userFriend){
        res.status(200).json(userFriend.friends_list);
    }
})
