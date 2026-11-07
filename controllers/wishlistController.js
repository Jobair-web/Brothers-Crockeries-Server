import mongoose from "mongoose";
import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { withDiscount } from "./productController.js";

async function load(userId) {
  const wl = await Wishlist.findOne({ user: userId })
    .populate({ path: "products", populate: { path: "category", select: "name slug" } })
    .lean();
  return (wl?.products ?? []).filter(Boolean).map(withDiscount);
}

export const getWishlist = asyncHandler(async (req, res) => {
  res.json({ products: await load(req.user.id) });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  await Wishlist.updateOne({ user: req.user.id }, { $addToSet: { products: req.params.productId } }, { upsert: true });
  res.status(201).json({ products: await load(req.user.id) });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  await Wishlist.updateOne({ user: req.user.id }, { $pull: { products: req.params.productId } });
  res.json({ products: await load(req.user.id) });
});

/** POST /api/wishlist/merge { productIds: [] } – used right after sign-in to merge the guest list. */
export const mergeWishlist = asyncHandler(async (req, res) => {
  const ids = (Array.isArray(req.body?.productIds) ? req.body.productIds : []).filter((id) => mongoose.isValidObjectId(id));
  if (ids.length) {
    const existing = await Product.find({ _id: { $in: ids } }).select("_id").lean();
    await Wishlist.updateOne(
      { user: req.user.id },
      { $addToSet: { products: { $each: existing.map((p) => p._id) } } },
      { upsert: true }
    );
  }
  res.json({ products: await load(req.user.id) });
});
