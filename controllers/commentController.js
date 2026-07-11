const asyncHandler = require("express-async-handler");
const commentRepository = require("../repositories/commentRepository");
const postRepository = require("../repositories/postRepository");
const { assertSelf, requiredString } = require("../lib/http");

module.exports.addPost = asyncHandler(async (req, res) => {
  const { postId } = req.body;
  const userId = req.body.userId || req.user._id;
  assertSelf(req, userId, "You can only comment as yourself");
  if (!await postRepository.findRawById(postId)) {
    return res.status(404).json({ message: "Post not found" });
  }
  const parentCommentId = req.body.parentCommentId || null;
  if (parentCommentId) {
    const parent = await commentRepository.findById(parentCommentId);
    if (!parent || parent.post !== String(postId)) {
      return res.status(400).json({ message: "Reply parent must belong to this post" });
    }
  }
  const comment = await commentRepository.create({
    postId,
    authorId: userId,
    text: requiredString(req.body.text, "Comment", { max: 2000 }),
    parentCommentId,
  });
  return res.status(201).json({ message: "Comment created", comment });
});

module.exports.getComment = asyncHandler(async (req, res) => {
  const comment = await commentRepository.findById(req.params.id);
  return comment ? res.status(200).json(comment) : res.status(404).json({ message: "Message not found" });
});

module.exports.editComment = asyncHandler(async (req, res) => {
  const comment = await commentRepository.findById(req.body.id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });
  assertSelf(req, comment.author, "You can only edit your own comments");
  await commentRepository.update(comment._id, requiredString(req.body.text, "Comment", { max: 2000 }));
  return res.status(200).json({ message: "Message updated successfully" });
});

module.exports.deleteComment = asyncHandler(async (req, res) => {
  const comment = await commentRepository.findById(req.body.id);
  if (!comment) return res.status(404).json({ message: "Comment not found" });
  assertSelf(req, comment.author, "You can only delete your own comments");
  await commentRepository.remove(comment._id);
  return res.status(200).json({ message: "Comment Deleted" });
});
