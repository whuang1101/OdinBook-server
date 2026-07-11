class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

function requiredString(value, field, options = {}) {
  const { max = 2000 } = options;
  const normalized = typeof value === "string" ? value.trim() : "";

  if (!normalized) {
    throw new HttpError(400, `${field} is required`);
  }
  if (normalized.length > max) {
    throw new HttpError(400, `${field} must be ${max} characters or fewer`);
  }

  return normalized;
}

function optionalString(value, options = {}) {
  const { max = 500 } = options;
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length > max) {
    throw new HttpError(400, `Value must be ${max} characters or fewer`);
  }
  return normalized;
}

function assertSelf(req, requestedUserId, message = "You can only modify your own account") {
  if (!requestedUserId || String(req.user._id) !== String(requestedUserId)) {
    throw new HttpError(403, message);
  }
}

module.exports = { HttpError, assertSelf, optionalString, requiredString };
