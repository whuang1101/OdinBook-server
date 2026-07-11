function notFound(req, res) {
  res.status(404).json({ message: "Route not found" });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = err.status || err.statusCode || 500;
  let message = err.message || "Internal server error";

  if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  } else if (err.name === "CastError") {
    status = 400;
    message = "Invalid resource identifier";
  } else if (err.code === 11000) {
    status = 409;
    message = "A user with that email already exists";
  } else if (err.name === "MulterError") {
    status = 400;
  }

  if (status >= 500) {
    console.error(err);
    message = "Internal server error";
  }

  const response = { message };
  if (err.details) {
    response.details = err.details;
  }
  return res.status(status).json(response);
}

module.exports = { errorHandler, notFound };
