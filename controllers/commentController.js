const asyncHandler = require("express-async-handler");
const Comment = require("../models/comment");
const Post = require("../models/post")
const User = require("../models/user")
module.exports.addPost = asyncHandler(async(req, res, next) => {
    const postId = req.body.postId;
    const post = await Post.findById(postId);
    const userId = req.body.userId;
    const text= req.body.text;
    const newMessage = new Comment({
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

module.exports.getComment = asyncHandler(async(req,res,next) => {
    const commentId = req.params.id;
    const findComment = await Comment.findById(commentId);
    if(findComment){
        res.status(200).json(findComment)
    }
    else{
        res.status(404).json({message:" message not found"})
    }
})
module.exports.editComment = asyncHandler(async(req,res,next) => {
    const commentId = req.body.id;
    const updatedText = req.body.text;
    const updatedComment= await Comment.findByIdAndUpdate(commentId, {text:updatedText, edited:true})
    if(updatedComment){
        res.status(200).json({message: "Message updated successfully"});
    }
    else{
        res.status(404)
    }
})
module.exports.deleteComment = asyncHandler(async(req,res,next) => {
    const commentId = req.body.id;
    const findComment = await Comment.findById(commentId);
    const deletedComment= await Comment.findByIdAndDelete(commentId);
    const deleteCommentUser = await User.findByIdAndUpdate(findComment.author, {$pull:{comments:commentId}});
    if(deletedComment && deleteCommentUser){
        console.log("delete")
        res.status(200).json({message: "Comment Deleted"})
    }
    else{
        res.status(404)
    }
})