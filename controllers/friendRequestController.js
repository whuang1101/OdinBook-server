const asyncHandler = require("express-async-handler");
const friendRepository = require("../repositories/friendRepository");
const userRepository = require("../repositories/userRepository");
const { assertSelf, HttpError } = require("../lib/http");

module.exports.getSuggestions = asyncHandler(async (req, res) => {
  assertSelf(req, req.params.userId, "You can only view your own suggestions");
  if (!await userRepository.findById(req.params.userId)) return res.status(404).json({ message: "User not found" });
  return res.status(200).json(await friendRepository.listSuggestions(req.params.userId));
});

module.exports.addFriend = asyncHandler(async (req, res) => {
  const { senderId, recipientId } = req.body;
  assertSelf(req, senderId, "You can only send requests as yourself");
  if (String(senderId) === String(recipientId)) throw new HttpError(400, "Cannot friend yourself");
  if (!await userRepository.findById(recipientId)) return res.status(404).json({ message: "Recipient not found" });
  if (await friendRepository.findBetween(senderId, recipientId)) return res.status(200).json({ message: "Friend request already exists" });
  await friendRepository.create(senderId, recipientId);
  return res.status(200).json({ message: "Friend request saved successfully" });
});

module.exports.removeRequest = asyncHandler(async (req, res) => {
  const { senderId, recipientId } = req.body;
  if (![String(senderId), String(recipientId)].includes(String(req.user._id))) {
    throw new HttpError(403, "You can only remove your own friend requests");
  }
  const removed = await friendRepository.removeBetween(senderId, recipientId);
  return removed ? res.status(200).json("Deleted") : res.status(404).json("Request not found");
});

module.exports.cancelFriendRequest = asyncHandler(async (req, res) => {
  const request = await friendRepository.findById(req.body.recipientId);
  if (!request) return res.status(404).json({ message: "Request not found" });
  assertSelf(req, request.sender_id, "You can only cancel your own requests");
  await friendRepository.remove(request.id);
  return res.status(200).json({ message: "Request cancelled" });
});

module.exports.getPending = asyncHandler(async (req, res) => {
  assertSelf(req, req.params.id, "You can only view your own pending requests");
  return res.status(200).json(await friendRepository.listForUser(req.params.id, "outgoing"));
});

module.exports.getRequests = asyncHandler(async (req, res) => {
  assertSelf(req, req.params.id, "You can only view your own requests");
  return res.status(200).json(await friendRepository.listForUser(req.params.id, "incoming"));
});

module.exports.acceptRequest = asyncHandler(async (req, res) => {
  const request = await friendRepository.findById(req.body.id);
  if (!request) return res.status(404).json("Request not found");
  assertSelf(req, request.recipient_id, "You can only accept requests sent to you");
  await friendRepository.accept(request.id);
  return res.status(200).json("Friend Added");
});

module.exports.getAllFriends = asyncHandler(async (req, res) => {
  if (!await userRepository.findById(req.params.id)) return res.status(404).json({ message: "User not found" });
  return res.status(200).json(await friendRepository.listFriends(req.params.id));
});
