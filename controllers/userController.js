import mongoose from "mongoose";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("name email phone role image createdAt").sort({ createdAt: -1 }).limit(500).lean();
  res.json({ users: users.map((u) => ({ ...u, id: String(u._id) })) });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const role = req.body?.role;
  if (!["user", "admin"].includes(role)) throw new ApiError(400, "role must be 'user' or 'admin'");
  if (String(req.params.id) === req.user.id && role !== "admin") throw new ApiError(400, "You cannot remove your own admin role");
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("name email role");
  if (!user) throw new ApiError(404, "User not found");
  res.json({ user });
});

export const deleteUser = asyncHandler(async (req, res) => {
  if (String(req.params.id) === req.user.id) throw new ApiError(400, "You cannot delete your own account");
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, "User not found");
  const db = mongoose.connection.db;
  await Promise.all([db.collection("session").deleteMany({ userId: user._id }), db.collection("account").deleteMany({ userId: user._id })]);
  res.json({ message: "User deleted" });
});
