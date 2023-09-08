const asyncHandler = require("express-async-handler");
const User = require("../models/user")
const FriendRequest = require("../models/friendRequest")
const mongoose = require("mongoose");
const friendRequest = require("../models/friendRequest");

// fix later so that it can filter out people who are already friends and friend requests pending
module.exports.getSuggestions = asyncHandler(async(req,res,next) => {
    let allUsers = await User.find().exec();
    const userId = req.params.userId;
    const userIdAsObjectId = new mongoose.Types.ObjectId(userId);
    allUsers = allUsers.filter(user => !user._id.equals(userIdAsObjectId));
    const allFriendRequests = await FriendRequest.find({
        $or: [{ sender: req.params.userId }, { recipient: req.params.userId }]
      }).exec();
      if(allFriendRequests.length !== 0){
    // if they have a friend request out already delete them from users
    const allPotentialId = allFriendRequests.reduce((userId, current) => {
        if(!userId.includes(current.sender)){
            userId.push(current.sender)
        }
        if(!userId.includes(current.recipient)){
            userId.push(current.recipient)
        }
        return userId;
    },[])
    const filteredUsers = [];
    for(let i =0; i< allUsers.length; i ++) {
        let a = 0
        for(let j = 0; j < allPotentialId.length; j ++){
            if(!allPotentialId[j].equals(allUsers[i]._id)){
                a += 1;
            }
        }
        if( a === allPotentialId.length){
            filteredUsers.push(allUsers[i]);
        }
    }
    res.status(200).json(filteredUsers)}
    else{
        res.status(200).json(allUsers)
    }
}   
)
//Create friend Request
module.exports.addFriend = asyncHandler(async (req, res, next) => {
    const senderId = req.body.senderId;
    const recipientId = req.body.recipientId;
    
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
// Gets all pending requests from users side
module.exports.getPending = asyncHandler(async(req,res,next) => {
    const id = req.params.id;
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
        const updateSender = await User.findByIdAndUpdate(updateRequest.sender, {$push: {friends_list: updateRequest.recipient}});
        const updateRecipient = await User.findByIdAndUpdate(updateRequest.recipient, {$push: {friends_list: updateRequest.sender}});
    }

})
module.exports.getAllFriends = asyncHandler(async(req,res,next) => {
    const id = req.params.id;
    console.log(req.params.id)
    const userFriend = await User.findById(id).populate("friends_list");
    if(userFriend){
        console.log(userFriend.friends_list);
        res.status(200).json(userFriend.friends_list);
    }
})