import { z } from "zod";
import Category from "../models/Category.js";
import Product from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";

const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().optional(),
  icon: z.string().trim().max(40).optional(),
  image: z.string().trim().optional(),
  isFeatured: z.coerce.boolean().optional(),
  order: z.coerce.number().int().optional(),
});

export const listCategories = asyncHandler(async (req, res) => {
  const [categories, counts] = await Promise.all([
    Category.find().sort({ order: 1, name: 1 }).lean(),
    Product.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]),
  ]);
  const map = new Map(counts.map((c) => [String(c._id), c.count]));
  res.json({ categories: categories.map((c) => ({ ...c, productCount: map.get(String(c._id)) ?? 0 })) });
});

export const createCategory = asyncHandler(async (req, res) => {
  const data = categorySchema.parse(req.body);
  if (data.slug) data.slug = slugify(data.slug);
  else delete data.slug;
  const category = await Category.create(data);
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const data = categorySchema.partial().parse(req.body);
  if (data.slug) data.slug = slugify(data.slug);
  const category = await Category.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
  if (!category) throw new ApiError(404, "Category not found");
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const used = await Product.countDocuments({ category: req.params.id });
  if (used > 0) throw new ApiError(409, `Cannot delete: ${used} product(s) still use this category`);
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) throw new ApiError(404, "Category not found");
  res.json({ message: "Category deleted" });
});
