const asyncHandler = require("express-async-handler");
const User = require("../models/user");
const Post = require("../models/post");
const Comment = require("../models/comment");
const { assertSelf, requiredString } = require("../lib/http");

function pagination(req) {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedPage = Number.parseInt(req.query.page, 10);
  const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 25, 100);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { limit, skip: (page - 1) * limit };
}

function populatePost(query) {
  return query
    .populate("author")
    .populate({
      path: "comments",
      populate: { path: "author" },
      options: { sort: { date: 1 } },
    });
}

module.exports.post = asyncHandler(async (req, res) => {
  const userId = req.body.userId || req.user._id;
  assertSelf(req, userId, "You can only post as yourself");

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const post = await Post.create({
    date: new Date(),
    text: requiredString(req.body.content, "Post", { max: 5000 }),
    likes: [],
    comments: [],
    author: user._id,
  });
  await User.findByIdAndUpdate(user._id, { $addToSet: { posts: post._id } });
  return res.status(200).json("Post Saved");
});

module.exports.get = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  assertSelf(req, userId, "You can only read your own feed");

  const user = await User.findById(userId).select("friends_list");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const { limit, skip } = pagination(req);
  const posts = await populatePost(
    Post.find({ author: { $in: [user._id, ...user.friends_list] } })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
  );
  return res.status(200).json(posts);
});

module.exports.getSelfPosts = asyncHandler(async (req, res) => {
  const { limit, skip } = pagination(req);
  const posts = await populatePost(
    Post.find({ author: req.params.userId })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
  );
  return res.status(200).json(posts);
});

async function updateLike(req, res, operation, message) {
  const userId = req.body.userId || req.user._id;
  assertSelf(req, userId, "You can only update your own likes");
  const post = await Post.findByIdAndUpdate(req.body.postId, { [operation]: { likes: userId } });
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }
  return res.status(200).json({ message });
}

module.exports.addLike = asyncHandler((req, res) => updateLike(req, res, "$addToSet", "Like added"));
module.exports.removeLike = asyncHandler((req, res) => updateLike(req, res, "$pull", "Like removed"));

module.exports.getSingle = asyncHandler(async (req, res) => {
  const post = await populatePost(Post.findById(req.params.postId));
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }
  return res.status(200).json(post);
});

module.exports.editPost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.body.id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }
  assertSelf(req, post.author, "You can only edit your own posts");

  post.text = requiredString(req.body.text, "Post", { max: 5000 });
  post.edited = true;
  await post.save();
  return res.status(200).json({ message: "Post edited successfully" });
});

module.exports.deletePost = asyncHandler(async (req, res) => {
  const post = await Post.findById(req.body.id);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }
  assertSelf(req, post.author, "You can only delete your own posts");

  const comments = await Comment.find({ post: post._id }).select("_id author");
  const commentIds = comments.map((comment) => comment._id);
  await Promise.all([
    Post.findByIdAndDelete(post._id),
    Comment.deleteMany({ post: post._id }),
    User.findByIdAndUpdate(post.author, { $pull: { posts: post._id } }),
    User.updateMany({}, { $pull: { comments: { $in: commentIds } } }),
  ]);
  return res.status(200).json({ message: commentIds.length ? "Post and comments deleted" : "Post deleted" });
});

module.exports.pagination = pagination;
