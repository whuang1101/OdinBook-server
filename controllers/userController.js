const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/user");
const FriendRequest = require("../models/friendRequest");
const Post = require("../models/post");
const Comment = require("../models/comment");
const { getPublicApiUrl } = require("../config/env");
const { assertSelf, optionalString, requiredString } = require("../lib/http");
const { hasCloudinaryConfig, uploadBuffer } = require("../lib/cloudinary");

async function profileImageUrl(file) {
  if (file && hasCloudinaryConfig()) {
    const upload = await uploadBuffer(file.buffer);
    return upload.secure_url;
  }
  return `${getPublicApiUrl()}/uploads/anonymous.jpeg`;
}

module.exports.getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json(user);
});

module.exports.editBio = asyncHandler(async (req, res) => {
  assertSelf(req, req.body.id);
  const user = await User.findByIdAndUpdate(req.body.id, {
    bio: optionalString(req.body.bio, { max: 500 }),
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json({ message: "Bio updated" });
});

module.exports.editDetails = asyncHandler(async (req, res) => {
  assertSelf(req, req.body.id);
  const user = await User.findByIdAndUpdate(req.body.id, {
    lives: optionalString(req.body.lives, { max: 120 }),
    studies_at: optionalString(req.body.studies_at, { max: 160 }),
    job: optionalString(req.body.job, { max: 160 }),
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json({ message: "Details updated" });
});

module.exports.removeFriend = asyncHandler(async (req, res) => {
  const { selfId, friendId } = req.body;
  assertSelf(req, selfId, "You can only modify your own friends");

  const [user, friend] = await Promise.all([
    User.findByIdAndUpdate(selfId, { $pull: { friends_list: friendId } }),
    User.findByIdAndUpdate(friendId, { $pull: { friends_list: selfId } }),
    FriendRequest.findOneAndDelete({
      $or: [
        { sender: selfId, recipient: friendId },
        { sender: friendId, recipient: selfId },
      ],
    }),
  ]);
  if (!user || !friend) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json({ message: "friend removed" });
});

module.exports.postNewUser = asyncHandler(async (req, res) => {
  const firstName = requiredString(req.body.first_name, "First name", { max: 80 });
  const lastName = requiredString(req.body.last_name, "Last name", { max: 80 });
  const email = requiredString(req.body.email, "Email", { max: 254 }).toLowerCase();
  const password = requiredString(req.body.password, "Password", { max: 128 });
  const defaultFriendId = process.env.DEFAULT_FRIEND_ID;

  const user = await User.create({
    email,
    password: await bcrypt.hash(password, 10),
    name: `${firstName} ${lastName}`,
    comments: [],
    friends_list: defaultFriendId ? [new mongoose.Types.ObjectId(defaultFriendId)] : [],
    image_url: await profileImageUrl(req.file),
    posts: [],
    lives: optionalString(req.body.live, { max: 120 }),
    job: optionalString(req.body.job, { max: 160 }),
    studies_at: optionalString(req.body.studies, { max: 160 }),
    bio: "",
  });

  if (defaultFriendId) {
    await User.findByIdAndUpdate(defaultFriendId, { $addToSet: { friends_list: user._id } });
  }
  return res.status(200).json({ message: "User Saved" });
});

module.exports.getEmail = asyncHandler(async (req, res) => {
  const email = String(req.params.email || "").trim().toLowerCase();
  return res.status(200).json(Boolean(await User.exists({ email })));
});

module.exports.editName = asyncHandler(async (req, res) => {
  assertSelf(req, req.body.id, "You can only edit your own name");
  const user = await User.findByIdAndUpdate(req.body.id, {
    name: requiredString(req.body.name, "Name", { max: 160 }),
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json({ message: "Name updated successfully" });
});

module.exports.editProfileImage = asyncHandler(async (req, res) => {
  assertSelf(req, req.body.id, "You can only edit your own image");
  const user = await User.findByIdAndUpdate(req.body.id, {
    image_url: await profileImageUrl(req.file),
  });
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json({ message: "Image updated" });
});

module.exports.deleteUser = asyncHandler(async (req, res) => {
  const userId = req.body.id;
  assertSelf(req, userId, "You can only delete your own account");

  const user = await User.findById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const [comments, posts] = await Promise.all([
    Comment.find({ author: userId }).select("_id"),
    Post.find({ author: userId }).select("_id"),
  ]);
  const commentIds = comments.map(({ _id }) => _id);
  const postIds = posts.map(({ _id }) => _id);

  await Promise.all([
    User.findByIdAndDelete(userId),
    Post.deleteMany({ author: userId }),
    Comment.deleteMany({ $or: [{ author: userId }, { post: { $in: postIds } }] }),
    Post.updateMany({}, {
      $pull: {
        comments: { $in: commentIds },
        likes: userId,
      },
    }),
    FriendRequest.deleteMany({ $or: [{ sender: userId }, { recipient: userId }] }),
    User.updateMany({}, { $pull: { friends_list: userId } }),
  ]);

  await new Promise((resolve, reject) => req.logout((error) => error ? reject(error) : resolve()));
  return res.status(200).json("Everything deleted");
});

module.exports.profileImageUrl = profileImageUrl;
