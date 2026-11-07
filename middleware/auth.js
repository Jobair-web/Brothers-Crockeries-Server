import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const adminEmails = () =>
  (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

/**
 * Better Auth (running in the Next.js app) stores sessions in the shared MongoDB.
 * The client sends the session token as `Authorization: Bearer <token>`;
 * we look it up in the `session` collection and load the `user`.
 */
async function resolveUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  const db = mongoose.connection.db;
  const session = await db.collection("session").findOne({ token });
  if (!session || new Date(session.expiresAt) < new Date()) return null;

  const idFilters = [{ _id: session.userId }];
  if (mongoose.isValidObjectId(String(session.userId))) {
    idFilters.push({ _id: new mongoose.Types.ObjectId(String(session.userId)) });
  }
  const user = await db.collection("user").findOne({ $or: idFilters });
  if (!user) return null;

  const email = (user.email || "").toLowerCase();
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role === "admin" || adminEmails().includes(email) ? "admin" : "user",
  };
}

/** Attach req.user when a valid token is present; never rejects. */
export async function optionalAuth(req, res, next) {
  try {
    req.user = await resolveUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(req, res, next) {
  try {
    req.user = await resolveUser(req);
    if (!req.user) throw new ApiError(401, "Please sign in to continue");
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAdmin(req, res, next) {
  try {
    req.user = await resolveUser(req);
    if (!req.user) throw new ApiError(401, "Please sign in to continue");
    if (req.user.role !== "admin") throw new ApiError(403, "Admin access required");
    next();
  } catch (err) {
    next(err);
  }
}
