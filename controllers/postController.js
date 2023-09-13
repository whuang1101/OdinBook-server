 const asyncHandler = require("express-async-handler");
 const User = require("../models/user");
 const Post = require("../models/post");
const Comment = require("../models/comment")
const mongoose = require("mongoose");
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
            res.status(200).json("Post Saved");
            }
    }
    else{
        res.status(404);
    }
})

// this makes it so that you can get all posts either public/your friends or your own
module.exports.get = asyncHandler(async(req,res,next) => {
    const userId = req.params.userId;
    let friendsId = await User.findById(userId);
    friendsId = friendsId.friends_list;
    let allPosts = [];
    for(let i =0; i < friendsId.length; i ++){ 
        const friendsPost = await Post.find({author: friendsId[i]}).populate("author")
        .populate({
            path: "comments",
            populate: {
              path: "author", 
            },
            options: {
                sort: { date: 1 },
            }
          })
        allPosts = allPosts.concat(friendsPost);
    }
    // retrieving personal posts
    let posts = await Post.find({author: userId}).populate("author").populate({
        path: "comments",
        populate: {
          path: "author", 
        },
        options: {
            sort: { date: 1 },
        }
      });
    allPosts = allPosts.concat(posts);
    allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.status(200).json(allPosts);
})

// just user posts
module.exports.getSelfPosts = asyncHandler(async(req,res,next) => {
    const userId = req.params.userId;
    let friendsId = await User.findById(userId);
    friendsId = [];
    let allPosts = [];
    for(let i =0; i < friendsId.length; i ++){ 
        const friendsPost = await Post.find({author: friendsId[i]}).populate("author")
        .populate({
            path: "comments",
            populate: {
              path: "author", 
            },
            options: {
                sort: { date: 1 },
            }
          })
        allPosts = allPosts.concat(friendsPost);
    }
    // retrieving personal posts
    let posts = await Post.find({author: userId}).populate("author").populate({
        path: "comments",
        populate: {
          path: "author", 
        },
        options: {
            sort: { date: 1 },
        }
      });
    allPosts = allPosts.concat(posts);
    allPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    res.status(200).json(allPosts);
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
module.exports.getSingle = asyncHandler(async(req,res,next) => {
    const postId = req.params.postId;
    const findPost  = await Post.findById(postId);
    if(findPost){
        res.status(200).json(findPost);
    }
    else{ 
        res.status(404).json({message: "post not found"})
    }
})
module.exports.editPost = asyncHandler(async(req,res,next) => {
    const postId = req.body.id;
    const updatedText = req.body.text;
    const updatedPost= await Post.findByIdAndUpdate(postId, {text:updatedText, edited:true})
    if(updatedPost){
        res.status(200).json({message: "Post edited successfully"})
    }
    else{
        res.status(404)
    }
})
module.exports.deletePost = asyncHandler(async (req, res, next) => {
    const postId = req.body.id;    
    try {
      const findAndDeletePost = await Post.findByIdAndDelete(postId);
      const findAndDeleteComments = await Comment.deleteMany({ post: postId });
      
      if (findAndDeletePost) {
        if (findAndDeleteComments.deletedCount > 0) {
          res.status(200).json({ message: "Post and comments deleted" });
        } else {
          res.status(200).json({ message: "Post deleted" });
        }
      } else {
        res.status(404).json({ message: "Post not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  
  