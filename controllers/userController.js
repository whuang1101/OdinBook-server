const asyncHandler = require("express-async-handler");
const User = require("../models/user")
const Friend = require("../models/friendRequest");
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const bcrypt = require('bcryptjs');
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
        console.log("removed friend")
        res.status(200).json({message: "friend removed"});
    }
    else{ 
        res.status(404).json({message: "friend removed"});
    }
})
module.exports.postNewUser = asyncHandler(async(req,res,next) => {
    const body = req.body;
    console.log(body);
    const newUser = new User({
        email:(body.email).toLowerCase(),
        password: "",
        name: body.first_name + " " + body.last_name,
        comments: [],
        friends_list: [],
        image_url: req.file ? `${process.env.SELF}/uploads/${req.file.filename}` : `${process.env.SELF}/uploads/anonymous.jpeg`,
        posts: [],
        lives: body.live,
        job: body.job,
        studies_at: body.studies,
        bio: ""
    })
    console.log(newUser);
    bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
        newUser.password = hashedPassword;
        console.log(newUser);
        const saveUser = await newUser.save();

        if(saveUser){
            console.log("saved");
            res.status(200).json({message: "User Saved"});
        }else{
            console.log("not saved")
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