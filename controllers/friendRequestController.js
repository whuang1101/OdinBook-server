const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");
const User = require("../models/user");
const FriendRequest = require("../models/friendRequest");
const { assertSelf, HttpError } = require("../lib/http");

module.exports.getSuggestions = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  assertSelf(req, userId, "You can only view your own suggestions");

  const user = await User.findById(userId).select("friends_list");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const requests = await FriendRequest.find({
    $or: [{ sender: userId }, { recipient: userId }],
  }).select("sender recipient");
  const excludedIds = new Set([String(userId), ...user.friends_list.map(String)]);
  requests.forEach(({ sender, recipient }) => {
    excludedIds.add(String(sender));
    excludedIds.add(String(recipient));
  });

  const suggestions = await User.find({
    _id: { $nin: Array.from(excludedIds, (id) => new mongoose.Types.ObjectId(id)) },
  }).limit(50);
  return res.status(200).json(suggestions);
});

module.exports.addFriend = asyncHandler(async (req, res) => {
  const { senderId, recipientId } = req.body;
  assertSelf(req, senderId, "You can only send requests as yourself");
  if (String(senderId) === String(recipientId)) {
    throw new HttpError(400, "Cannot friend yourself");
  }

  const recipient = await User.exists({ _id: recipientId });
  if (!recipient) {
    return res.status(404).json({ message: "Recipient not found" });
  }

  const existing = await FriendRequest.findOne({
    $or: [
      { sender: senderId, recipient: recipientId },
      { sender: recipientId, recipient: senderId },
    ],
  });
  if (existing) {
    return res.status(200).json({ message: "Friend request already exists" });
  }

  await FriendRequest.create({
    date: new Date(),
    sender: senderId,
    recipient: recipientId,
    status: 2,
  });
  return res.status(200).json({ message: "Friend request saved successfully" });
});

module.exports.removeRequest = asyncHandler(async (req, res) => {
  const { senderId, recipientId } = req.body;
  const currentUserId = String(req.user._id);
  if (![String(senderId), String(recipientId)].includes(currentUserId)) {
    throw new HttpError(403, "You can only remove your own friend requests");
  }

  const request = await FriendRequest.findOneAndDelete({
    $or: [
      { sender: senderId, recipient: recipientId },
      { sender: recipientId, recipient: senderId },
    ],
  });
  if (!request) {
    return res.status(404).json("Request not found");
  }
  return res.status(200).json("Deleted");
});

module.exports.cancelFriendRequest = asyncHandler(async (req, res) => {
  const request = await FriendRequest.findById(req.body.recipientId);
  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }
  assertSelf(req, request.sender, "You can only cancel your own requests");
  await request.deleteOne();
  return res.status(200).json({ message: "Request cancelled" });
});

module.exports.getPending = asyncHandler(async (req, res) => {
  assertSelf(req, req.params.id, "You can only view your own pending requests");
  const requests = await FriendRequest.find({ sender: req.params.id, status: 2 }).populate("recipient");
  return res.status(200).json(requests);
});

module.exports.getRequests = asyncHandler(async (req, res) => {
  assertSelf(req, req.params.id, "You can only view your own requests");
  const requests = await FriendRequest.find({ recipient: req.params.id, status: 2 }).populate("sender");
  return res.status(200).json(requests);
});

module.exports.acceptRequest = asyncHandler(async (req, res) => {
  const request = await FriendRequest.findById(req.body.id);
  if (!request) {
    return res.status(404).json("Request not found");
  }
  assertSelf(req, request.recipient, "You can only accept requests sent to you");

  request.status = 1;
  await Promise.all([
    request.save(),
    User.findByIdAndUpdate(request.sender, { $addToSet: { friends_list: request.recipient } }),
    User.findByIdAndUpdate(request.recipient, { $addToSet: { friends_list: request.sender } }),
  ]);
  return res.status(200).json("Friend Added");
});

module.exports.getAllFriends = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).populate("friends_list");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  return res.status(200).json(user.friends_list);
});
