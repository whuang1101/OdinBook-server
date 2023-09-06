 const asyncHandler = require("express-async-handler");
 const User = require("../models/user");
 const Post = require("../models/post")
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
            console.log("post saved and added to user posts")
            }
    }
})

// this makes it so that you can get all posts either public/your friends or your own
module.exports.get = asyncHandler(async(req,res,next) => {
    const userId = req.params.userId;
    const findUser = await User.findById(userId)
        .populate({
            path: 'posts',
            populate: {
                path: 'author',
                model: 'Users' 
            }
        });

    let posts = [];
    if(findUser){
        posts = posts.concat(findUser.posts);
    }
    res.status(200).json(posts);
})