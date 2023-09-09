const asyncHandler = require("express-async-handler");
const Message = require("../models/comment");
const Post = require("../models/post")
const User = require("../models/user")
module.exports.addPost = asyncHandler(async(req, res, next) => {
    const postId = req.body.postId;
    const post = await Post.findById(postId);
    const userId = req.body.userId;
    const text= req.body.text;
    const newMessage = new Message({
        date: new Date(),
        text: text,
        comments: [],
        author: userId,
        post: post._id,
    })
    // const userUpdate = await User.findById(userId);
    // const newPost = await Post.findById(postId,);
    // console.log(userUpdate)
    // console.log(newPost)
    const saveMessage = await newMessage.save();
    if(saveMessage){
        const userUpdate = await User.findByIdAndUpdate(userId,{$push:{comments:saveMessage._id}});
        const newPost = await Post.findByIdAndUpdate(postId,{$push:{comments:saveMessage._id}});
        if(newPost && userUpdate){
            console.log("yes")
            res.status(200).json({message: "message saved and added to Post"})
        }
    }
    else{
        res.status(404).json({message: "failed to save"})
    }
})