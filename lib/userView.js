function userView(user) {
  if (!user) {
    return user;
  }

  const value = typeof user.toObject === "function" ? user.toObject() : { ...user };
  delete value.password;
  delete value.facebookId;
  return value;
}

module.exports = { userView };
