function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  return res.status(401).json({ message: "Authentication required" });
}

function requireSelf(bodyField = "userId") {
  return (req, res, next) => {
    const requestedUserId = req.body[bodyField] || req.params[bodyField] || req.params.id;
    if (!requestedUserId || String(req.user._id) === String(requestedUserId)) {
      return next();
    }

    return res.status(403).json({ message: "You can only modify your own account" });
  };
}

module.exports = { ensureAuthenticated, requireSelf };
