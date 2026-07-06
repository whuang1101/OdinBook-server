 const asyncHandler = require("express-async-handler");
 const User = require("../models/user");
 const Post = require("../models/post");
const Comment = require("../models/comment")

function pagination(req) {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    const page = Math.max(Number(req.query.page) || 1, 1);
    return { limit, skip: (page - 1) * limit };
}

function postPopulate(query) {
    return query.populate("author")
        .populate({
            path: "comments",
            populate: { path: "author" },
            options: { sort: { date: 1 } },
        });
}

 //this allows post to be made
 module.exports.post = asyncHandler(async(req,res,next) => {
    const userId = req.body.userId || req.user._id;
    if (String(req.user._id) !== String(userId)) {
        return res.status(403).json({ message: "You can only post as yourself" });
    }

    const findUser = await User.findById(userId);
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
            await User.findByIdAndUpdate(
                findUser._id, 
                { $addToSet: { posts: save._id }
            })
            res.status(200).json("Post Saved");
            }
    }
    else{
        res.status(404).json({ message: "User not found" });
    }
})

// this makes it so that you can get all posts either public/your friends or your own
module.exports.get = asyncHandler(async(req,res,next) => {
    const userId = req.params.userId;
    if (String(req.user._id) !== String(userId)) {
        return res.status(403).json({ message: "You can only read your own feed" });
    }

    const user = await User.findById(userId).select("friends_list");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    const { limit, skip } = pagination(req);
    const authors = [user._id, ...user.friends_list];
    const posts = await postPopulate(
        Post.find({ author: { $in: authors } })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
    );

    res.status(200).json(posts);
})

// just user posts
module.exports.getSelfPosts = asyncHandler(async(req,res,next) => {
    const userId = req.params.userId;
    const { limit, skip } = pagination(req);
    const posts = await postPopulate(
        Post.find({author: userId})
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
    );
    res.status(200).json(posts);
})

// adds a like to a post
module.exports.addLike = asyncHandler(async(req,res,next) => {
    const postId = req.body.postId;
    const userId = req.body.userId || req.user._id;

    const findPost = await Post.findByIdAndUpdate(postId, {$addToSet:{likes:userId}})
    if(findPost){
        res.status(200).json({ message: "Like added" })
    } else {
        res.status(404).json({ message: "Post not found" })
    }
})
module.exports.removeLike = asyncHandler(async(req,res,next) => {
    const postId = req.body.postId;
    const userId = req.body.userId || req.user._id;
    const findPost = await Post.findByIdAndUpdate(postId, {$pull:{likes:userId}})
    if(findPost){
        res.status(200).json({ message: "Like removed" })
    } else {
        res.status(404).json({ message: "Post not found" })
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
    const existingPost = await Post.findById(postId);
    if (!existingPost) {
        return res.status(404).json({ message: "Post not found" });
    }
    if (String(existingPost.author) !== String(req.user._id)) {
        return res.status(403).json({ message: "You can only edit your own posts" });
    }

    const updatedPost= await Post.findByIdAndUpdate(postId, {text:updatedText, edited:true})
    if(updatedPost){
        res.status(200).json({message: "Post edited successfully"})
    }
    else{
        res.status(404).json({ message: "Post not found" })
    }
})
module.exports.deletePost = asyncHandler(async (req, res, next) => {
    const postId = req.body.id;    
    try {
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }
      if (String(post.author) !== String(req.user._id)) {
        return res.status(403).json({ message: "You can only delete your own posts" });
      }

      const findAndDeletePost = await Post.findByIdAndDelete(postId);
      const findAndDeleteComments = await Comment.deleteMany({ post: postId });
      await User.findByIdAndUpdate(post.author, { $pull: { posts: postId } });
      
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
  
  
