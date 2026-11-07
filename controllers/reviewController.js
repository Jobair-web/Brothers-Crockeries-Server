import { z } from "zod";
import Review from "../models/Review.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const reviewSchema = z.object({
  name: z.string().trim().min(2).max(80),
  location: z.string().trim().max(80).optional().default(""),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().min(5).max(600),
});

export const listReviews = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 12, 50);
  const reviews = await Review.find({ isApproved: true }).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ reviews });
});

export const listAllReviews = asyncHandler(async (req, res) => {
  res.json({ reviews: await Review.find().sort({ createdAt: -1 }).lean() });
});

export const createReview = asyncHandler(async (req, res) => {
  const data = reviewSchema.parse(req.body);
  const isAdmin = req.user.role === "admin";
  const review = await Review.create({ ...data, user: req.user.id, isApproved: isAdmin });
  res.status(201).json({ review, message: isAdmin ? "Review published" : "Thanks! Your review will appear after approval." });
});

export const setReviewApproval = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { isApproved: Boolean(req.body?.isApproved) }, { new: true });
  if (!review) throw new ApiError(404, "Review not found");
  res.json({ review });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw new ApiError(404, "Review not found");
  res.json({ message: "Review deleted" });
});
