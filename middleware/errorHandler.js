import { ZodError } from "zod";
import multer from "multer";

export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.status || 500;
  let message = err.message || "Internal server error";
  let details = err.details;

  if (err instanceof ZodError) {
    status = 400;
    message = "Validation failed";
    details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (err.name === "ValidationError") {
    status = 400;
    details = Object.values(err.errors || {}).map((e) => ({ path: e.path, message: e.message }));
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = `Duplicate value for ${Object.keys(err.keyValue || {}).join(", ") || "unique field"}`;
  } else if (err instanceof multer.MulterError) {
    status = 400;
  }

  if (status >= 500) console.error(err);
  res.status(status).json({ success: false, message, ...(details ? { details } : {}) });
}
