const asyncHandler = require("express-async-handler");
const User = require("../models/user")
const Friend = require("../models/friendRequest");
const Post = require("../models/post");
const Comments = require("../models/comment");
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const bcrypt = require('bcryptjs');
const mongoose = require("mongoose");
const friendRequest = require("../models/friendRequest");
require("dotenv").config();
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
    
    const mongoDBId = new mongoose.Types.ObjectId("65024ac3d8483c4d24af5ce0");
    const newUser = new User({
        email:(body.email).toLowerCase(),
        password: "",
        name: body.first_name + " " + body.last_name,
        comments: [],
        friends_list: [mongoDBId],
        image_url: req.file ? `${process.env.SELF}/uploads/${req.file.filename}` : `${process.env.SELF}/uploads/anonymous.jpeg`,
        posts: [],
        lives: body.live,
        job: body.job,
        studies_at: body.studies,
        bio: ""
    })
    const updateUser = await User.findByIdAndUpdate(mongoDBId,{$push: {friends_list:newUser.id}},{new: true})
    console.log(updateUser)
    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
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
    const findUser = await User.findByIdAndUpdate(req.body.id, {name: req.body.name});
    if(findUser){
        res.status(200).json({message: "Name updated successfully"});
    }
    else {
        res.status(404);
    }
})
module.exports.editProfileImage = asyncHandler(async(req,res) => {
    const newImage = await User.findByIdAndUpdate(req.body.id,{image_url: `${process.env.SELF}/uploads/${req.file.filename}`})
    if(newImage) {
        res.status(200).json({message: "Image updated"});
    }
    else {
        res.status(404).json({message: "User not found"});
    }
})
module.exports.deleteUser = asyncHandler(async(req,res) => {
    const findUser = await User.findByIdAndDelete(req.body.id);
    const findPosts = await Post.deleteMany({author: req.body.id});
    const posts = await Post.find({});
    const comments = await Comments.deleteMany({author: req.body.id});
    const commentId = await Comments.find({author: req.body.id}).select("_id");
    const commentIdsToRemove = commentId.map(comment => new mongoose.Types.ObjectId(comment._id));
    const deleteFriendRequest = await Friend.findOneAndDelete({
        $or: [{ sender: req.body.id }, { recipient: req.body.id }],
      });
      
      const deleteFriend = await User.findByIdAndUpdate(
        "65024ac3d8483c4d24af5ce0",
        { $pull: { friends_list: req.body.id } },
      );
    console.log(commentIdsToRemove);
    const updateOperations = posts.map(post => {
        return Post.findByIdAndUpdate(
          post._id,
          {
            $pull: { comments: { $in: commentIdsToRemove } }
                }
        );
      });
      
      // Execute the bulk update operations
      console.log('Before executing updateOperations');
      Promise.all(updateOperations)
        .then(results => {
          // Handle success
          const modifiedCount = results.reduce((total, result) => total + result.nModified, 0);
          console.log(`Removed comments from ${modifiedCount} posts.`);
        })
        .catch(error => {
          // Handle error
          console.error(error);
        });
    req.logout();
    res.status(200).json("Everything deleted");
})