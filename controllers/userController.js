const asyncHandler = require("express-async-handler");
const User = require("../models/user")
const Friend = require("../models/friendRequest");
const Post = require("../models/post");
const Comments = require("../models/comment");
const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");
const { hasCloudinaryConfig, uploadBuffer } = require("../lib/cloudinary");
require("dotenv").config();

function publicApiUrl() {
    return process.env.PUBLIC_API_URL || "http://localhost:3000";
}

async function profileImageUrl(file) {
    if (file && hasCloudinaryConfig()) {
        const upload = await uploadBuffer(file.buffer);
        return upload.secure_url;
    }

    return `${publicApiUrl()}/uploads/anonymous.jpeg`;
}

module.exports.getUser = asyncHandler(async(req,res, next) => {
    const findUser = await User.findById(req.params.id);
    if(findUser){
        res.status(200).json(findUser);
    }
    else{
        res.status(404).json({message:"User not found"})
    }

})
module.exports.editBio = asyncHandler(async(req,res,next) => {
    const findUser = await User.findByIdAndUpdate(req.body.id,
        {bio:req.body.bio},
        )
    if(findUser){
        res.status(200).json({message:"Bio updated"});
    }else {
        res.status(400).json({message: "User was not found"});
    }
})
module.exports.editDetails = asyncHandler(async(req,res,next) => {
    const findUser = await User.findByIdAndUpdate(req.body.id,
        {lives:req.body.lives,
        studies_at: req.body.studies_at,
        job: req.body.job},
        )
    if(findUser){
        res.status(200).json({message:"Bio updated"});
    }else {
        res.status(400).json({message: "User was not found"});
    }
})
module.exports.removeFriend = asyncHandler(async(req,res,next) => {
    const id = req.body.selfId;
    const friendId = req.body.friendId;
    if (String(req.user._id) !== String(id)) {
        return res.status(403).json({ message: "You can only modify your own friends" });
    }
    //finds User and Friend to remove friends
    const findUser = await User.findByIdAndUpdate(id, {$pull: {friends_list: friendId}});
    const findFriend = await User.findByIdAndUpdate(friendId, {$pull: {friends_list: id}});
    const findFriendRequest = await Friend.findOneAndDelete({$or: [{sender: id, recipient: friendId}, {sender: friendId, recipient:id}]});
    if(findUser, findFriend, findFriend){
        res.status(200).json({message: "friend removed"});
    }
    else{ 
        res.status(404).json({message: "friend removed"});
    }
})
module.exports.postNewUser = asyncHandler(async(req,res,next) => {
    const body = req.body;
    
    const defaultFriendId = process.env.DEFAULT_FRIEND_ID;
    const newUser = new User({
        email:(body.email).toLowerCase(),
        password: "",
        name: body.first_name + " " + body.last_name,
        comments: [],
        friends_list: defaultFriendId ? [new mongoose.Types.ObjectId(defaultFriendId)] : [],
        image_url: await profileImageUrl(req.file),
        posts: [],
        lives: body.live,
        job: body.job,
        studies_at: body.studies,
        bio: ""
    })
    if (defaultFriendId) {
        await User.findByIdAndUpdate(defaultFriendId, {$addToSet: {friends_list:newUser.id}},{new: true})
    }
    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        if (err) {
            return next(err);
        }
        newUser.password = hashedPassword;
        const saveUser = await newUser.save();
        if(saveUser){
            res.status(200).json({message: "User Saved"});
        }else{
            res.status(404).json({message: "Not saved"});
        }
      });
})
module.exports.getEmail = asyncHandler(async(req,res) => {
    const newEmail = req.params.email;
    const findUser = await User.findOne({email: newEmail});
    if(!findUser){
        res.status(200).json(false)
    }
    else {
        res.status(200).json(true);
    }
})
module.exports.editName = asyncHandler(async(req,res) => {
    if (String(req.user._id) !== String(req.body.id)) {
        return res.status(403).json({ message: "You can only edit your own name" });
    }
    const findUser = await User.findByIdAndUpdate(req.body.id, {name: req.body.name});
    if(findUser){
        res.status(200).json({message: "Name updated successfully"});
    }
    else {
        res.status(404).json({ message: "User not found" });
    }
})
module.exports.editProfileImage = asyncHandler(async(req,res) => {
    if (String(req.user._id) !== String(req.body.id)) {
        return res.status(403).json({ message: "You can only edit your own image" });
    }

    const newImage = await User.findByIdAndUpdate(req.body.id,{image_url: await profileImageUrl(req.file)})
    if(newImage) {
        res.status(200).json({message: "Image updated"});
    }
    else {
        res.status(404).json({message: "User not found"});
    }
})
module.exports.deleteUser = asyncHandler(async(req,res) => {
    if (String(req.user._id) !== String(req.body.id)) {
        return res.status(403).json({ message: "You can only delete your own account" });
    }

    const commentId = await Comments.find({author: req.body.id}).select("_id");
    const commentIdsToRemove = commentId.map(comment => comment._id);
    const findUser = await User.findByIdAndDelete(req.body.id);
    if (!findUser) {
        return res.status(404).json({ message: "User not found" });
    }

    await Post.deleteMany({author: req.body.id});
    await Comments.deleteMany({author: req.body.id});
    await Post.updateMany({}, { $pull: { comments: { $in: commentIdsToRemove } } });
    await Friend.deleteMany({
        $or: [{ sender: req.body.id }, { recipient: req.body.id }],
    });
    await User.updateMany({}, { $pull: { friends_list: req.body.id } });

    if (req.logout.length > 0) {
        await new Promise((resolve, reject) => req.logout((err) => err ? reject(err) : resolve()));
    } else {
        req.logout();
    }
    res.status(200).json("Everything deleted");
})
