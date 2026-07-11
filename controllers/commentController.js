const asyncHandler = require("express-async-handler");
const Comment = require("../models/comment");
const Post = require("../models/post");
const User = require("../models/user");
const { assertSelf, requiredString } = require("../lib/http");

module.exports.addPost = asyncHandler(async (req, res) => {
  const { postId } = req.body;
  const userId = req.body.userId || req.user._id;
  assertSelf(req, userId, "You can only comment as yourself");

  const post = await Post.findById(postId);
  if (!post) {
    return res.status(404).json({ message: "Post not found" });
  }

  const comment = await Comment.create({
    date: new Date(),
    text: requiredString(req.body.text, "Comment", { max: 2000 }),
    comments: [],
    author: userId,
    post: post._id,
  });

  await Promise.all([
    User.findByIdAndUpdate(userId, { $addToSet: { comments: comment._id } }),
    Post.findByIdAndUpdate(postId, { $addToSet: { comments: comment._id } }),
  ]);

  return res.status(200).json({ message: "message saved and added to Post" });
});

module.exports.getComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.params.id);
  if (!comment) {
    return res.status(404).json({ message: "Message not found" });
  }
  return res.status(200).json(comment);
});

module.exports.editComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.body.id);
  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }
  assertSelf(req, comment.author, "You can only edit your own comments");

  comment.text = requiredString(req.body.text, "Comment", { max: 2000 });
  comment.edited = true;
  await comment.save();
  return res.status(200).json({ message: "Message updated successfully" });
});

module.exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await Comment.findById(req.body.id);
  if (!comment) {
    return res.status(404).json({ message: "Comment not found" });
  }
  assertSelf(req, comment.author, "You can only delete your own comments");

  await Promise.all([
    Comment.findByIdAndDelete(comment._id),
    User.findByIdAndUpdate(comment.author, { $pull: { comments: comment._id } }),
    Post.findByIdAndUpdate(comment.post, { $pull: { comments: comment._id } }),
  ]);
  return res.status(200).json({ message: "Comment Deleted" });
});
