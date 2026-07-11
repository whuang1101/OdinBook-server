const asyncHandler = require("express-async-handler");
const postRepository = require("../repositories/postRepository");
const userRepository = require("../repositories/userRepository");
const { assertSelf, requiredString } = require("../lib/http");

function pagination(req) {
  const requestedLimit = Number.parseInt(req.query.limit, 10);
  const requestedPage = Number.parseInt(req.query.page, 10);
  const limit = Math.min(Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : 25, 100);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return { limit, skip: (page - 1) * limit };
}

module.exports.post = asyncHandler(async (req, res) => {
  const userId = req.body.userId || req.user._id;
  assertSelf(req, userId, "You can only post as yourself");
  if (!await userRepository.findById(userId)) return res.status(404).json({ message: "User not found" });
  await postRepository.create(userId, requiredString(req.body.content, "Post", { max: 5000 }));
  return res.status(200).json("Post Saved");
});

module.exports.get = asyncHandler(async (req, res) => {
  assertSelf(req, req.params.userId, "You can only read your own feed");
  if (!await userRepository.findById(req.params.userId)) return res.status(404).json({ message: "User not found" });
  return res.status(200).json(await postRepository.listFeed(req.params.userId, pagination(req)));
});

module.exports.getSelfPosts = asyncHandler(async (req, res) => {
  return res.status(200).json(await postRepository.listByAuthor(req.params.userId, pagination(req)));
});

async function updateLike(req, res, liked) {
  const userId = req.body.userId || req.user._id;
  assertSelf(req, userId, "You can only update your own likes");
  if (!await postRepository.findRawById(req.body.postId)) return res.status(404).json({ message: "Post not found" });
  await postRepository.setLike(req.body.postId, userId, liked);
  return res.status(200).json({ message: liked ? "Like added" : "Like removed" });
}

module.exports.addLike = asyncHandler((req, res) => updateLike(req, res, true));
module.exports.removeLike = asyncHandler((req, res) => updateLike(req, res, false));

module.exports.getSingle = asyncHandler(async (req, res) => {
  const post = await postRepository.findById(req.params.postId);
  return post ? res.status(200).json(post) : res.status(404).json({ message: "Post not found" });
});

module.exports.editPost = asyncHandler(async (req, res) => {
  const post = await postRepository.findRawById(req.body.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  assertSelf(req, post.author_id, "You can only edit your own posts");
  await postRepository.update(post.id, requiredString(req.body.text, "Post", { max: 5000 }));
  return res.status(200).json({ message: "Post edited successfully" });
});

module.exports.deletePost = asyncHandler(async (req, res) => {
  const post = await postRepository.findRawById(req.body.id);
  if (!post) return res.status(404).json({ message: "Post not found" });
  assertSelf(req, post.author_id, "You can only delete your own posts");
  await postRepository.remove(post.id);
  return res.status(200).json({ message: "Post and comments deleted" });
});

module.exports.pagination = pagination;
