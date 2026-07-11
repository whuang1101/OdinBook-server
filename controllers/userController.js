const asyncHandler = require("express-async-handler");
const bcrypt = require("bcryptjs");
const userRepository = require("../repositories/userRepository");
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
  const user = await userRepository.findById(req.params.id);
  return user ? res.status(200).json(user) : res.status(404).json({ message: "User not found" });
});

module.exports.editBio = asyncHandler(async (req, res) => {
  assertSelf(req, req.body.id);
  const user = await userRepository.update(req.body.id, { bio: optionalString(req.body.bio, { max: 500 }) });
  return user ? res.status(200).json({ message: "Bio updated" }) : res.status(404).json({ message: "User not found" });
});

module.exports.editDetails = asyncHandler(async (req, res) => {
  assertSelf(req, req.body.id);
  const user = await userRepository.update(req.body.id, {
    lives: optionalString(req.body.lives, { max: 120 }),
    studies_at: optionalString(req.body.studies_at, { max: 160 }),
    job: optionalString(req.body.job, { max: 160 }),
  });
  return user ? res.status(200).json({ message: "Details updated" }) : res.status(404).json({ message: "User not found" });
});

module.exports.removeFriend = asyncHandler(async (req, res) => {
  const { selfId, friendId } = req.body;
  assertSelf(req, selfId, "You can only modify your own friends");
  const removed = await userRepository.removeFriend(selfId, friendId);
  return removed ? res.status(200).json({ message: "friend removed" }) : res.status(404).json({ message: "Friendship not found" });
});

module.exports.postNewUser = asyncHandler(async (req, res) => {
  const firstName = requiredString(req.body.first_name, "First name", { max: 80 });
  const lastName = requiredString(req.body.last_name, "Last name", { max: 80 });
  const email = requiredString(req.body.email, "Email", { max: 254 }).toLowerCase();
  const password = requiredString(req.body.password, "Password", { max: 128 });
  const user = await userRepository.create({
    email,
    password_hash: await bcrypt.hash(password, 10),
    name: `${firstName} ${lastName}`,
    image_url: await profileImageUrl(req.file),
    lives: optionalString(req.body.live, { max: 120 }),
    job: optionalString(req.body.job, { max: 160 }),
    studies_at: optionalString(req.body.studies, { max: 160 }),
    bio: "",
  });
  if (process.env.DEFAULT_FRIEND_ID && await userRepository.findById(process.env.DEFAULT_FRIEND_ID)) {
    await userRepository.addFriend(user._id, process.env.DEFAULT_FRIEND_ID);
  }
  return res.status(200).json({ message: "User Saved" });
});

module.exports.getEmail = asyncHandler(async (req, res) => {
  return res.status(200).json(await userRepository.existsByEmail(String(req.params.email || "").trim().toLowerCase()));
});

module.exports.editName = asyncHandler(async (req, res) => {
  assertSelf(req, req.body.id, "You can only edit your own name");
  const user = await userRepository.update(req.body.id, { name: requiredString(req.body.name, "Name", { max: 160 }) });
  return user ? res.status(200).json({ message: "Name updated successfully" }) : res.status(404).json({ message: "User not found" });
});

module.exports.editProfileImage = asyncHandler(async (req, res) => {
  assertSelf(req, req.body.id, "You can only edit your own image");
  const user = await userRepository.update(req.body.id, { image_url: await profileImageUrl(req.file) });
  return user ? res.status(200).json({ message: "Image updated" }) : res.status(404).json({ message: "User not found" });
});

module.exports.deleteUser = asyncHandler(async (req, res) => {
  assertSelf(req, req.body.id, "You can only delete your own account");
  if (!await userRepository.deleteUser(req.body.id)) return res.status(404).json({ message: "User not found" });
  await new Promise((resolve, reject) => req.logout((error) => error ? reject(error) : resolve()));
  return res.status(200).json("Everything deleted");
});

module.exports.profileImageUrl = profileImageUrl;
