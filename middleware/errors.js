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
  } else if (err.code === "22P02") {
    status = 400;
    message = "Invalid resource identifier";
  } else if (err.code === "23505") {
    status = 409;
    message = "A user with that email already exists";
  } else if (["23503", "23514"].includes(err.code)) {
    status = 400;
    message = "Request violates a data constraint";
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
