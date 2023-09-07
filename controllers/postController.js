 const asyncHandler = require("express-async-handler");
 const User = require("../models/user");
 const Post = require("../models/post");
const user = require("../models/user");
const mongoose = require("mongoose")
 //this allows post to be made
 module.exports.post = asyncHandler(async(req,res,next) => {
    const findUser = await User.findById(req.body.userId);
    if(findUser){
        const post = new Post({
            date:new Date(),
            text: req.body.content,
            likes: [],
            comments: [],
            author: findUser._id
        })
        const save = await post.save()
        if(save) {
            const updateUser = await User.findByIdAndUpdate(
                findUser._id, 
                { $push: { posts: save._id } 
            })
            res.status(200);
            }
    }
    else{
        res.status(404);
    }
})

// this makes it so that you can get all posts either public/your friends or your own
module.exports.get = asyncHandler(async(req,res,next) => {
    const userId = req.params.userId;

    // retrieving personal posts
    let posts = await Post.find({author: userId}).populate("author").sort({date: -1});
    res.status(200).json(posts);
})

// adds a like to a post
module.exports.addLike = asyncHandler(async(req,res,next) => {
    const postId = req.body.postId;
    const userId = req.body.userId;

    const findPost = await Post.findByIdAndUpdate(postId, {$push:{likes:userId}})
    if(findPost){
        res.status(200)
    }
})
module.exports.removeLike = asyncHandler(async(req,res,next) => {
    const postId = req.body.postId;
    const userId = req.body.userId;
    const findPost = await Post.findByIdAndUpdate(postId, {$pull:{likes:userId}})
    if(findPost){
        res.status(200)
    }
})